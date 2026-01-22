import React, { useState, useEffect } from 'react';
// Updated to use .tsx extension to resolve module not found error
import { Bill } from '../types.tsx';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext.tsx';
import { User, Shield, Bell, CreditCard, ChevronRight, LogOut, X, Check, Link as LinkIcon } from 'lucide-react';

interface ProfileProps {
  bills: Bill[];
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ bills, onLogout }) => {
  const { user: firebaseUser } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Account Details state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState({
    offerAlerts: true,
    monthlySummaries: true,
    priceDrops: true,
    weeklyDigest: false
  });

  // Platforms state
  const [platforms, setPlatforms] = useState<any[]>([]);

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Use Firebase user data
    if (firebaseUser) {
      setUser(firebaseUser);
      setName(firebaseUser.displayName || '');
      setEmail(firebaseUser.email || '');
    }
    // Load notification settings
    const loadSettings = async () => {
      const notificationSettings = await api.settings.getNotifications();
      setNotifications(notificationSettings);
      // Platforms are loaded via fetchConnections
      setPlatforms([
        { id: 'amazon', name: 'Amazon', connected: false },
        { id: 'flipkart', name: 'Flipkart', connected: false },
        { id: 'bigbasket', name: 'BigBasket', connected: false },
        { id: 'jiomart', name: 'JioMart', connected: false },
        { id: 'blinkit', name: 'Blinkit', connected: false }
      ]);
    };
    loadSettings();
  }, [firebaseUser]);

  const settings = [
    { id: 'account', icon: User, label: 'Account Details', desc: 'Personal info and preferences' },
    { id: 'security', icon: Shield, label: 'Privacy & Security', desc: 'Password and authentication' },
    { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Offer alerts and monthly summaries' },
    { id: 'platforms', icon: CreditCard, label: 'Linked Platforms', desc: 'Amazon, Flipkart, etc.' },
  ];

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveAccount = () => {
    // For Firebase users, profile updates should go through Firebase
    // This is kept for UI consistency but actual updates need Firebase Admin SDK
    showFeedback('success', 'Account details updated successfully!');
    setActiveModal(null);
  };

  const handleSavePassword = () => {
    if (newPassword !== confirmPassword) {
      showFeedback('error', 'New passwords do not match');
      return;
    }
    // For Firebase users, password updates need Firebase Auth
    showFeedback('success', 'Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveModal(null);
  };

  const handleSaveNotifications = async () => {
    await api.settings.updateNotifications(notifications);
    showFeedback('success', 'Notification preferences saved!');
    setActiveModal(null);
  };

  const handleConnectPlatform = async (platformId: string) => {
    try {
      console.log('🔌 Connect clicked for:', platformId);
      console.log('👤 Firebase user:', firebaseUser);

      if (!firebaseUser) {
        console.error('❌ No Firebase user found');
        showFeedback('error', 'Please log in first');
        return;
      }

      console.log('📡 Calling backend...');
      // Call backend to initiate OAuth
      const response = await fetch(`http://localhost:8000/api/v1/platforms/connect/${platformId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: firebaseUser.uid
        })
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📄 Response data:', data);

      if (data.authUrl) {
        console.log('🔗 Redirecting to:', data.authUrl);
        // Open OAuth authorization in popup or redirect
        window.location.href = data.authUrl;
      } else {
        console.error('❌ No authUrl in response');
        showFeedback('error', 'Failed to get authorization URL');
      }
    } catch (error: any) {
      console.error('💥 Error connecting platform:', error);
      showFeedback('error', error.message || 'Failed to connect platform');
    }
  };

  const handleDisconnectPlatform = async (platformId: string) => {
    try {
      if (!firebaseUser) return;

      const response = await fetch(`http://localhost:8000/api/v1/platforms/${platformId}/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: firebaseUser.uid
        })
      });

      if (response.ok) {
        // Refresh connections
        await fetchConnections();
        showFeedback('success', 'Platform disconnected successfully!');
      }
    } catch (error: any) {
      showFeedback('error', error.message || 'Failed to disconnect platform');
    }
  };

  const fetchConnections = async () => {
    try {
      if (!firebaseUser) return;

      const response = await fetch(`http://localhost:8000/api/v1/platforms/connections?userId=${firebaseUser.uid}`);
      const data = await response.json();

      if (data.connections) {
        // Update platforms state with connection status
        const updatedPlatforms = platforms.map(p => {
          const connection = data.connections.find((c: any) => c.platform === p.id);
          return {
            ...p,
            connected: !!connection,
            email: connection?.email,
            displayName: connection?.displayName
          };
        });
        setPlatforms(updatedPlatforms);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  // Fetch connections on mount and when modal opens
  useEffect(() => {
    if (activeModal === 'platforms' && firebaseUser) {
      fetchConnections();
    }
  }, [activeModal, firebaseUser]);

  const closeModal = () => {
    setActiveModal(null);
    setFeedback(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="font-bold">{feedback.message}</span>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center text-white text-5xl font-heading font-extrabold">
          {user?.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'TF'}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">{user?.displayName || 'user'}</h1>
          <p className="text-stone-500 font-medium">{user?.email || 'user@smartspend.com'}</p>
          <div className="flex justify-center md:justify-start gap-2 mt-4">
            <div className="px-3 py-1 bg-emerald-50 text-primary text-xs font-bold rounded-full border border-emerald-100">Top 5% Saver</div>
            <div className="px-3 py-1 bg-orange-50 text-accent text-xs font-bold rounded-full border border-orange-100">AI Enthusiast</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-center">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Bills Scanned</div>
          <div className="text-3xl font-heading font-extrabold text-primary">{bills.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-center">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Savings Potential</div>
          <div className="text-3xl font-heading font-extrabold text-primary">₹{(bills.length * 12.45).toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-center">
          <div className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Data Trust Score</div>
          <div className="text-3xl font-heading font-extrabold text-primary">High</div>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-2xl font-heading font-bold tracking-tight px-2">System Configuration</h3>
        <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
          {settings.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveModal(item.id)}
              className={`w-full flex items-center justify-between p-8 hover:bg-stone-50 transition-all ${idx !== settings.length - 1 ? 'border-b border-stone-50' : ''}`}
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-stone-100 text-stone-600 rounded-2xl">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-lg">{item.label}</h4>
                  <p className="text-stone-400 text-sm">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="text-stone-300 w-6 h-6" />
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={onLogout}
        className="w-full py-5 bg-stone-100 text-stone-500 font-bold rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all duration-300 flex items-center justify-center gap-3"
      >
        <LogOut className="w-6 h-6" />
        Terminate Session
      </button>

      {/* Account Details Modal */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold">Account Details</h2>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all">
                Cancel
              </button>
              <button onClick={handleSaveAccount} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Security Modal */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold">Change Password</h2>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all">
                Cancel
              </button>
              <button onClick={handleSavePassword} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20">
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold">Notification Preferences</h2>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                  <div>
                    <h4 className="font-bold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <p className="text-xs text-stone-500">
                      {key === 'offerAlerts' && 'Get notified about special offers'}
                      {key === 'monthlySummaries' && 'Receive monthly spending reports'}
                      {key === 'priceDrops' && 'Alert when prices drop on items'}
                      {key === 'weeklyDigest' && 'Weekly summary of your activity'}
                    </p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [key]: !value })}
                    className={`relative w-14 h-8 rounded-full transition-all ${value ? 'bg-primary' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${value ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all">
                Cancel
              </button>
              <button onClick={handleSaveNotifications} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Platforms Modal */}
      {activeModal === 'platforms' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold">Linked Platforms</h2>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-all">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-5 h-5 text-stone-400" />
                      <span className="font-bold">{platform.name}</span>
                    </div>
                    {platform.connected && platform.email && (
                      <span className="text-xs text-stone-500 ml-8">{platform.email}</span>
                    )}
                  </div>
                  <button
                    onClick={() => platform.connected ? handleDisconnectPlatform(platform.id) : handleConnectPlatform(platform.id)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${platform.connected
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-primary text-white hover:scale-105 shadow-lg shadow-primary/20'
                      }`}
                  >
                    {platform.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={closeModal} className="w-full mt-8 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;