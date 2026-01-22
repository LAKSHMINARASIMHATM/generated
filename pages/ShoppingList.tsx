import React, { useMemo, useState, useEffect } from 'react';
import { Bill } from '../types.tsx';
import { api } from '../api';
import { Check, Plus, Trash2, ShoppingCart, RefreshCcw, Loader2, Download, IndianRupee, AlertTriangle, Save, Wand2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ShoppingListProps {
  bills: Bill[];
}

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  avgPrice: number;
  frequency: number;
  suggestedQuantity: number;
  checked: boolean;
}

// Estimated Indian Market Prices (in INR)
const INDIAN_ESSENTIALS_WITH_PRICES = {
  'Staples': [
    { name: 'Sunflower Oil (1L)', price: 150 },
    { name: 'Salt (1kg)', price: 25 },
    { name: 'Sugar (1kg)', price: 45 },
    { name: 'Mustard Oil (1L)', price: 160 },
    { name: 'Tea Powder (250g)', price: 120 },
    { name: 'Coffee Powder (50g)', price: 100 },
    { name: 'Tamarind (250g)', price: 60 }
  ],
  'Grains & Flours': [
    { name: 'Wheat Flour (Atta) (5kg)', price: 220 },
    { name: 'Sona Masoori Rice (5kg)', price: 300 },
    { name: 'Basmati Rice (1kg)', price: 120 },
    { name: 'Maida (1kg)', price: 40 },
    { name: 'Rava (Sooji) (500g)', price: 35 },
    { name: 'Besan (500g)', price: 50 }
  ],
  'Dal & Pulses': [
    { name: 'Toor Dal (1kg)', price: 140 },
    { name: 'Moong Dal (1kg)', price: 120 },
    { name: 'Chana Dal (1kg)', price: 90 },
    { name: 'Urad Dal (1kg)', price: 130 },
    { name: 'Masoor Dal (1kg)', price: 110 },
    { name: 'Kabuli Chana (1kg)', price: 100 },
    { name: 'Rajma (1kg)', price: 120 }
  ],
  'Dairy': [
    { name: 'Milk (1L)', price: 60 },
    { name: 'Curd/Yogurt (500g)', price: 40 },
    { name: 'Paneer (200g)', price: 90 },
    { name: 'Ghee (500ml)', price: 350 },
    { name: 'Butter (100g)', price: 60 }
  ],
  'Vegetables': [
    { name: 'Onions (1kg)', price: 40 },
    { name: 'Potatoes (1kg)', price: 30 },
    { name: 'Tomatoes (1kg)', price: 50 },
    { name: 'Ginger (250g)', price: 30 },
    { name: 'Garlic (250g)', price: 40 },
    { name: 'Green Chillies (100g)', price: 10 },
    { name: 'Coriander Leaves', price: 15 },
    { name: 'Curry Leaves', price: 5 }
  ],
  'Spices': [
    { name: 'Turmeric Powder (100g)', price: 35 },
    { name: 'Red Chilli Powder (100g)', price: 45 },
    { name: 'Coriander Powder (100g)', price: 40 },
    { name: 'Cumin Seeds (100g)', price: 60 },
    { name: 'Mustard Seeds (100g)', price: 20 },
    { name: 'Garam Masala (50g)', price: 40 },
    { name: 'Cardamom (50g)', price: 150 },
    { name: 'Cloves (50g)', price: 80 }
  ]
};

