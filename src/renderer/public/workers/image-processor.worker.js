// Web Worker for image processing operations
// Handles normal map generation, roughness maps, height maps, etc.

interface ImageProcessingMessage {
  type: 'process-image';
  id: string;
  operation: 'normal-map' | 'roughness-map' | 'height-map' | 'metallic-map' | 'ao-map';
  imageData: ImageData;
  options?: Record<string, any>;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

// Sobel operator for edge detection (used in normal maps and metallic maps)
function sobelEdgeDetection(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

          gx += gray * sobelX[(ky + 1) * 3 + (kx + 1)];
          gy += gray * sobelY[(ky + 1) * 3 + (kx + 1)];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * width + x) * 4;

      outputData[idx] = magnitude;     // R
      outputData[idx + 1] = magnitude; // G
      outputData[idx + 2] = magnitude; // B
      outputData[idx + 3] = 255;       // A
    }
  }

  return output;
}

// Generate normal map from height map
function generateNormalMap(heightMap: ImageData): ImageData {
  const { data, width, height } = heightMap;
  const output = new ImageData(width, height);
  const outputData = output.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const h = data[idx]; // Use red channel as height

      // Sample neighboring heights
      const hL = data[((y * width) + (x - 1)) * 4];
      const hR = data[((y * width) + (x + 1)) * 4];
      const hU = data[((y - 1) * width + x) * 4];
      const hD = data[((y + 1) * width + x) * 4];

      // Calculate normal vector
      const nx = (hL - hR) / 255.0;
      const ny = (hU - hD) / 255.0;
      const nz = 1.0 / 255.0; // Strength factor

      // Normalize
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const normalX = nx / length;
      const normalY = ny / length;
      const normalZ = nz / length;

      // Convert to RGB (normal maps typically use 0-255 range with 128 as neutral)
      outputData[idx] = Math.floor((normalX + 1) * 127.5);     // R
      outputData[idx + 1] = Math.floor((normalY + 1) * 127.5); // G
      outputData[idx + 2] = Math.floor((normalZ + 1) * 127.5); // B
      outputData[idx + 3] = 255;                               // A
    }
  }

  return output;
}

// Generate roughness map from luminance inversion
function generateRoughnessMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const roughness = 1 - luminance;

    const value = Math.floor(roughness * 255);
    outputData[i] = value;     // R
    outputData[i + 1] = value; // G
    outputData[i + 2] = value; // B
    outputData[i + 3] = 255;   // A
  }

  return output;
}

// Generate height map from grayscale conversion
function generateHeightMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const height = Math.floor((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114));
    outputData[i] = height;     // R
    outputData[i + 1] = height; // G
    outputData[i + 2] = height; // B
    outputData[i + 3] = 255;    // A
  }

  return output;
}

// Generate metallic map from edge detection
function generateMetallicMap(imageData: ImageData): ImageData {
  return sobelEdgeDetection(imageData);
}

// Generate ambient occlusion map from luminance variance
function generateAOMap(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;

  // Simple AO based on local luminance variance
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const centerLum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      // Sample neighbors
      let variance = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nidx = ((y + dy) * width + (x + dx)) * 4;
          const lum = (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3;
          variance += Math.pow(centerLum - lum, 2);
          count++;
        }
      }

      variance /= count;
      const ao = Math.max(0, 1 - variance / 10000); // Normalize variance

      const value = Math.floor(ao * 255);
      outputData[idx] = value;
      outputData[idx + 1] = value;
      outputData[idx + 2] = value;
      outputData[idx + 3] = 255;
    }
  }

  return output;
}

// Main message handler
self.onmessage = function(e: MessageEvent<ImageProcessingMessage>) {
  const { type, id, operation, imageData, options } = e.data;

  try {
    let result: ImageData;

    switch (operation) {
      case 'normal-map':
        result = generateNormalMap(imageData);
        break;
      case 'roughness-map':
        result = generateRoughnessMap(imageData);
        break;
      case 'height-map':
        result = generateHeightMap(imageData);
        break;
      case 'metallic-map':
        result = generateMetallicMap(imageData);
        break;
      case 'ao-map':
        result = generateAOMap(imageData);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Send progress update
    self.postMessage({
      type: 'progress',
      id,
      progress: 100
    } as WorkerResponse);

    // Send result
    self.postMessage({
      type: 'result',
      id,
      data: result
    } as WorkerResponse);

  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as WorkerResponse);
  }
};