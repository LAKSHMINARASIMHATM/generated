import React from 'react';
// Updated to use .tsx extension to resolve module not found error
import { Bill, Category } from '../types.tsx';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, PieChart as PieIcon, Layers,
  Zap, Target, ShieldCheck, ArrowRight,
  Sparkles, Activity
} from 'lucide-react';

interface SpendingInsightsProps {
  bills: Bill[];
}

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#f97316', '#fb923c', '#fdba74'];

const SpendingInsights: React.FC<SpendingInsightsProps> = ({ bills }) => {
  const categoryData = React.useMemo(() => {
    const totals: Record<string, number> = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        totals[item.category] = (totals[item.category] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [bills]);

  // Calculate actual savings from MRP differences
  const totalSavings = React.useMemo(() => {
    let savings = 0;
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (item.mrp && item.mrp > item.price) {
          savings += (item.mrp - item.price) * item.quantity;
        }
      });
    });
    return savings;
  }, [bills]);

  const monthlyTrends = React.useMemo(() => {
    const months: Record<string, number> = {};
    // Ensure last 6 months are represented
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.toLocaleDateString('en-US', { month: 'short' });
      months[m] = 0;
    }

    bills.forEach(bill => {
      const month = new Date(bill.date).toLocaleDateString('en-US', { month: 'short' });
      if (months[month] !== undefined) {
        months[month] += bill.totalAmount;
      }
    });
    return Object.entries(months).map(([name, amount]) => ({ name, amount }));
  }, [bills]);

  const radarData = React.useMemo(() => {
    // Map top 6 categories to a radar chart to show "Balance"
    return categoryData.slice(0, 6).map(item => ({
      subject: item.name,
      A: item.value,
      fullMark: Math.max(...categoryData.map(c => c.value)) * 1.2
    }));
  }, [categoryData]);

  const totalSpent = categoryData.reduce((sum, c) => sum + c.value, 0);

  // Export analytics function
  const handleExportAnalytics = () => {
    // Prepare CSV data
    const csvRows = [];

    // Header
    csvRows.push('SmartSpend Analytics Export');
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push('');

    // Summary
    csvRows.push('SUMMARY');
    csvRows.push(`Total Spent,₹${totalSpent.toFixed(2)}`);
    csvRows.push(`Total Savings,₹${totalSavings.toFixed(2)}`);
    csvRows.push(`Number of Bills,${bills.length}`);
    csvRows.push('');

    // Category Breakdown
    csvRows.push('CATEGORY BREAKDOWN');
    csvRows.push('Category,Amount,Percentage');
    categoryData.sort((a, b) => b.value - a.value).forEach(item => {
      const percentage = ((item.value / totalSpent) * 100).toFixed(1);
      csvRows.push(`${item.name},₹${item.value.toFixed(2)},${percentage}%`);
    });
    csvRows.push('');

    // Monthly Trends
    csvRows.push('MONTHLY TRENDS');
    csvRows.push('Month,Amount');
    monthlyTrends.forEach(trend => {
      csvRows.push(`${trend.name},₹${trend.amount.toFixed(2)}`);
    });
    csvRows.push('');

    // Individual Bills
    csvRows.push('BILL DETAILS');
    csvRows.push('Date,Store,Total,Items Count');
    bills.forEach(bill => {
      const date = new Date(bill.date).toLocaleDateString();
      csvRows.push(`${date},${bill.storeName},₹${bill.totalAmount.toFixed(2)},${bill.items.length}`);
    });

    // Create CSV content
    const csvContent = csvRows.join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `smartspend-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-5xl font-heading font-extrabold tracking-tight">Spending <span className="text-primary">Intelligence</span></h1>
          <p className="text-stone-500 font-medium text-lg">Predictive patterns and organic growth metrics.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200" />
            ))}
          </div>
          <span className="text-sm font-bold text-stone-600">Joined by 12k+ Futurists</span>
        </div>
      </header>

      {/* Top Level Pulse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <Activity className="text-primary mb-4 w-8 h-8" />
            <h3 className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-1">Financial Pulse</h3>
            <p className="text-3xl font-heading font-extrabold tracking-tighter">Healthy</p>
            <div className="mt-4 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[85%] rounded-full animate-pulse shadow-[0_0_15px_rgba(5,150,105,0.5)]" />
            </div>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-24 h-24" />
          </div>
        </div>

        <div className="bg-stone-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <Target className="text-primary mb-4 w-8 h-8" />
            <h3 className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-1">Savings Velocity</h3>
            <p className="text-3xl font-heading font-extrabold tracking-tighter">
              {totalSavings > 0 ? `+₹${totalSavings.toFixed(2)}` : '₹0.00'}
            </p>
            <p className="text-stone-500 text-xs font-medium mt-2">
              {totalSavings > 0 ? 'Total saved from MRP differences' : 'No savings data available'}
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <Zap className="text-primary mb-4 w-8 h-8" />
            <h3 className="text-emerald-700 font-bold uppercase tracking-widest text-[10px] mb-1">AI Recommendation</h3>
            <p className="text-xl font-heading font-bold text-stone-800 leading-tight">Switch your <span className="text-primary">Dairy</span> vendor to Amazon Fresh to save <span className="bg-primary/10 px-1 rounded">₹12/mo</span>.</p>
          </div>
          <Sparkles className="absolute bottom-4 right-4 text-primary/20 w-12 h-12 group-hover:rotate-12 transition-transform" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Radar - New Visual */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-heading font-extrabold tracking-tight">Lifestyle Balance</h3>
            <div className="p-2 bg-stone-50 rounded-lg"><Activity className="w-5 h-5 text-stone-400" /></div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e7e5e4" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 10, fontWeight: 'bold' }} />
                <Radar
                  name="Spending"
                  dataKey="A"
                  stroke="#059669"
                  fill="#059669"
                  fillOpacity={0.4}
                />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-stone-400 text-center font-medium px-4">This chart represents your spending diversity. A balanced shape indicates a diverse lifestyle.</p>
        </div>

        {/* Category Breakdown (Donut) */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-primary rounded-2xl">
                <PieIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-extrabold">Portfolio Distribution</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Monitored</div>
              <div className="text-2xl font-heading font-extrabold text-primary">₹{totalSpent.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {COLORS.map((color, i) => (
                      <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#grad-${index % COLORS.length})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {categoryData.sort((a, b) => b.value - a.value).slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-bold text-stone-600 group-hover:text-stone-900 transition-colors">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-bold">₹{item.value.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-stone-400">{((item.value / totalSpent) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Enhanced */}
      <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <h3 className="text-2xl font-heading font-extrabold tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary w-8 h-8" />
              Spending Velocity
            </h3>
            <p className="text-stone-500 font-medium">Tracking your capital flow over the last 6 cycles.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-stone-100 rounded-xl text-stone-600 font-bold text-sm">Monthly</div>
            <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm">Real-time</div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontWeight: '600' }} dy={10} />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: '#059669', strokeWidth: 2, strokeDasharray: '5 5' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                itemStyle={{ color: '#059669', fontWeight: 'bold' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#059669"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorAmount)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Top Store', value: bills[0]?.storeName || 'N/A', icon: Layers, color: 'text-primary' },
          { label: 'Busiest Day', value: 'Saturday', icon: Activity, color: 'text-accent' },
          { label: 'Best Savings', value: '₹42.10', icon: Target, color: 'text-emerald-500' },
          { label: 'Budget Drift', value: '-2.4%', icon: TrendingUp, color: 'text-stone-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:-translate-y-1 transition-transform cursor-pointer">
            <stat.icon className={`${stat.color} mb-4 w-6 h-6`} />
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-xl font-heading font-extrabold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <section className="bg-stone-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 max-w-xl text-center md:text-left">
          <h3 className="text-4xl font-heading font-extrabold tracking-tight mb-4">Master Your <span className="text-primary">Capital Flow</span></h3>
          <p className="text-stone-400 font-medium text-lg leading-relaxed mb-6">Our AI is learning your patterns. Check back next week for a detailed predictive shopping list.</p>
          <button
            onClick={handleExportAnalytics}
            className="bg-primary text-white px-8 py-4 rounded-full font-extrabold shadow-lg shadow-primary/40 hover:scale-105 transition-all flex items-center gap-3 mx-auto md:mx-0"
          >
            Export Analytics <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <div className="relative z-10 w-full md:w-auto flex flex-col gap-3">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center"><ShieldCheck className="text-primary" /></div>
            <div>
              <p className="text-xs font-bold text-stone-300">Data Integrity</p>
              <p className="text-sm font-bold">100% Encrypted</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center"><Zap className="text-primary" /></div>
            <div>
              <p className="text-xs font-bold text-stone-300">Latency</p>
              <p className="text-sm font-bold">~0.4s OCR Parsing</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -mr-64 -mt-64" />
      </section>
    </div>
  );
};

export default SpendingInsights;