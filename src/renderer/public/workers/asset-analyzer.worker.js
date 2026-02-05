// Web Worker for asset analysis operations
// Handles DDS file analysis, NIF file analysis, ESP file analysis

interface AssetAnalysisMessage {
  type: 'analyze-asset';
  id: string;
  assetType: 'dds' | 'nif' | 'esp';
  fileData: ArrayBuffer;
  fileName: string;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

// DDS File Analysis
function analyzeDDS(buffer: ArrayBuffer): any {
  const view = new DataView(buffer);
  const header = new Uint32Array(buffer, 0, 32);

  // DDS magic number check
  if (header[0] !== 0x20534444) { // 'DDS '
    throw new Error('Not a valid DDS file');
  }

  const height = header[3];
  const width = header[4];
  const mipMapCount = header[7];
  const pixelFormat = header.slice(19, 27);

  // Check for power-of-2 dimensions
  const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;
  const powerOfTwoCheck = isPowerOfTwo(width) && isPowerOfTwo(height);

  // Determine compression format
  let compressionType = 'Unknown';
  const fourCC = String.fromCharCode(pixelFormat[3], pixelFormat[2], pixelFormat[1], pixelFormat[0]);

  switch (fourCC) {
    case 'DXT1': compressionType = 'DXT1 (BC1)'; break;
    case 'DXT3': compressionType = 'DXT3 (BC2)'; break;
    case 'DXT5': compressionType = 'DXT5 (BC3)'; break;
    case 'ATI1': compressionType = 'ATI1 (BC4)'; break;
    case 'ATI2': compressionType = 'ATI2 (BC5)'; break;
    case 'BC6H': compressionType = 'BC6H'; break;
    case 'BC7': compressionType = 'BC7'; break;
  }

  return {
    type: 'dds',
    width,
    height,
    mipMapCount,
    compressionType,
    powerOfTwoCheck,
    fileSize: buffer.byteLength,
    warnings: powerOfTwoCheck ? [] : ['Dimensions are not power-of-2, may cause performance issues']
  };
}

// NIF File Analysis (Bethesda NIF format)
function analyzeNIF(buffer: ArrayBuffer): any {
  const view = new DataView(buffer);

  // Read NIF header
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'NetI') {
    throw new Error('Not a valid NIF file');
  }

  const version = view.getUint32(4, true);
  const numBlocks = view.getUint32(40, true);

  let vertexCount = 0;
  let triangleCount = 0;
  let texturePaths: string[] = [];

  // Parse blocks (simplified - real implementation would be more complex)
  let offset = 44; // After header

  for (let i = 0; i < numBlocks && offset < buffer.byteLength - 4; i++) {
    const blockType = view.getUint32(offset, true);
    offset += 4;

    // NiTriShapeData block (contains mesh data)
    if (blockType === 0x00001201) { // NiTriShapeData
      // Skip some data to get to vertex/triangle counts
      offset += 8; // Skip some fields
      vertexCount += view.getUint16(offset, true);
      offset += 2;
      offset += 2; // Skip hasNormals
      triangleCount += view.getUint16(offset, true);
      offset += 2;
    }

    // NiSourceTexture block (contains texture paths)
    if (blockType === 0x0000120E) { // NiSourceTexture
      // Skip to string data
      offset += 16; // Skip various fields
      const stringLength = view.getUint32(offset, true);
      offset += 4;
      if (stringLength > 0 && stringLength < 256) {
        let texturePath = '';
        for (let j = 0; j < stringLength; j++) {
          texturePath += String.fromCharCode(view.getUint8(offset + j));
        }
        texturePaths.push(texturePath);
        offset += stringLength;
      }
    }

    // Skip to next block (simplified)
    if (offset + 4 >= buffer.byteLength) break;
  }

  // Check for absolute paths in textures
  const absolutePathWarnings = texturePaths.filter(path =>
    path.includes('C:\\') || path.includes('D:\\') || path.includes('E:\\')
  );

  return {
    type: 'nif',
    version: version.toString(16),
    vertexCount,
    triangleCount,
    texturePaths,
    fileSize: buffer.byteLength,
    warnings: [
      ...(vertexCount > 50000 ? ['High vertex count may impact performance'] : []),
      ...(triangleCount > 100000 ? ['High triangle count may impact performance'] : []),
      ...absolutePathWarnings.map(path => `Absolute path detected: ${path}`)
    ]
  };
}

// ESP File Analysis (Bethesda Plugin format)
function analyzeESP(buffer: ArrayBuffer): any {
  const view = new DataView(buffer);

  // Read TES4 header
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'TES4') {
    throw new Error('Not a valid ESP file');
  }

  const headerSize = view.getUint32(4, true);
  const flags = view.getUint32(8, true);
  const formId = view.getUint32(12, true);
  const revision = view.getUint32(16, true);
  const version = view.getUint16(20, true);
  const numRecords = view.getUint16(22, true);

  // Parse records (simplified)
  let recordCount = 0;
  let offset = headerSize;

  while (offset < buffer.byteLength - 16) {
    const recordType = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );

    const recordSize = view.getUint32(offset + 4, true);
    recordCount++;

    // Skip to next record
    offset += recordSize + 24; // Record header size

    if (offset >= buffer.byteLength) break;
  }

  const fileSizeMB = buffer.byteLength / (1024 * 1024);
  const sizeWarnings = fileSizeMB > 100 ? ['Large ESP file may cause load order issues'] : [];

  return {
    type: 'esp',
    version,
    numRecords: recordCount,
    fileSize: buffer.byteLength,
    fileSizeMB: Math.round(fileSizeMB * 100) / 100,
    warnings: sizeWarnings
  };
}

// Main message handler
self.onmessage = function(e: MessageEvent<AssetAnalysisMessage>) {
  const { type, id, assetType, fileData, fileName } = e.data;

  try {
    let result: any;

    // Send progress update
    self.postMessage({
      type: 'progress',
      id,
      progress: 50
    } as WorkerResponse);

    switch (assetType) {
      case 'dds':
        result = analyzeDDS(fileData);
        break;
      case 'nif':
        result = analyzeNIF(fileData);
        break;
      case 'esp':
        result = analyzeESP(fileData);
        break;
      default:
        throw new Error(`Unknown asset type: ${assetType}`);
    }

    result.fileName = fileName;

    // Send final progress
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