const ShoppingList: React.FC<ShoppingListProps> = ({ bills }) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const saved = localStorage.getItem('shoppingListBudget');
    return saved ? parseFloat(saved) : 2000;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budgetLimit.toString());

  useEffect(() => {
    const loadList = async () => {
      try {
        const data = await api.analysis.getShoppingList();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (error) {
        console.error('Failed to load shopping list:', error);
        setItems([]);
      }
    };
    loadList();
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('shoppingListBudget', budgetLimit.toString());
  }, [budgetLimit]);

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

  const addItem = (name: string, price: number = 0, qty: number = 1, category: string = 'Other') => {
    if (!name.trim()) return;
    setItems(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        category: category,
        avgPrice: price,
        frequency: 1,
        suggestedQuantity: qty,
        checked: false
      },
      ...prev
    ]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
  };

  const handleManualAdd = () => {
    addItem(newItemName, parseFloat(newItemPrice) || 0, parseInt(newItemQty) || 1);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const data = await api.analysis.getShoppingList();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error('Failed to regenerate shopping list:', error);
    }
    setIsRegenerating(false);
  };

  const handleAutoFillBudget = () => {
    if (items.length > 0) {
      if (!window.confirm('This will replace your current list. Continue?')) return;
    }

    let currentTotal = 0;
    const newItems: ShoppingItem[] = [];
    const categories = ['Staples', 'Grains & Flours', 'Dairy', 'Vegetables', 'Dal & Pulses', 'Spices'];

    // Create a copy of essentials to track what we've added
    const availableEssentials = JSON.parse(JSON.stringify(INDIAN_ESSENTIALS_WITH_PRICES));

    // Round-robin selection from categories
    let categoryIndex = 0;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    while (currentTotal < budgetLimit && attempts < maxAttempts) {
      const category = categories[categoryIndex];
      const categoryItems = availableEssentials[category];

      if (categoryItems && categoryItems.length > 0) {
        // Take the first item from the category
        const item = categoryItems.shift(); // Remove used item

        if (currentTotal + item.price <= budgetLimit) {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            category: category,
            avgPrice: item.price,
            frequency: 1,
            suggestedQuantity: 1,
            checked: false
          });
          currentTotal += item.price;
        }
      }

      // Move to next category
      categoryIndex = (categoryIndex + 1) % categories.length;

      // Check if we have any items left in any category that fit the remaining budget
      const minPrice = Math.min(...Object.values(availableEssentials).flat().map((i: any) => i.price));
      if (currentTotal + minPrice > budgetLimit) break;

      attempts++;
    }

    setItems(newItems);
  };

  const saveBudget = () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val > 0) {
      setBudgetLimit(val);
      setIsEditingBudget(false);
    }
  };

  const totalCost = useMemo(() => {
    return items.filter(i => !i.checked).reduce((sum, i) => sum + ((i.avgPrice || 0) * (i.suggestedQuantity || 1)), 0);
  }, [items]);

  const budgetProgress = Math.min((totalCost / budgetLimit) * 100, 100);
  const isOverBudget = totalCost > budgetLimit;
  const isNearBudget = totalCost > budgetLimit * 0.9 && !isOverBudget;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Shopping List", 14, 22);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Budget: Rs. ${budgetLimit.toFixed(2)}`, 14, 35);
    doc.text(`Total Estimated Cost: Rs. ${totalCost.toFixed(2)}`, 14, 40);

    const tableData = items.filter(i => !i.checked).map(item => [
      item.name,
      item.category,
      item.suggestedQuantity.toString(),
      `Rs. ${(item.avgPrice || 0).toFixed(2)}`,
      `Rs. ${(item.avgPrice * item.suggestedQuantity).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Item', 'Category', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // Emerald-500
    });

    if (isOverBudget) {
      doc.setTextColor(220, 38, 38);
      doc.text(`WARNING: Budget exceeded by Rs. ${(totalCost - budgetLimit).toFixed(2)}`, 14, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(`shopping-list-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadCSV = () => {
    const headers = ['Item,Category,Quantity,Unit Price,Total Price'];
    const rows = items.filter(i => !i.checked).map(item =>
      `"${item.name}","${item.category}",${item.suggestedQuantity},${item.avgPrice || 0},${(item.avgPrice || 0) * item.suggestedQuantity}`
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shopping-list-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Budget Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-heading font-extrabold tracking-tight text-stone-800">Shopping List</h1>
              <p className="text-stone-500 font-medium mt-1">Plan your purchases and track your budget.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 hover:text-primary transition-all shadow-sm"
              >
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                <span className="hidden sm:inline">Regenerate</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 hover:text-primary transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </header>

          {/* Budget Card */}
          <div className="bg-white rounded-[2rem] border border-stone-100 shadow-xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <IndianRupee className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-stone-500 font-bold uppercase tracking-widest text-sm">Total Estimated Cost</h3>
                  <div className={`text-4xl font-heading font-extrabold mt-1 ${isOverBudget ? 'text-red-500' : 'text-stone-800'}`}>
                    ₹{totalCost.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-stone-500 font-bold uppercase tracking-widest text-sm mb-1">Budget Limit</h3>
                  {isEditingBudget ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tempBudget}
                        onChange={(e) => setTempBudget(e.target.value)}
                        className="w-24 px-2 py-1 border border-stone-300 rounded-lg font-bold text-right"
                        autoFocus
                      />
                      <button onClick={saveBudget} className="p-1.5 bg-primary text-white rounded-lg"><Check className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div
                      onClick={() => { setTempBudget(budgetLimit.toString()); setIsEditingBudget(true); }}
                      className="text-2xl font-bold text-stone-400 cursor-pointer hover:text-primary transition-colors flex items-center justify-end gap-2"
                    >
                      ₹{budgetLimit.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-stone-400">
                  <span>0%</span>
                  <span className={isOverBudget ? 'text-red-500' : isNearBudget ? 'text-orange-500' : ''}>
                    {Math.round((totalCost / budgetLimit) * 100)}% Used
                  </span>
                </div>
                <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-orange-500' : 'bg-primary'}`}
                    style={{ width: `${budgetProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm font-bold text-stone-500">
                    {isOverBudget ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                        Over budget by ₹{(totalCost - budgetLimit).toFixed(2)}
                      </span>
                    ) : (
                      <span>Remaining: <span className="text-emerald-600">₹{(budgetLimit - totalCost).toFixed(2)}</span></span>
                    )}
                  </div>
                  <button
                    onClick={handleAutoFillBudget}
                    className="flex items-center gap-2 text-xs font-bold text-primary bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    Auto-fill for Budget
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="bg-white rounded-[2rem] border border-stone-100 shadow-lg p-4 flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-[2] w-full bg-stone-50 border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 font-medium outline-none"
            />
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="number"
                placeholder="Price"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-24 bg-stone-50 border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 font-medium outline-none"
              />
              <input
                type="number"
                placeholder="Qty"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-20 bg-stone-50 border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 font-medium outline-none"
              />
            </div>
            <button
              onClick={handleManualAdd}
              className="w-full md:w-auto bg-stone-800 text-white p-3 rounded-xl hover:bg-stone-900 transition-all flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Item List */}
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-20 opacity-30 flex flex-col items-center bg-white rounded-[2rem] border border-stone-100 border-dashed">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="font-bold text-lg">Your list is empty.</p>
                <p className="text-sm">Add items or use suggestions.</p>
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl transition-all duration-300 ${item.checked ? 'bg-stone-50 opacity-60' : 'bg-white border border-stone-100 hover:border-emerald-100 shadow-sm hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-primary border-primary text-white' : 'border-stone-200 group-hover:border-primary'}`}
                    >
                      {item.checked && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4 className={`font-bold text-lg leading-tight ${item.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{item.category}</span>
                        {item.avgPrice > 0 && <span className="text-xs font-mono text-stone-400">₹{item.avgPrice}/unit</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-stone-50 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, item.suggestedQuantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-all font-bold text-stone-500">-</button>
                        <span className="w-8 text-center font-bold text-stone-800">{item.suggestedQuantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.suggestedQuantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-all font-bold text-stone-500">+</button>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-sm font-bold text-stone-800">₹{((item.avgPrice || 0) * item.suggestedQuantity).toFixed(2)}</div>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-stone-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Suggestions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-stone-100 shadow-xl p-6 sticky top-6">
            <h3 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg"><ShoppingCart className="w-5 h-5" /></span>
              Quick Add Essentials
            </h3>

            <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(INDIAN_ESSENTIALS_WITH_PRICES).map(([category, suggestions]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(suggestion => (
                      <button
                        key={suggestion.name}
                        onClick={() => addItem(suggestion.name, suggestion.price, 1, category)}
                        className="text-sm font-medium px-3 py-1.5 bg-stone-50 hover:bg-orange-50 text-stone-600 hover:text-orange-600 border border-stone-100 hover:border-orange-200 rounded-lg transition-all text-left flex justify-between items-center gap-2"
                      >
                        <span>+ {suggestion.name}</span>
                        <span className="text-xs text-stone-400">₹{suggestion.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;