import React, { useMemo, useState, useEffect } from 'react';
// Updated to use .tsx extension to resolve module not found error
import { Bill } from '../types.tsx';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../mockBackend.tsx';
import { Check, Plus, Trash2, ShoppingCart, RefreshCcw, Loader2 } from 'lucide-react';

interface ShoppingListProps {
  bills: Bill[];
}

const ShoppingList: React.FC<ShoppingListProps> = ({ bills }) => {
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const list = mockBackend.analysis.generateShoppingList(bills);
    setItems(list);
  }, [bills]);

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(item => item.id === id ? { ...item, suggestedQuantity: quantity } : item));
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems([
      { name: newItemName, category: 'Other', avgPrice: 0, checked: false, id: Math.random().toString(36).substr(2, 9), frequency: 1, suggestedQuantity: 1 },
      ...items
    ]);
    setNewItemName('');
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      const list = mockBackend.analysis.generateShoppingList(bills);
      setItems(list);
      setIsRegenerating(false);
    }, 800);
  };

  const budget = useMemo(() => {
    return items.filter(i => !i.checked).reduce((sum, i) => sum + ((i.avgPrice || 0) * (i.suggestedQuantity || 1)), 0);
  }, [items]);

  const handleGenerateCheckoutPlan = () => {
    const uncheckedItems = items.filter(i => !i.checked);

    if (uncheckedItems.length === 0) {
      alert('No items to checkout! Add items or uncheck existing ones.');
      return;
    }

    // Group items by category
    const groupedByCategory: Record<string, typeof uncheckedItems> = {};
    uncheckedItems.forEach(item => {
      if (!groupedByCategory[item.category]) {
        groupedByCategory[item.category] = [];
      }
      groupedByCategory[item.category].push(item);
    });

    // Create checkout plan text
    const planLines = [];
    planLines.push('═══════════════════════════════════════');
    planLines.push('     SMARTSPEND CHECKOUT PLAN');
    planLines.push('═══════════════════════════════════════');
    planLines.push(`Generated: ${new Date().toLocaleString()}`);
    planLines.push(`Total Items: ${uncheckedItems.length}`);
    planLines.push(`Estimated Budget: ₹${budget.toFixed(2)}`);
    planLines.push('');
    planLines.push('SHOPPING LIST BY CATEGORY:');
    planLines.push('───────────────────────────────────────');

    Object.entries(groupedByCategory).forEach(([category, categoryItems]) => {
      const categoryTotal = categoryItems.reduce((sum, item) => sum + ((item.avgPrice || 0) * (item.suggestedQuantity || 1)), 0);
      planLines.push('');
      planLines.push(`📦 ${category.toUpperCase()} (${categoryItems.length} items - ₹${categoryTotal.toFixed(2)})`);
      categoryItems.forEach((item, idx) => {
        const qty = item.suggestedQuantity || 1;
        const itemTotal = (item.avgPrice || 0) * qty;
        planLines.push(`  ${idx + 1}. ${item.name} × ${qty}${itemTotal > 0 ? ` - ₹${itemTotal.toFixed(2)}` : ''}`);
      });
    });

    planLines.push('');
    planLines.push('═══════════════════════════════════════');
    planLines.push('SHOPPING TIPS:');
    planLines.push('───────────────────────────────────────');
    planLines.push('✓ Check for combo offers');
    planLines.push('✓ Compare prices across brands');
    planLines.push('✓ Look for seasonal discounts');
    planLines.push('✓ Use digital payment for cashback');
    planLines.push('');
    planLines.push('Happy Shopping! 🛒');
    planLines.push('═══════════════════════════════════════');

    const planText = planLines.join('\n');

    // Create download
    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `checkout-plan-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also show alert with summary
    alert(`✅ Checkout Plan Generated!\n\n${uncheckedItems.length} items\nEstimated: ₹${budget.toFixed(2)}\n\nFile downloaded successfully!`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">Shopping List</h1>
          <p className="text-stone-500 font-medium">Frequency-based suggestions from your history.</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-2 text-stone-500 hover:text-primary font-bold transition-colors disabled:opacity-50"
        >
          {isRegenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
          Regenerate Suggestions
        </button>
      </header>

      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-stone-50 flex gap-4 bg-stone-50/50">
          <input
            type="text"
            placeholder="Add an item manually..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 bg-white border border-stone-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 rounded-2xl px-6 py-4 font-medium transition-all outline-none"
          />
          <button
            onClick={addItem}
            className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        <div className="p-8 space-y-4 max-h-[600px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-20 opacity-30 flex flex-col items-center">
              <ShoppingCart className="w-20 h-20 mb-4" />
              <p className="font-bold">No frequent items detected yet.</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className={`group flex items-center justify-between p-6 rounded-2xl transition-all duration-300 ${item.checked ? 'bg-stone-50 opacity-60' : 'bg-white border border-stone-100 hover:border-emerald-100 shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-primary border-primary text-white' : 'border-stone-200 group-hover:border-primary'}`}
                  >
                    {item.checked && <Check className="w-5 h-5" />}
                  </button>
                  <div>
                    <h4 className={`text-lg font-bold transition-all ${item.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>{item.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-stone-400 px-2 py-0.5 rounded-md">{item.category}</span>
                      <span className="text-xs font-bold text-stone-400">Bought {item.frequency}x</span>
                      {item.avgPrice > 0 && <span className="text-xs font-mono text-primary font-bold">est. ₹{(item.avgPrice).toFixed(2)}/unit</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
                    <button
                      onClick={() => updateQuantity(item.id, (item.suggestedQuantity || 1) - 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:border-primary hover:text-primary transition-all flex items-center justify-center font-bold text-lg"
                      disabled={item.checked}
                    >
                      −
                    </button>
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className={`text-lg font-bold ${item.checked ? 'text-stone-400' : 'text-stone-800'}`}>
                        {item.suggestedQuantity || 1}
                      </span>
                      <span className="text-[9px] text-stone-400 font-semibold uppercase">qty</span>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.id, (item.suggestedQuantity || 1) + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:border-primary hover:text-primary transition-all flex items-center justify-center font-bold text-lg"
                      disabled={item.checked}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-stone-900 text-white p-8 rounded-[2rem] flex items-center justify-between shadow-2xl">
        <div>
          <div className="text-stone-400 text-xs font-bold uppercase tracking-widest">Active Budget Projection</div>
          <div className="text-3xl font-heading font-extrabold text-primary">
            ₹{budget.toFixed(2)}
          </div>
        </div>
        <button
          onClick={handleGenerateCheckoutPlan}
          className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          Generate Checkout Plan
        </button>
      </div>
    </div>
  );
};

export default ShoppingList;