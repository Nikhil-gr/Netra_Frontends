const loadImage = (blob) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    const url = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(url);

      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(new Error("Unable to prepare image."));
    };

    image.src = url;
  });

export async function compressImage(
  blob,
  { maxDimension = 1024, quality = 0.72 } = {},
) {
  if (!(blob instanceof Blob)) {
    throw new Error("Invalid image.");
  }

  const image = await loadImage(blob);

  const largestDimension = Math.max(image.naturalWidth, image.naturalHeight);

  const scale = Math.min(1, maxDimension / largestDimension);

  const width = Math.max(1, Math.round(image.naturalWidth * scale));

  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is unavailable.");
  }

  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (compressedBlob) => {
        if (!compressedBlob) {
          reject(new Error("Image compression failed."));

          return;
        }

        resolve(compressedBlob);
      },
      "image/jpeg",
      quality,
    );
  });
}
