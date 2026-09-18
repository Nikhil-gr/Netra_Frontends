import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

let modelPromise = null;

export function getCocoDetector() {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.setBackend("webgl");
      } catch {
        // TensorFlow will use another available backend.
      }

      await tf.ready();

      const model = await cocoSsd.load({
        base: "lite_mobilenet_v2",
      });

      return model;
    })();
  }

  return modelPromise;
}
