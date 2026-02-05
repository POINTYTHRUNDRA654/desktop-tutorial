// Asset Analysis Web Worker
// Handles ESP, NIF, and DDS file analysis in the background

interface AssetAnalysisMessage {
  type: 'analyze';
  id: string;
  data: {
    buffer: ArrayBuffer;
    filename: string;
    type: 'esp' | 'nif' | 'dds';
  };
}

interface WorkerMessage {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

interface ESPAnalysis {
  filename: string;
  header: {
    signature: string;
    version: number;
    recordCount: number;
    nextObjectId: number;
  };
  records: Array<{
    type: string;
    size: number;
    flags: number;
  }>;
  fileSize: number;
  warnings: string[];
}

interface NIFAnalysis {
  filename: string;
  header: {
    version: number;
    endian: 'big' | 'little';
    userVersion: number;
    numBlocks: number;
  };
  blocks: Array<{
    type: string;
    size: number;
  }>;
  vertices: number;
  triangles: number;
  fileSize: number;
  warnings: string[];
}

interface DDSAnalysis {
  filename: string;
  header: {
    width: number;
    height: number;
    format: string;
    mipmapCount: number;
    compressed: boolean;
  };
  fileSize: number;
  warnings: string[];
}

// Utility functions
function readUint32LE(buffer: ArrayBuffer, offset: number): number {
  const view = new DataView(buffer);
  return view.getUint32(offset, true);
}

function readUint32BE(buffer: ArrayBuffer, offset: number): number {
  const view = new DataView(buffer);
  return view.getUint32(offset, false);
}

function readString(buffer: ArrayBuffer, offset: number, length: number): string {
  const view = new Uint8Array(buffer, offset, length);
  let str = '';
  for (let i = 0; i < length; i++) {
    if (view[i] === 0) break;
    str += String.fromCharCode(view[i]);
  }
  return str;
}

// ESP file analysis
function analyzeESP(buffer: ArrayBuffer, filename: string): ESPAnalysis {
  const analysis: ESPAnalysis = {
    filename,
    header: {
      signature: '',
      version: 0,
      recordCount: 0,
      nextObjectId: 0
    },
    records: [],
    fileSize: buffer.byteLength,
    warnings: []
  };

  try {
    // Read TES4 header
    analysis.header.signature = readString(buffer, 0, 4);
    if (analysis.header.signature !== 'TES4') {
      analysis.warnings.push('Invalid ESP signature');
      return analysis;
    }

    analysis.header.version = readUint32LE(buffer, 4);
    analysis.header.recordCount = readUint32LE(buffer, 8);
    analysis.header.nextObjectId = readUint32LE(buffer, 12);

    // Read records
    let offset = 16; // After header
    for (let i = 0; i < Math.min(analysis.header.recordCount, 1000); i++) {
      if (offset + 8 > buffer.byteLength) break;

      const recordType = readString(buffer, offset, 4);
      const recordSize = readUint32LE(buffer, offset + 4);
      const recordFlags = readUint32LE(buffer, offset + 8);

      analysis.records.push({
        type: recordType,
        size: recordSize,
        flags: recordFlags
      });

      offset += 8 + recordSize;
    }

    // Check file size limits
    if (buffer.byteLength > 100 * 1024 * 1024) { // 100MB
      analysis.warnings.push('File size exceeds recommended limit (100MB)');
    }

  } catch (error) {
    analysis.warnings.push(`Analysis error: ${error}`);
  }

  return analysis;
}

// NIF file analysis
function analyzeNIF(buffer: ArrayBuffer, filename: string): NIFAnalysis {
  const analysis: NIFAnalysis = {
    filename,
    header: {
      version: 0,
      endian: 'little',
      userVersion: 0,
      numBlocks: 0
    },
    blocks: [],
    vertices: 0,
    triangles: 0,
    fileSize: buffer.byteLength,
    warnings: []
  };

  try {
    // Read NIF header
    const magic = readString(buffer, 0, 40);
    if (!magic.includes('NetImmerse File Format')) {
      analysis.warnings.push('Invalid NIF signature');
      return analysis;
    }

    analysis.header.version = readUint32LE(buffer, 40);
    analysis.header.endian = readUint32LE(buffer, 44) === 0 ? 'little' : 'big';
    analysis.header.userVersion = readUint32LE(buffer, 48);
    analysis.header.numBlocks = readUint32LE(buffer, 52);

    // Read block types
    let offset = 56;
    for (let i = 0; i < Math.min(analysis.header.numBlocks, 100); i++) {
      if (offset + 4 > buffer.byteLength) break;

      const blockTypeLength = readUint32LE(buffer, offset);
      offset += 4;

      if (offset + blockTypeLength > buffer.byteLength) break;

      const blockType = readString(buffer, offset, blockTypeLength);
      offset += blockTypeLength;

      // Estimate block size (simplified)
      const blockSize = readUint32LE(buffer, offset) || 64;

      analysis.blocks.push({
        type: blockType,
        size: blockSize
      });

      // Count vertices and triangles for mesh blocks
      if (blockType.includes('NiTriShape') || blockType.includes('BSTriShape')) {
        // Simplified vertex/triangle counting
        analysis.vertices += Math.floor(blockSize / 12); // Rough estimate
        analysis.triangles += Math.floor(blockSize / 36); // Rough estimate
      }
    }

    // Performance warnings
    if (analysis.vertices > 10000) {
      analysis.warnings.push('High vertex count may impact performance');
    }
    if (analysis.triangles > 20000) {
      analysis.warnings.push('High triangle count may impact performance');
    }

  } catch (error) {
    analysis.warnings.push(`Analysis error: ${error}`);
  }

  return analysis;
}

// DDS file analysis
function analyzeDDS(buffer: ArrayBuffer, filename: string): DDSAnalysis {
  const analysis: DDSAnalysis = {
    filename,
    header: {
      width: 0,
      height: 0,
      format: 'Unknown',
      mipmapCount: 0,
      compressed: false
    },
    fileSize: buffer.byteLength,
    warnings: []
  };

  try {
    // Read DDS header
    const magic = readString(buffer, 0, 4);
    if (magic !== 'DDS ') {
      analysis.warnings.push('Invalid DDS signature');
      return analysis;
    }

    analysis.header.width = readUint32LE(buffer, 16);
    analysis.header.height = readUint32LE(buffer, 12);
    const pixelFormat = readUint32LE(buffer, 80);
    analysis.header.mipmapCount = Math.max(1, readUint32LE(buffer, 24));

    // Determine format
    const fourCC = readString(buffer, 84, 4);
    switch (fourCC) {
      case 'DXT1':
        analysis.header.format = 'DXT1';
        analysis.header.compressed = true;
        break;
      case 'DXT3':
        analysis.header.format = 'DXT3';
        analysis.header.compressed = true;
        break;
      case 'DXT5':
        analysis.header.format = 'DXT5';
        analysis.header.compressed = true;
        break;
      default:
        analysis.header.format = 'Uncompressed';
        analysis.header.compressed = false;
    }

    // Check dimensions
    if (analysis.header.width > 4096 || analysis.header.height > 4096) {
      analysis.warnings.push('Texture dimensions exceed recommended limits');
    }

    // Check power of 2
    const isPowerOf2 = (n: number) => (n & (n - 1)) === 0;
    if (!isPowerOf2(analysis.header.width) || !isPowerOf2(analysis.header.height)) {
      analysis.warnings.push('Texture dimensions should be power of 2');
    }

  } catch (error) {
    analysis.warnings.push(`Analysis error: ${error}`);
  }

  return analysis;
}

// Worker message handler
self.onmessage = function(e: MessageEvent<AssetAnalysisMessage>) {
  const { type, id, data } = e.data;

  try {
    if (type === 'analyze') {
      const { buffer, filename, type: assetType } = data;

      let result: ESPAnalysis | NIFAnalysis | DDSAnalysis;

      switch (assetType) {
        case 'esp':
          result = analyzeESP(buffer, filename);
          break;
        case 'nif':
          result = analyzeNIF(buffer, filename);
          break;
        case 'dds':
          result = analyzeDDS(buffer, filename);
          break;
        default:
          throw new Error(`Unknown asset type: ${assetType}`);
      }

      const message: WorkerMessage = { type: 'result', id, data: result };
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