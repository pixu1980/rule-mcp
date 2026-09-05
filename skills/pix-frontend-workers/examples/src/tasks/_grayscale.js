/**
 * @module tasks/grayscale
 *
 * Transferable round trip: the caller transfers an `ArrayBuffer` in, the task
 * transfers the same buffer back out. No pixel is ever copied.
 *
 * Returning `{ result, transfer }` tells the pool worker which objects to move
 * instead of clone.
 */

/**
 * Convert RGBA pixels to luminance in place.
 *
 * @param {ArrayBuffer} buffer - RGBA bytes, length divisible by 4
 * @returns {{ result: ArrayBuffer, transfer: ArrayBuffer[] }}
 */
export function grayscale(buffer) {
  const pixels = new Uint8ClampedArray(buffer);

  if (pixels.length % 4 !== 0) {
    throw new Error("Expected RGBA data: byte length must be divisible by 4");
  }

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];

    pixels[index] = luminance;
    pixels[index + 1] = luminance;
    pixels[index + 2] = luminance;
  }

  return { result: buffer, transfer: [buffer] };
}
