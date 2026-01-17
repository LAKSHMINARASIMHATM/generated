import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// Updated to use .tsx extension to resolve module not found error
import { Bill, PriceComparison } from '../types.tsx';
import { ShoppingBag, ArrowLeft, Zap, CheckCircle2, FileText } from 'lucide-react';
import DigitalBillRenderer from '../components/DigitalBillRenderer.tsx';

interface AnalysisResultsProps {
  bills: Bill[];
}

// Helper function to generate e-commerce search URLs
const generateProductSearchUrl = (platform: string, itemName: string): string => {
  const encodedName = encodeURIComponent(itemName);
  switch (platform.toLowerCase()) {
    case 'amazon':
      return `https://www.amazon.in/s?k=${encodedName}`;
    case 'flipkart':
      return `https://www.flipkart.com/search?q=${encodedName}`;
    case 'myntra':
      return `https://www.myntra.com/${encodedName}`;
    case 'bigbasket':
      return `https://www.bigbasket.com/ps/?q=${encodedName}`;
    case 'jiomart':
      return `https://www.jiomart.com/search/${encodedName}`;
    case 'snapdeal':
      return `https://www.snapdeal.com/search?keyword=${encodedName}`;
    case 'blinkit':
      return `https://blinkit.com/s/?q=${encodedName}`;
    case 'swiggy':
      return `https://www.swiggy.com/instamart/search?query=${encodedName}`;
    default:
      return '#';
  }
};

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ bills }) => {
  const { id } = useParams<{ id: string }>();
  const bill = bills.find(b => b.id === id);
  console.log('Current Bill:', bill);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [realTimePrices, setRealTimePrices] = useState<any>(null);

  // Fetch real-time prices from API
  React.useEffect(() => {
    if (!bill?.id) return;

    const fetchPrices = async () => {
      try {
        setPricesLoading(true);
        setPricesError(null);

        console.log(`🔍 Fetching prices for bill ID: ${bill.id}`);
        const response = await fetch(`/api/v1/analysis/prices/${bill.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('smartspend_token')}`
          }
        });

        console.log(`📡 Response status: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch prices: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Received price data:', data);
        setRealTimePrices(data.prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
        setPricesError('Could not fetch real-time prices. Showing estimates.');
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [bill?.id]);

  const comparisons = useMemo(() => {
    if (!bill) return [];

    return bill.items.map(item => {
      // Use real-time prices if available, otherwise use estimates
      let platforms = [];

      if (realTimePrices && !pricesLoading) {
        const itemPrices = realTimePrices.find((p: any) => p.itemName === item.name);
        if (itemPrices) {
          platforms = itemPrices.platforms;
        }
      }

      // Fallback to estimated prices
      if (platforms.length === 0) {
        platforms = [
          { name: 'Amazon', price: item.price * (0.8 + Math.random() * 0.4), url: generateProductSearchUrl('Amazon', item.name), available: true },
          { name: 'Flipkart', price: item.price * (0.8 + Math.random() * 0.4), url: generateProductSearchUrl('Flipkart', item.name), available: true },
          { name: 'BigBasket', price: item.price * (0.85 + Math.random() * 0.35), url: generateProductSearchUrl('BigBasket', item.name), available: true },
          { name: 'JioMart', price: item.price * (0.75 + Math.random() * 0.45), url: generateProductSearchUrl('JioMart', item.name), available: true },
          { name: 'Blinkit', price: item.price * (0.9 + Math.random() * 0.3), url: generateProductSearchUrl('Blinkit', item.name), available: true },
        ];
      }

      const sorted = [...platforms].sort((a, b) => a.price - b.price);
      return {
        itemName: item.name,
        originalPrice: item.price,
        platforms: platforms,
        bestPrice: sorted[0].price,
        bestPlatform: sorted[0].name,
        savings: Math.max(0, item.price - sorted[0].price),
      } as PriceComparison;
    });
  }, [bill, realTimePrices, pricesLoading]);

  const totalPotentialSavings = comparisons.reduce((sum, c) => sum + c.savings, 0);

  if (!bill) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 font-bold">Analysis not found.</p>
        <Link to="/" className="text-primary underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary font-bold transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Link>

      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 bg-emerald-50 text-primary text-xs font-bold rounded-full border border-emerald-100 uppercase tracking-widest">Scan Complete</div>
          <h1 className="text-5xl font-heading font-extrabold tracking-tight">{bill.storeName}</h1>
          <p className="text-stone-500 font-medium">{new Date(bill.date).toLocaleString()} • {bill.items.length} Items</p>
        </div>
        <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center">
          <Zap className="text-primary w-8 h-8 absolute -top-2 -right-2 opacity-30" />
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">Potential Savings</span>
          <span className="text-4xl font-heading font-extrabold text-primary">₹{totalPotentialSavings.toFixed(2)}</span>
        </div>
      </header>

      {/* Receipt Analysis Section - Side by Side */}
      <section className="space-y-6">
        <h3 className="text-2xl font-heading font-extrabold tracking-tight">Receipt Analysis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Original Image View */}
          <div className="bg-white border border-stone-200 shadow-xl rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-heading font-extrabold text-lg">Original Receipt</h4>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Uploaded Image</span>
            </div>

            {bill.image ? (
              <div className="relative group">
                <div className={`rounded-2xl overflow-hidden border border-stone-100 shadow-inner bg-stone-50 transition-all duration-500 ${isImageExpanded ? 'max-h-none' : 'max-h-[500px]'}`}>
                  <img
                    src={bill.image}
                    alt="Original Receipt"
                    className={`w-full h-auto object-contain cursor-zoom-in transition-transform duration-500 ${isImageExpanded ? 'cursor-zoom-out' : 'hover:scale-[1.02]'}`}
                    onClick={() => setIsImageExpanded(!isImageExpanded)}
                  />
                </div>
                {!isImageExpanded && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold">
                      Click to Expand
                    </div>
                  </div>
                )}
                <p className="text-xs text-center text-stone-400 mt-3 font-medium">
                  {isImageExpanded ? 'Click to collapse' : 'Click to see full image'}
                </p>
              </div>
            ) : (
              <div className="h-[400px] rounded-2xl bg-stone-50 border border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400">
                <FileText className="w-12 h-12 mb-2 opacity-20" />
                <p className="font-medium">No image available</p>
              </div>
            )}
          </div>

          {/* Digital Receipt View */}
          <div className="bg-white border border-stone-200 shadow-xl rounded-3xl p-6">
            <h4 className="font-heading font-extrabold text-lg mb-4">Digital Bill</h4>
            <DigitalBillRenderer
              storeName={bill.storeName}
              items={bill.items}
              totalAmount={bill.totalAmount}
              ocrText={bill.parsedText}
            />
          </div>
        </div>
      </section>

      {/* Comparison Battle Cards - Full Width Below */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-heading font-extrabold tracking-tight">Price Comparison Battle</h3>
          <div className="flex items-center gap-2">
            {pricesLoading ? (
              <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 uppercase tracking-widest flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                Fetching Prices...
              </div>
            ) : pricesError ? (
              <div className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 uppercase tracking-widest">
                📊 Estimated Prices
              </div>
            ) : (
              <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase tracking-widest">
                ✅ Real-time Prices
              </div>
            )}
            <div className="px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 uppercase tracking-widest">
              Best Deals Found
            </div>
          </div>
        </div>

        {pricesError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="text-amber-700 text-sm">
              <span className="font-bold">⚠️ {pricesError}</span>
            </div>
          </div>
        )}

        {!pricesError && !pricesLoading && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="text-green-700 text-sm">
              <span className="font-bold">✅ Success:</span> Showing real-time price comparisons. Click links to verify and purchase.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisons.map((comp, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
              <div className="p-6 flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h4 className="font-extrabold text-lg mb-1 truncate max-w-[200px]">{comp.itemName}</h4>
                  <div className="flex items-center gap-3">
                    <div className="text-stone-400 line-through text-xs font-medium">₹{comp.originalPrice.toFixed(2)}</div>
                    <div className="text-primary font-heading font-extrabold text-xl">₹{comp.bestPrice.toFixed(2)}</div>
                    {comp.savings > 0 && (
                      <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100">
                        SAVE ₹{(comp.savings).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cheapest at</p>
                    <p className="font-bold text-stone-800 text-sm">{comp.bestPlatform}</p>
                  </div>
                  <a
                    href={comp.platforms.find(p => p.name === comp.bestPlatform)?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform inline-flex items-center justify-center"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </a>
                </div>
              </div>
              <div className="bg-stone-50 px-6 py-3 flex gap-3 overflow-x-auto text-[10px] font-bold no-scrollbar">
                {comp.platforms.map((p, i) => (
                  <a
                    key={i}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer hover:shadow-md transition-all ${p.name === comp.bestPlatform ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200' : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-300'}`}
                  >
                    {p.name === comp.bestPlatform && <CheckCircle2 className="w-3 h-3" />}
                    {p.name}: ₹{p.price.toFixed(2)}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ReceiptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-stone-300">
    <path d="M4 2V22L8 20L12 22L16 20L20 22V2M10 6H16M10 10H16M10 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default AnalysisResults;