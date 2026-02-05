// Image Processing Web Worker
// Handles PBR texture generation in the background

interface ImageProcessingMessage {
  type: 'process' | 'batch';
  id: string;
  data: {
    imageData: ImageData;
    operation: 'normal' | 'roughness' | 'height' | 'metallic' | 'ao';
    options?: any;
  }[];
}

interface WorkerMessage {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

// Sobel operator kernels for edge detection
const SOBEL_X = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1]
];

const SOBEL_Y = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1]
];

// Utility functions
function clamp(value: number, min: number = 0, max: number = 255): number {
  return Math.max(min, Math.min(max, value));
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number, number] {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
  const index = (y * width + x) * 4;
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}

// Image processing functions
function generateNormalMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Calculate gradients using Sobel operator
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const [r, g, b] = getPixel(data, width, x + kx, y + ky);
          const intensity = (r + g + b) / 3;

          gx += intensity * SOBEL_X[ky + 1][kx + 1];
          gy += intensity * SOBEL_Y[ky + 1][kx + 1];
        }
      }

      // Normalize gradients
      const length = Math.sqrt(gx * gx + gy * gy);
      if (length > 0) {
        gx /= length;
        gy /= length;
      }

      // Convert to normal map (X, Y, Z)
      const nx = clamp((gx + 1) * 127.5);
      const ny = clamp((gy + 1) * 127.5);
      const nz = clamp(255 * (1 - length / 1000)); // Height-based Z component

      setPixel(output.data, width, x, y, nx, ny, nz);
    }
  }

  return output;
}

function generateRoughnessMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Roughness from luminance inversion
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const roughness = clamp((1 - luminance) * 255);

    output.data[i] = roughness;
    output.data[i + 1] = roughness;
    output.data[i + 2] = roughness;
    output.data[i + 3] = 255;
  }

  return output;
}

function generateHeightMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Height from grayscale conversion
    const height = (r * 0.299 + g * 0.587 + b * 0.114);

    output.data[i] = height;
    output.data[i + 1] = height;
    output.data[i + 2] = height;
    output.data[i + 3] = 255;
  }

  return output;
}

function generateMetallicMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Edge detection for metallic areas
      let edgeStrength = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const [r1, g1, b1] = getPixel(data, width, x, y);
          const [r2, g2, b2] = getPixel(data, width, x + kx, y + ky);

          const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
          edgeStrength += diff;
        }
      }

      const metallic = clamp(edgeStrength / 10);
      setPixel(output.data, width, x, y, metallic, metallic, metallic);
    }
  }

  return output;
}

function generateAOMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sample neighboring pixels for ambient occlusion
      let totalVariance = 0;
      let sampleCount = 0;

      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const nx = x + kx;
          const ny = y + ky;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const [r, g, b] = getPixel(data, width, nx, ny);
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            totalVariance += luminance;
            sampleCount++;
          }
        }
      }

      const averageLuminance = totalVariance / sampleCount;
      const ao = clamp((1 - averageLuminance) * 255);

      setPixel(output.data, width, x, y, ao, ao, ao);
    }
  }

  return output;
}

// Worker message handler
self.onmessage = function(e: MessageEvent<ImageProcessingMessage>) {
  const { type, id, data } = e.data;

  try {
    if (type === 'process' || type === 'batch') {
      const results: any[] = [];

      for (let i = 0; i < data.length; i++) {
        const { imageData, operation } = data[i];

        let result: ImageData;
        switch (operation) {
          case 'normal':
            result = generateNormalMap(imageData);
            break;
          case 'roughness':
            result = generateRoughnessMap(imageData);
            break;
          case 'height':
            result = generateHeightMap(imageData);
            break;
          case 'metallic':
            result = generateMetallicMap(imageData);
            break;
          case 'ao':
            result = generateAOMap(imageData);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results.push(result);

        // Report progress
        const progress = ((i + 1) / data.length) * 100;
        const message: WorkerMessage = { type: 'progress', id, progress };
        self.postMessage(message);
      }

      const message: WorkerMessage = { type: 'result', id, data: results };
      self.postMessage(message);
    }
  } catch (error) {
    const message: WorkerMessage = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(message);
  }
};