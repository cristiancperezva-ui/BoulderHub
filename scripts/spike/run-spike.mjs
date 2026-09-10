// Spike Fase 0: prueba de calidad SlimSAM (variante distillada de SAM) para
// segmentar presas de escalada dado un punto tocado. Corre 100% local en Node,
// no toca producción. Genera overlays PNG para inspección visual.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

const TARGET = 1024; // SAM/SlimSAM trabaja con lado mayor = 1024, padding top-left
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const OUT_DIR = './scripts/spike/out';

async function preprocess(path) {
  const img = sharp(path).rotate(); // respeta EXIF orientation
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

  // HWC uint8 -> CHW float32 normalizado
  const chw = new Float32Array(3 * TARGET * TARGET);
  const plane = TARGET * TARGET;
  for (let i = 0; i < plane; i++) {
    const r = data[i * 3] / 255;
    const g = data[i * 3 + 1] / 255;
    const b = data[i * 3 + 2] / 255;
    chw[i] = (r - MEAN[0]) / STD[0];
    chw[plane + i] = (g - MEAN[1]) / STD[1];
    chw[plane * 2 + i] = (b - MEAN[2]) / STD[2];
  }
  return { chw, origW: w, origH: h, newW, newH, scale };
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/** Sube la máscara de baja resolución (256x256) a tamaño original, recortando el padding. */
function upscaleMask(maskLowRes, lowSize, newW, newH, origW, origH) {
  // 1. lowSize -> TARGET (nearest, luego bilinear real sería mejor pero alcanza para el spike)
  const scaleUp = TARGET / lowSize;
  const full = new Float32Array(TARGET * TARGET);
  for (let y = 0; y < TARGET; y++) {
    const sy = Math.min(lowSize - 1, Math.floor(y / scaleUp));
    for (let x = 0; x < TARGET; x++) {
      const sx = Math.min(lowSize - 1, Math.floor(x / scaleUp));
      full[y * TARGET + x] = maskLowRes[sy * lowSize + sx];
    }
  }
  // 2. recortar el padding (top-left) a newW x newH
  // 3. reescalar a tamaño original
  const out = new Uint8Array(origW * origH);
  const sx2 = newW / origW;
  const sy2 = newH / origH;
  for (let y = 0; y < origH; y++) {
    const py = Math.min(newH - 1, Math.floor(y * sy2));
    for (let x = 0; x < origW; x++) {
      const px = Math.min(newW - 1, Math.floor(x * sx2));
      out[y * origW + x] = sigmoid(full[py * TARGET + px]) > 0.5 ? 1 : 0;
    }
  }
  return out;
}

async function runOne(encoder, decoder, samplePath, points) {
  const { chw, origW, origH, newW, newH, scale } = await preprocess(samplePath);
  const pixelValues = new ort.Tensor('float32', chw, [1, 3, TARGET, TARGET]);
  const encOut = await encoder.run({ pixel_values: pixelValues });
  const imageEmbeddings = encOut.image_embeddings;
  const imagePosEmbeddings = encOut.image_positional_embeddings;

  const overlay = await sharp(samplePath).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = overlay.data;
  const { width, height } = overlay.info;

  for (const [fx, fy] of points) {
    const px = fx * origW;
    const py = fy * origH;
    // coords en el espacio 1024x1024 (mismo scale que el encoder)
    const inputPoints = new ort.Tensor('float32', new Float32Array([px * scale, py * scale]), [1, 1, 1, 2]);
    const inputLabels = new ort.Tensor('int64', new BigInt64Array([1n]), [1, 1, 1]);

    const decOut = await decoder.run({
      input_points: inputPoints,
      input_labels: inputLabels,
      image_embeddings: imageEmbeddings,
      image_positional_embeddings: imagePosEmbeddings,
    });

    const iou = decOut.iou_scores.data;
    let bestIdx = 0;
    for (let i = 1; i < iou.length; i++) if (iou[i] > iou[bestIdx]) bestIdx = i;

    const maskDims = decOut.pred_masks.dims; // [1,1,numMasks,H,W]
    const lowSize = maskDims[maskDims.length - 1];
    const maskPlane = lowSize * lowSize;
    const maskData = decOut.pred_masks.data.slice(bestIdx * maskPlane, (bestIdx + 1) * maskPlane);

    const mask = upscaleMask(maskData, lowSize, newW, newH, origW, origH);

    // pintar overlay: amarillo semitransparente donde mask==1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x]) {
          const idx = (y * width + x) * 4;
          pixels[idx] = Math.min(255, pixels[idx] * 0.3 + 255 * 0.7);
          pixels[idx + 1] = Math.min(255, pixels[idx + 1] * 0.3 + 220 * 0.7);
          pixels[idx + 2] = pixels[idx + 2] * 0.3;
        }
      }
    }
    // marcar el punto tocado en rojo
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const x = Math.round(px) + dx, y = Math.round(py) + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (dx * dx + dy * dy > 36) continue;
        const idx = (y * width + x) * 4;
        pixels[idx] = 255; pixels[idx + 1] = 0; pixels[idx + 2] = 0;
      }
    }
    console.log(`  punto (${fx},${fy}) iou=${iou[bestIdx].toFixed(3)} maskPixels=${mask.reduce((a, b) => a + b, 0)}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const id = samplePath.split('/').pop().replace('.webp', '');
  const outPath = `${OUT_DIR}/${id}.png`;
  await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
  console.log(`  -> ${outPath}`);
}

async function main() {
  console.log('Cargando modelos SlimSAM...');
  const encoder = await ort.InferenceSession.create('./scripts/spike/models/vision_encoder.onnx');
  const decoder = await ort.InferenceSession.create('./scripts/spike/models/prompt_encoder_mask_decoder.onnx');

  const manifest = JSON.parse(readFileSync('./scripts/spike/samples/manifest.json', 'utf-8'));

  // Puntos de prueba (fracciones x,y) elegidos a ojo sobre presas visibles.
  const testPoints = {
    '0D7b9BqnaGsPXOnzE6cF': [[0.075, 0.156], [0.29, 0.63], [0.15, 0.08], [0.83, 0.78]],
    '1UVg8fCugnMw9ojVTEBM': [[0.125, 0.25], [0.47, 0.29], [0.67, 0.33], [0.75, 0.5]],
    // Bloque A — iluminación pareja/uniforme (foto tomada de frente, poca sombra dura)
    '29oQemOf7AG8wtiSj9fq': [[0.25, 0.065], [0.18, 0.2], [0.18, 0.57], [0.43, 0.52], [0.05, 0.27]],
    // Bloque B — iluminación difícil (reflejos de foco cenital + sombras duras en caras del muro)
    '0f2ZyXK0npVFYxIRzsLh': [[0.54, 0.21], [0.47, 0.26], [0.72, 0.5], [0.79, 0.41], [0.15, 0.41]],
  };

  for (const entry of manifest) {
    const points = testPoints[entry.id];
    if (!points) continue;
    console.log(`\nProcesando ${entry.id}...`);
    const t0 = Date.now();
    await runOne(encoder, decoder, entry.file, points);
    console.log(`  tiempo total: ${Date.now() - t0}ms`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
