import * as ort from 'onnxruntime-node';

for (const name of ['vision_encoder.onnx', 'prompt_encoder_mask_decoder.onnx']) {
  const session = await ort.InferenceSession.create(`./models/${name}`);
  console.log(`\n=== ${name} ===`);
  console.log('inputs:', session.inputNames);
  console.log('outputs:', session.outputNames);
}
