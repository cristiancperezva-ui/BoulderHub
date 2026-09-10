// Wrapper de inferencia SlimSAM (ONNX) — ver scripts/spike/run-spike.mjs para el spike original.
// Encoder pesado corre 1 vez por foto (embeddings cacheados); decoder liviano corre 1 vez por tap.
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ort = require('onnxruntime-node');

const TARGET = 1024;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const MODELS_DIR = path.join(__dirname, '..', 'models');

let encoderSession = null;
let decoderSession = null;
// image_positional_embeddings solo depende del tamaño (1024x1024, siempre igual), no de la foto:
// se precalculó una vez (ver scripts/spike) y se reusa para toda foto, así el cache de embeddings
// por foto solo necesita guardar image_embeddings (la mitad del peso).
let positionalEmbeddings = null;

async function getSessions() {
  if (!encoderSession) {
    encoderSession = await ort.InferenceSession.create(path.join(MODELS_DIR, 'vision_encoder.onnx'));
  }
  if (!decoderSession) {
    decoderSession = await ort.InferenceSession.create(path.join(MODELS_DIR, 'prompt_encoder_mask_decoder.onnx'));
  }
  if (!positionalEmbeddings) {
    const buf = fs.readFileSync(path.join(MODELS_DIR, 'image_positional_embeddings.bin'));
    const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    positionalEmbeddings = new ort.Tensor('float32', data, [1, 256, 64, 64]);
  }
  return { encoderSession, decoderSession, positionalEmbeddings };
}

async function preprocessImage(buffer) {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const { width: w, height: h } = meta;
  const scale = TARGET / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const { data } = await img
    .resize(newW, newH)
    .extend({ top: 0, left: 0, bottom: TARGET - newH, right: TARGET - newW, background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const chw = new Float32Array(3 * TARGET * TARGET);
  const plane = TARGET * TARGET;
  for (let i = 0; i < plane; i++) {
    const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
    chw[i] = (r - MEAN[0]) / STD[0];
    chw[plane + i] = (g - MEAN[1]) / STD[1];
    chw[plane * 2 + i] = (b - MEAN[2]) / STD[2];
  }
  return { chw, origW: w, origH: h, newW, newH, scale };
}

/** Corre el encoder pesado 1 vez. Devuelve el tensor de embeddings + metadata para reescalar puntos/máscaras. */
async function computeEmbedding(imageBuffer) {
  const { encoderSession } = await getSessions();
  const { chw, origW, origH, newW, newH, scale } = await preprocessImage(imageBuffer);
  const pixelValues = new ort.Tensor('float32', chw, [1, 3, TARGET, TARGET]);
  const encOut = await encoderSession.run({ pixel_values: pixelValues });
  return {
    imageEmbeddings: encOut.image_embeddings,
    origW,
    origH,
    newW,
    newH,
    scale,
  };
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/** Sube la máscara de baja resolución (lowSize×lowSize) a una máscara binaria en coords de la imagen original. */
function upscaleMask(maskLowRes, lowSize, newW, newH, origW, origH) {
  const scaleUp = TARGET / lowSize;
  const full = new Float32Array(TARGET * TARGET);
  for (let y = 0; y < TARGET; y++) {
    const sy = Math.min(lowSize - 1, Math.floor(y / scaleUp));
    for (let x = 0; x < TARGET; x++) {
      const sx = Math.min(lowSize - 1, Math.floor(x / scaleUp));
      full[y * TARGET + x] = maskLowRes[sy * lowSize + sx];
    }
  }
  const out = new Uint8Array(origW * origH);
  const sx2 = newW / origW, sy2 = newH / origH;
  for (let y = 0; y < origH; y++) {
    const py = Math.min(newH - 1, Math.floor(y * sy2));
    for (let x = 0; x < origW; x++) {
      const px = Math.min(newW - 1, Math.floor(x * sx2));
      out[y * origW + x] = sigmoid(full[py * TARGET + px]) > 0.5 ? 1 : 0;
    }
  }
  return out;
}

/**
 * Corre el decoder liviano para un punto tocado (coords 0-1 relativas a la imagen original).
 * Devuelve { mask, w, h, iou } donde mask es Uint8Array binaria en tamaño original (origW×origH).
 */
async function segmentPoint(embedding, xFrac, yFrac) {
  const { decoderSession, positionalEmbeddings } = await getSessions();
  const { imageEmbeddings, origW, origH, newW, newH, scale } = embedding;

  const px = xFrac * origW * scale;
  const py = yFrac * origH * scale;
  const inputPoints = new ort.Tensor('float32', new Float32Array([px, py]), [1, 1, 1, 2]);
  const inputLabels = new ort.Tensor('int64', new BigInt64Array([1n]), [1, 1, 1]);

  const decOut = await decoderSession.run({
    input_points: inputPoints,
    input_labels: inputLabels,
    image_embeddings: imageEmbeddings,
    image_positional_embeddings: positionalEmbeddings,
  });

  const iou = decOut.iou_scores.data;
  let bestIdx = 0;
  for (let i = 1; i < iou.length; i++) if (iou[i] > iou[bestIdx]) bestIdx = i;

  const maskDims = decOut.pred_masks.dims;
  const lowSize = maskDims[maskDims.length - 1];
  const maskPlane = lowSize * lowSize;
  const maskData = decOut.pred_masks.data.slice(bestIdx * maskPlane, (bestIdx + 1) * maskPlane);

  const mask = upscaleMask(maskData, lowSize, newW, newH, origW, origH);
  return { mask, w: origW, h: origH, iou: iou[bestIdx] };
}

/** Serializa el embedding cacheable a { buffer, meta } para persistir en Cloud Storage. */
function serializeEmbedding(embedding) {
  const { imageEmbeddings, origW, origH, newW, newH, scale } = embedding;
  const data = imageEmbeddings.data;
  const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const meta = { dims: imageEmbeddings.dims, origW, origH, newW, newH, scale };
  return { buffer, meta };
}

function deserializeEmbedding(buffer, meta) {
  const data = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const imageEmbeddings = new ort.Tensor('float32', data, meta.dims);
  return { imageEmbeddings, origW: meta.origW, origH: meta.origH, newW: meta.newW, newH: meta.newH, scale: meta.scale };
}

module.exports = { computeEmbedding, segmentPoint, serializeEmbedding, deserializeEmbedding };
