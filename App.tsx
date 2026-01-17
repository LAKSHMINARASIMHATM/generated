

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, BarChart3, ShoppingCart, User, PlusCircle, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard.tsx';
import BillUpload from './pages/BillUpload.tsx';
import AnalysisResults from './pages/AnalysisResults.tsx';
import SpendingInsights from './pages/SpendingInsights.tsx';
import ShoppingList from './pages/ShoppingList.tsx';
import Profile from './pages/Profile.tsx';
import Login from './pages/Login.tsx';
import OAuthAuthorize from './pages/OAuthAuthorize.tsx';
import { mockBackend } from './mockBackend.tsx';
import { Bill } from './types.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';


const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Receipt, label: 'All Bills', path: '/bills' },
    { icon: BarChart3, label: 'Insights', path: '/insights' },
    { icon: ShoppingCart, label: 'Shopping List', path: '/shopping-list' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 md:w-64 glass border-r border-stone-200 z-50 flex flex-col items-center md:items-start p-4 md:p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Receipt className="text-white w-6 h-6" />
        </div>
        <span className="hidden md:block font-heading font-extrabold text-xl tracking-tight text-stone-800">SmartSpend<span className="text-primary">AI</span></span>
      </div>
      <nav className="flex-1 w-full space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${location.pathname === item.path
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-stone-500 hover:bg-stone-100 hover:text-primary'
              }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="hidden md:block font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="w-full space-y-4">
        <Link to="/upload" className="w-full block">
          <button className="flex items-center justify-center gap-3 w-full bg-primary text-white py-4 rounded-2xl md:rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <PlusCircle className="w-6 h-6" />
            <span className="hidden md:block">New Bill</span>
          </button>
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-3 w-full text-stone-400 hover:text-red-500 py-4 rounded-2xl font-bold transition-all"
        >
          <LogOut className="w-6 h-6" />
          <span className="hidden md:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const AppContent: React.FC = () => {
  const { user: firebaseUser, signOut } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (firebaseUser) {
      setBills(mockBackend.bills.getAll());
    }
  }, [firebaseUser]);

  const handleLogout = async () => {
    await signOut();
    mockBackend.auth.logout();
    navigate('/');
  };

  const addBill = (bill: Bill) => {
    const savedBill = mockBackend.bills.save(bill);
    setBills(prev => [savedBill, ...prev]);
  };

  if (!firebaseUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background font-body text-stone-800">
      <Sidebar onLogout={handleLogout} />
      <main className="ml-20 md:ml-64 min-h-screen p-6 md:p-10">
        <Routes>
          <Route path="/" element={<Dashboard bills={bills} />} />
          <Route path="/upload" element={<BillUpload onComplete={addBill} />} />
          <Route path="/bills" element={<Dashboard bills={bills} />} />
          <Route path="/insights" element={<SpendingInsights bills={bills} />} />
          <Route path="/shopping-list" element={<ShoppingList bills={bills} />} />
          <Route path="/profile" element={<Profile bills={bills} onLogout={handleLogout} />} />
          <Route path="/analysis/:id" element={<AnalysisResults bills={bills} />} />
          <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
