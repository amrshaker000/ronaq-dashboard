import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '@/assets/logo.jpg';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get path to redirect back to or default to dashboard/orders based on role
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Invalid login credentials') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError(err.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src={logoImg} alt="رونق" className="w-16 h-16 rounded-xl object-cover mx-auto shadow-sm" />
          <h2 className="text-headline-lg font-bold text-on-surface">رونق ملصقات (Ronaq)</h2>
          <p className="text-label-sm text-on-surface-variant">تسجيل الدخول للوصول إلى لوحة التحكم</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-danger-light border border-danger/30 rounded-lg text-danger-dark text-body-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-label-sm font-semibold text-on-surface">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@ronaq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
              <Mail className="w-5 h-5 text-neutral-500 absolute top-2.5 right-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-label-sm font-semibold text-on-surface">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
              <Lock className="w-5 h-5 text-neutral-500 absolute top-2.5 right-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2.5 left-3 text-neutral-500 hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-400 hover:bg-brand-500 disabled:bg-neutral-300 text-white font-semibold rounded-lg text-body-md transition-colors shadow-sm mt-6 flex justify-center items-center gap-2"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
};
