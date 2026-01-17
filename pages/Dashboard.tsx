import React from 'react';
// Updated to use .tsx extension to resolve module not found error
import { Bill } from '../types.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Receipt, PlusCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  bills: Bill[];
}

const Dashboard: React.FC<DashboardProps> = ({ bills }) => {
  const navigate = useNavigate();
  const totalSpent = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const avgBill = bills.length ? totalSpent / bills.length : 0;

  const chartData = bills.slice(0, 7).reverse().map(b => ({
    date: new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: b.totalAmount
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">Financial Overview</h1>
          <p className="text-stone-500 font-medium">Monitoring your spending growth with AI precision.</p>
        </div>
        <div className="flex items-center gap-2 text-primary font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <TrendingUp className="w-5 h-5" />
          <span>+12.4% smart savings</span>
        </div>
      </header>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 bg-white p-8 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-4">Cumulative Spending</h3>
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-5xl font-heading font-extrabold tracking-tighter">₹{totalSpent.toFixed(2)}</span>
              <span className="text-emerald-500 font-bold flex items-center text-sm">
                <ArrowDownRight className="w-4 h-4" /> healthy trend
              </span>
            </div>
            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#059669', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-100/50 transition-colors" />
        </div>

        <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <div className="bg-primary text-white p-8 rounded-3xl shadow-xl shadow-primary/20 relative overflow-hidden">
            <h3 className="font-bold uppercase tracking-widest text-xs opacity-70 mb-2">Average Ticket</h3>
            <span className="text-3xl font-heading font-extrabold tracking-tighter block mb-4">₹{avgBill.toFixed(2)}</span>
            <div className="w-16 h-16 bg-white/10 rounded-full absolute -bottom-4 -right-4 blur-xl" />
          </div>
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex-1 flex flex-col justify-center">
            <h3 className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-2">Total Insights Generated</h3>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-heading font-extrabold tracking-tighter">{bills.length}</span>
              <div className="p-3 bg-stone-100 rounded-2xl text-stone-600">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bills Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold tracking-tight">Recent Activity</h2>
          <button
            onClick={() => navigate('/bills')}
            className="text-primary font-bold hover:underline"
          >
            View History
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-3xl bg-white/50">
              <Receipt className="w-12 h-12 text-stone-300 mb-4" />
              <p className="text-stone-400 font-medium text-center mb-6">No bills recorded. Your journey starts with the first scan.</p>
              <Link to="/upload">
                <button className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                  <PlusCircle className="w-5 h-5" /> Scan Now
                </button>
              </Link>
            </div>
          ) : (
            bills.slice(0, 6).map(bill => (
              <div
                key={bill.id}
                onClick={() => navigate(`/analysis/${bill.id}`)}
                className="cursor-pointer group bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight truncate max-w-[120px] md:max-w-none">{bill.storeName}</h4>
                    <p className="text-stone-400 text-sm font-medium">{new Date(bill.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-primary group-hover:scale-110 transition-transform">₹{bill.totalAmount.toFixed(2)}</div>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-stone-300 group-hover:text-stone-500" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;