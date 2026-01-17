import React, { useState, useMemo } from 'react';
import { FileText, Receipt, AlertCircle } from 'lucide-react';

interface DigitalBillRendererProps {
    ocrText?: string;
    storeName?: string;
    items?: Array<{
        quantity: number;
        name: string;
        price: number;
        mrp?: number;
    }>;
    totalAmount?: number;
}

const DigitalBillRenderer: React.FC<DigitalBillRendererProps> = ({
    ocrText = "",
    storeName: propStoreName,
    items: propItems,
    totalAmount: propTotalAmount
}) => {
    const [viewMode, setViewMode] = useState<'items' | 'raw'>('items');

    // Use provided data or parse from OCR text
    const billData = useMemo(() => {
        // If structured data is provided, use it
        if (propStoreName && propItems && propTotalAmount !== undefined) {
            return {
                storeName: propStoreName,
                items: propItems,
                totalAmount: propTotalAmount,
                rawText: ocrText
            };
        }

        // Otherwise, parse from OCR text
        if (!ocrText) return null;

        const lines = ocrText.split('\n').filter(line => line.trim() !== '');

        // 1. Extract Store Name (Assume it's the first non-empty line)
        const storeName = lines[0] || "Unknown Store";

        // 2. Extract Items
        const items = [];
        let calculatedTotal = 0;

        const itemRegex = /^(?:(\d+)\s*[xX]\s*)?(.+?)\s+(\d+[.,]\d{2})$/;

        lines.slice(1).forEach(line => {
            const cleanLine = line.replace(/[^\w\s.,₹$]/g, '').trim();

            const match = cleanLine.match(itemRegex);
            if (match) {
                const qty = match[1] ? parseInt(match[1]) : 1;
                const name = match[2].trim();
                const price = parseFloat(match[3].replace(',', ''));

                if (!name.toLowerCase().includes('total') && !name.toLowerCase().includes('tax')) {
                    items.push({ quantity: qty, name, price });
                    calculatedTotal += price;
                }
            }
        });

        // 3. Extract Total
        const totalLine = lines.find(line => line.toLowerCase().includes('total'));
        let extractedTotal = calculatedTotal;

        if (totalLine) {
            const totalMatch = totalLine.match(/(\d+[.,]\d{2})/);
            if (totalMatch) {
                extractedTotal = parseFloat(totalMatch[1].replace(',', ''));
            }
        }

        return {
            storeName,
            items,
            totalAmount: extractedTotal,
            rawText: ocrText
        };
    }, [ocrText, propStoreName, propItems, propTotalAmount]);

    if (!billData) return <div className="text-gray-500">No data provided</div>;

    return (
        <section className="w-full font-sans">

            {/* Top Controls */}
            <div className="flex justify-end mb-4">
                <div className="bg-stone-200 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setViewMode('items')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'items' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        <Receipt size={14} /> Items
                    </button>
                    <button
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'raw' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        <FileText size={14} /> Raw
                    </button>
                </div>
            </div>

            {/* Main Digital Bill Card */}
            <div className="relative min-h-[400px] flex flex-col drop-shadow-xl">
                {viewMode === 'items' ? (
                    <div className="flex-1 space-y-4 bg-[#fdfcf0] p-6 sm:p-8 rounded-sm border border-stone-200 relative overflow-hidden">
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

                        {/* Header */}
                        <div className="text-center mb-6 border-b border-stone-300 border-dashed pb-4 relative z-10">
                            <h5 className="font-mono font-bold text-stone-800 uppercase tracking-widest text-lg">
                                {billData.storeName}
                            </h5>
                            <p className="text-[10px] font-mono text-stone-500 uppercase mt-1">Digital Receipt</p>
                        </div>

                        {/* Items List */}
                        <div className="space-y-3 relative z-10 min-h-[150px]">
                            {billData.items.length > 0 ? (
                                <>
                                    <div className="flex justify-between text-xs font-mono font-bold text-stone-500 border-b border-stone-300 pb-2 mb-2">
                                        <span className="w-8">Qty</span>
                                        <span className="flex-1">Item</span>
                                        <span className="w-16 text-right">Price</span>
                                    </div>
                                    {billData.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm font-mono items-start">
                                            <span className="text-stone-600 w-8">{item.quantity}</span>
                                            <span className="text-stone-800 flex-1 pr-2 leading-tight">{item.name}</span>
                                            <span className="font-bold text-stone-900 w-16 text-right">
                                                ₹{item.price.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="text-center py-8 text-stone-400 flex flex-col items-center gap-2">
                                    <AlertCircle size={24} />
                                    <p className="text-xs">Could not auto-extract items.<br />Check the Raw Text tab.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-auto pt-6 border-t border-stone-300 border-dashed relative z-10">
                            <div className="flex justify-between font-mono font-extrabold text-xl text-stone-900 border-t-2 border-stone-800 pt-2">
                                <span>TOTAL</span>
                                <span>₹{billData.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Zig-Zag Bottom Edge (CSS) */}
                        <div
                            className="absolute bottom-0 left-0 w-full h-3 bg-stone-100 z-20"
                            style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}
                        ></div>
                    </div>
                ) : (
                    // Raw Text View
                    <div className="flex-1 bg-stone-900 rounded-lg p-6 relative overflow-hidden border border-stone-800">
                        <pre className="text-[13px] leading-relaxed text-emerald-400 whitespace-pre-wrap font-mono h-[400px] overflow-y-auto custom-scrollbar">
                            {billData.rawText}
                        </pre>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DigitalBillRenderer;
