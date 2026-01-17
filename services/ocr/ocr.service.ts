// Interface definitions
// Interface definitions
export interface OCRResult {
  text: string;
  confidence?: number;
  engine: 'server' | 'fallback';
}

interface ExtractedBillData {
  storeName: string;
  totalAmount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    category: string;
    mrp?: number;
  }>;
  ocrEngine?: string;
  ocrConfidence?: number;
  parsedText?: string;
}

export class OCRService {
  private static async extractWithServer(base64Image: string): Promise<any> {
    try {
      // Send the image to the backend for OCR processing
      // Using the correct API route that matches the backend configuration
      const response = await fetch('/api/v1/ocr/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartspend_token')}` // Assuming JWT token storage
        },
        body: JSON.stringify({ imageBase64: base64Image })
      });

      if (!response.ok) {
        throw new Error(`Server OCR failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Server OCR failed:', error);
      // Fallback to basic response if server request fails
      return {
        success: false,
        text: 'OCR processing failed - server unavailable',
        engine: 'fallback'
      };
    }
  }

  static async extractRawText(base64Image: string): Promise<OCRResult> {
    const result = await this.extractWithServer(base64Image);
    return {
      text: result.text || '',
      confidence: result.confidence || 0,
      engine: result.engine || 'fallback'
    };
  }

  static async extractStructuredData(base64Image: string): Promise<ExtractedBillData> {
    try {
      // Use server for OCR processing
      const serverResult = await this.extractWithServer(base64Image);
      // If server returned structured data, use it directly
      if (serverResult.success && serverResult.data) {
        return {
          storeName: serverResult.data.storeName || 'Unknown Store',
          totalAmount: serverResult.data.totalAmount || 0,
          items: serverResult.data.items || [],
          ocrEngine: serverResult.engine,
          ocrConfidence: 0, // Tesseract doesn't provide overall confidence easily
          parsedText: serverResult.text || serverResult.data.rawText || ''
        };
      }

      // Fallback if server failed or didn't return data
      return {
        storeName: 'OCR Processing Failed',
        totalAmount: 0,
        items: [],
        ocrEngine: 'fallback',
        ocrConfidence: 0,
        parsedText: serverResult.text || ''
      };

    } catch (error) {
      console.error('Failed to extract structured data:', error);
      // Return a fallback result when parsing fails
      return {
        storeName: 'OCR Processing Failed - Using Fallback',
        totalAmount: 0,
        items: [],
        ocrEngine: 'fallback',
        ocrConfidence: 0,
        parsedText: ''
      };
    }
  }

  static async extractFromImage(base64Image: string) {
    // Maintain backward compatibility
    return this.extractStructuredData(base64Image);
  }

  static async processImage(base64Image: string): Promise<ExtractedBillData> {
    // Alias for extractStructuredData to maintain compatibility
    return this.extractStructuredData(base64Image);
  }
}