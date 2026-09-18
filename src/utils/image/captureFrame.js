export function captureFrame(video) {
  return new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error("Camera is unavailable."));
      return;
    }

    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      reject(new Error("Camera is not ready yet."));
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;

    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Unable to capture the camera frame."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to create the captured image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.82,
    );
  });
}
