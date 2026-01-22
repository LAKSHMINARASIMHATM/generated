import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, FileText, Loader2, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { OCRService } from '../services/ocr/ocr.service';
import { Bill, Category } from '../types.tsx';

interface BillUploadProps {
  onComplete: (bill: Bill) => void;
}

const BillUpload: React.FC<BillUploadProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ocrEngine, setOcrEngine] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setUseCamera(false);
      setErrorMessage("Could not access camera. Please check permissions.");
      setOcrStatus('error');
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPreview(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setUseCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        setErrorMessage('Please upload an image file (JPEG, PNG)');
        setOcrStatus('error');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size too large. Please upload an image smaller than 10MB.');
        setOcrStatus('error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setErrorMessage('');
        setOcrStatus('idle');
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read file. Please try again.');
        setOcrStatus('error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!preview) {
      setErrorMessage('No image to process.');
      setOcrStatus('error');
      return;
    }

    setIsUploading(true);
    setOcrStatus('processing');
    setErrorMessage('');
    setOcrEngine('');
    setOcrConfidence(null);

    try {
      const result = await OCRService.processImage(preview);

      // Generate a unique ID for the bill
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update OCR status with engine and confidence info
      if (result.ocrEngine) {
        setOcrEngine(result.ocrEngine);
      }
      if (result.ocrConfidence !== undefined) {
        setOcrConfidence(result.ocrConfidence);
      }

      // Map string categories to Category enum
      const mapCategory = (categoryStr: string): Category => {
        const normalized = categoryStr.toLowerCase().trim();
        switch (normalized) {
          case 'dairy': return Category.Dairy;
          case 'bakery': return Category.Bakery;
          case 'fruits': return Category.Fruits;
          case 'vegetables': return Category.Vegetables;
          case 'meat': return Category.Meat;
          case 'beverages': return Category.Beverages;
          case 'snacks': return Category.Snacks;
          case 'household': return Category.Household;
          default: return Category.Other;
        }
      };

      // Create bill object with proper typing
      const bill: Bill = {
        id: billId,
        storeName: result.storeName,
        totalAmount: result.totalAmount,
        items: result.items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: mapCategory(item.category)
        })),
        date: new Date().toISOString(),
        image: preview,
        parsedText: result.parsedText
      };

      // Bill is saved to MongoDB by App.tsx's addBill function
      setOcrStatus('success');
      await onComplete(bill);
      navigate(`/analysis/${billId}`);

    } catch (err) {
      console.error("OCR Processing error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to analyze receipt. Please try again.");
      setOcrStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setPreview(null);
    setOcrStatus('idle');
    setErrorMessage('');
    setOcrEngine('');
    setOcrConfidence(null);
  };

  const getStatusMessage = () => {
    switch (ocrStatus) {
      case 'processing':
        return 'Analyzing receipt with Tesseract OCR...';
      case 'success':
        return `Successfully processed with ${ocrEngine || 'Tesseract OCR'} (${ocrConfidence?.toFixed(1) || 'N/A'}% confidence)`;
      case 'error':
        return errorMessage || 'Processing failed';
      default:
        return 'Ready to analyze';
    }
  };

  const getStatusIcon = () => {
    switch (ocrStatus) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-heading font-extrabold tracking-tight">New Scan</h1>
        <p className="text-stone-500 font-medium">Upload a receipt image or capture a photo with advanced OCR.</p>
      </header>

      {/* Status indicator */}
      <div className={`p-4 rounded-2xl flex items-center gap-3 ${ocrStatus === 'success' ? 'bg-green-50 border border-green-200' :
        ocrStatus === 'error' ? 'bg-red-50 border border-red-200' :
          ocrStatus === 'processing' ? 'bg-blue-50 border border-blue-200' :
            'bg-gray-50 border border-gray-200'
        }`}>
        {getStatusIcon()}
        <div>
          <p className={`font-medium ${ocrStatus === 'success' ? 'text-green-800' :
            ocrStatus === 'error' ? 'text-red-800' :
              ocrStatus === 'processing' ? 'text-blue-800' :
                'text-gray-800'
            }`}>
            {getStatusMessage()}
          </p>
          {ocrEngine && (
            <p className="text-sm text-gray-600">
              Engine: {ocrEngine} • Confidence: {ocrConfidence?.toFixed(1) || 'N/A'}%
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-xl space-y-8">
        {!preview && !useCamera ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group p-10 border-4 border-dashed border-stone-100 rounded-[2.5rem] hover:border-primary hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-extrabold text-xl">Upload File</p>
                <p className="text-stone-400 text-sm">JPEG, PNG supported (max 10MB)</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </button>

            <button
              onClick={startCamera}
              className="group p-10 border-4 border-dashed border-stone-100 rounded-[2.5rem] hover:border-primary hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Camera className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-extrabold text-xl">Capture Photo</p>
                <p className="text-stone-400 text-sm">Use your device camera</p>
              </div>
            </button>
          </div>
        ) : useCamera ? (
          <div className="relative rounded-[2.5rem] overflow-hidden bg-stone-900 aspect-square md:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6">
              <button
                onClick={stopCamera}
                className="bg-white/20 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/30 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={captureImage}
                className="bg-primary text-white p-6 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 transition-all"
              >
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-stone-100 aspect-square md:aspect-video border-4 border-white shadow-lg">
              <img src={preview!} alt="Preview" className="w-full h-full object-contain" />
              <button
                onClick={resetUpload}
                className="absolute top-6 right-6 bg-white/80 backdrop-blur-md text-stone-900 p-3 rounded-2xl shadow-lg hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={handleProcess}
              disabled={isUploading || ocrStatus === 'processing'}
              className="w-full bg-primary text-white py-6 rounded-[2rem] font-extrabold text-xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:translate-y-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>Analyzing Receipt...</span>
                </>
              ) : (
                <>
                  <FileText className="w-8 h-8" />
                  <span>Confirm and Analyze</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
          <FileText className="w-8 h-8 opacity-70" />
        </div>
        <div>
          <h4 className="font-extrabold text-lg text-stone-800 leading-tight">Advanced OCR Processing</h4>
          <p className="text-stone-500 text-sm font-medium">
            Using Tesseract OCR for maximum accuracy in extracting receipt data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillUpload;