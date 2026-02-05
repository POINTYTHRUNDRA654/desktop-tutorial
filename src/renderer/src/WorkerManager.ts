import { cacheManager } from './CacheManager';

// Import workers using Vite's worker syntax
import ImageProcessorWorker from './workers/image-processor.worker.ts?worker';
import AssetAnalyzerWorker from './workers/asset-analyzer.worker.ts?worker';

interface WorkerMessage {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

interface WorkerTask {
  id: string;
  worker: Worker;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  onProgress?: (progress: number) => void;
}

export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private tasks: Map<string, WorkerTask> = new Map();
  private taskCounter = 0;

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    // Image processing worker
    const imageWorker = new ImageProcessorWorker();
    imageWorker.onmessage = this.handleWorkerMessage.bind(this);
    this.workers.set('image-processor', imageWorker);

    // Asset analysis worker
    const assetWorker = new AssetAnalyzerWorker();
    assetWorker.onmessage = this.handleWorkerMessage.bind(this);
    this.workers.set('asset-analyzer', assetWorker);
  }

  private handleWorkerMessage(e: MessageEvent<WorkerMessage>): void {
    const { type, id, data, error, progress } = e.data;
    const task = this.tasks.get(id);

    if (!task) return;

    switch (type) {
      case 'progress':
        if (task.onProgress && progress !== undefined) {
          task.onProgress(progress);
        }
        break;

      case 'result':
        // Cache the result if it's cacheable
        if (data && data.type) {
          this.cacheResult(data);
        }
        task.resolve(data);
        this.tasks.delete(id);
        break;

      case 'error':
        task.reject(new Error(error));
        this.tasks.delete(id);
        break;
    }
  }

  private cacheResult(data: any): void {
    // Cache analysis results
    if (data.type === 'dds' || data.type === 'nif' || data.type === 'esp') {
      cacheManager.cacheAnalysisResult(data.fileName, data);
    }
  }

  private generateTaskId(): string {
    return `task-${++this.taskCounter}-${Date.now()}`;
  }

  // Image Processing Methods
  async processImage(
    operation: 'normal-map' | 'roughness-map' | 'height-map' | 'metallic-map' | 'ao-map',
    imageData: ImageData,
    options?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const worker = this.workers.get('image-processor');
      if (!worker) {
        reject(new Error('Image processor worker not available'));
        return;
      }

      const taskId = this.generateTaskId();
      const task: WorkerTask = {
        id: taskId,
        worker,
        resolve,
        reject,
        onProgress
      };

      this.tasks.set(taskId, task);

      worker.postMessage({
        type: 'process-image',
        id: taskId,
        operation,
        imageData,
        options
      });
    });
  }

  // Asset Analysis Methods
  async analyzeAsset(
    assetType: 'dds' | 'nif' | 'esp',
    fileData: ArrayBuffer,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    // Check cache first
    const cached = await cacheManager.getCachedAnalysisResult(fileName);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      const worker = this.workers.get('asset-analyzer');
      if (!worker) {
        reject(new Error('Asset analyzer worker not available'));
        return;
      }

      const taskId = this.generateTaskId();
      const task: WorkerTask = {
        id: taskId,
        worker,
        resolve,
        reject,
        onProgress
      };

      this.tasks.set(taskId, task);

      worker.postMessage({
        type: 'analyze-asset',
        id: taskId,
        assetType,
        fileData,
        fileName
      });
    });
  }

  // Batch processing for multiple images
  async processImages(
    operations: Array<{
      operation: 'normal-map' | 'roughness-map' | 'height-map' | 'metallic-map' | 'ao-map';
      imageData: ImageData;
      options?: Record<string, any>;
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ImageData[]> {
    const promises = operations.map(async (op, index) => {
      const result = await this.processImage(op.operation, op.imageData, op.options);
      if (onProgress) {
        onProgress(index + 1, operations.length);
      }
      return result;
    });

    return Promise.all(promises);
  }

  // Batch analysis for multiple assets
  async analyzeAssets(
    assets: Array<{
      assetType: 'dds' | 'nif' | 'esp';
      fileData: ArrayBuffer;
      fileName: string;
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<any[]> {
    const promises = assets.map(async (asset, index) => {
      const result = await this.analyzeAsset(asset.assetType, asset.fileData, asset.fileName);
      if (onProgress) {
        onProgress(index + 1, assets.length);
      }
      return result;
    });

    return Promise.all(promises);
  }

  // Cleanup method
  destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.tasks.clear();
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();