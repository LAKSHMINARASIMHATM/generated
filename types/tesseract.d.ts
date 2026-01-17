declare module 'tesseract.js' {
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
    };
  }

  export interface WorkerOptions {
    logger?: (progress: any) => void;
  }

  export interface TesseractWorker {
    recognize(image: string | HTMLImageElement | HTMLCanvasElement | ImageData, lang?: string, options?: Partial<WorkerOptions>): Promise<RecognizeResult>;
    terminate(): void;
  }

  export function createWorker(lang?: string, options?: Partial<WorkerOptions>): Promise<TesseractWorker>;
  export default createWorker;
}