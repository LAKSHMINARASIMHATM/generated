import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const OAuthAuthorize: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [step, setStep] = useState<'login' | 'consent'>('login');
    const [authorizing, setAuthorizing] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const platform = searchParams.get('platform');
    const state = searchParams.get('state');
    const userId = searchParams.get('user_id');
    const redirectUri = searchParams.get('redirect_uri');

    const platformNames: Record<string, string> = {
        amazon: 'Amazon',
        flipkart: 'Flipkart',
        bigbasket: 'BigBasket',
        jiomart: 'JioMart',
        blinkit: 'Blinkit'
    };

    const platformColors: Record<string, string> = {
        amazon: '#FF9900',
        flipkart: '#2874F0',
        bigbasket: '#84C225',
        jiomart: '#0066CC',
        blinkit: '#F8CB46'
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate login API call
        setTimeout(() => {
            setIsLoading(false);
            setStep('consent');
        }, 1000);
    };

    const handleAuthorize = () => {
        setAuthorizing(true);

        // Simulate authorization delay
        setTimeout(() => {
            // Generate mock authorization code
            const code = `auth_${Math.random().toString(36).substring(7)}`;

            // Redirect to callback with code
            const callbackUrl = `${redirectUri}?code=${code}&state=${state}&platform=${platform}&user_id=${userId}&email=${email || `user@${platform}.com`}`;
            window.location.href = callbackUrl;
        }, 1500);
    };

    const handleCancel = () => {
        navigate('/profile');
    };

    if (!platform || !state || !userId) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">Invalid Request</h2>
                    <p className="text-stone-600 mb-6">Missing required parameters for authorization.</p>
                    <button
                        onClick={() => navigate('/profile')}
                        className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all"
                    >
                        Return to Profile
                    </button>
                </div>
            </div>
        );
    }

    const platformName = platformNames[platform] || platform;
    const platformColor = platformColors[platform] || '#000000';

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in duration-300">
                {/* Platform Header */}
                <div className="text-center mb-8">
                    <div
                        className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg"
                        style={{ backgroundColor: platformColor + '20' }}
                    >
                        {platform === 'amazon' && '📦'}
                        {platform === 'flipkart' && '🛒'}
                        {platform === 'bigbasket' && '🥬'}
                        {platform === 'jiomart' && '🏪'}
                        {platform === 'blinkit' && '⚡'}
                    </div>
                    <h1 className="text-3xl font-heading font-extrabold text-stone-900 mb-2">
                        {step === 'login' ? `Sign in to ${platformName}` : `Connect to ${platformName}`}
                    </h1>
                    <p className="text-stone-600">
                        {step === 'login'
                            ? `Enter your ${platformName} credentials to continue`
                            : `SmartSpend AI wants to access your ${platformName} account`}
                    </p>
                </div>

                {step === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Email or Phone</label>
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder={`name@example.com`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                            style={{ backgroundColor: platformColor }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="w-full py-3 text-stone-500 font-bold hover:text-stone-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <>
                        {/* Permissions */}
                        <div className="bg-stone-50 rounded-2xl p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-200">
                                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-lg">👤</div>
                                <div>
                                    <p className="font-bold text-stone-900">{email || 'user@example.com'}</p>
                                    <p className="text-xs text-stone-500">Signed in</p>
                                </div>
                            </div>
                            <h3 className="font-bold text-stone-900 mb-3">This will allow SmartSpend to:</h3>
                            <ul className="space-y-2 text-sm text-stone-700">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span>Access your purchase history for price comparison</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span>Track prices and notify you of deals</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span>Analyze your spending patterns</span>
                                </li>
                            </ul>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                            <p className="text-xs text-blue-800">
                                🔒 Your credentials are never stored. We only save a secure access token.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={authorizing}
                                className="flex-1 bg-stone-100 text-stone-700 py-4 rounded-xl font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAuthorize}
                                disabled={authorizing}
                                className="flex-1 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: platformColor }}
                            >
                                {authorizing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Authorizing...
                                    </>
                                ) : (
                                    'Authorize'
                                )}
                            </button>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-xs text-stone-500 mt-6">
                            By authorizing, you agree to SmartSpend's Terms of Service
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default OAuthAuthorize;
