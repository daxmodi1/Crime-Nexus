import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dna, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Simple SVG Icons for Social Login
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M16.365 14.363c-.021-2.045 1.662-3.028 1.737-3.076-1.026-1.5-2.616-1.705-3.18-1.728-1.344-.136-2.628.79-3.32.79-.691 0-1.745-.776-2.885-.755-1.488.021-2.862.866-3.626 2.198-1.547 2.673-.395 6.634 1.111 8.812.736 1.066 1.554 2.247 2.705 2.203 1.109-.043 1.528-.716 2.871-.716 1.342 0 1.718.716 2.893.695 1.195-.021 1.905-1.085 2.637-2.137.848-1.238 1.196-2.436 1.218-2.5-.025-.011-2.134-.818-2.161-3.786zm-1.89-6.071c.606-.734 1.015-1.754.904-2.772-.88.035-1.95.586-2.578 1.319-.553.645-1.045 1.688-.912 2.686.985.076 1.979-.499 2.586-1.233z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#1DA1F2">
    <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733a4.67 4.67 0 0 0 2.048-2.578 9.3 9.3 0 0 1-2.958 1.13 4.66 4.66 0 0 0-7.938 4.25A13.229 13.229 0 0 1 2.53 3.593a4.66 4.66 0 0 0 1.442 6.214 4.636 4.636 0 0 1-2.11-.583v.058a4.66 4.66 0 0 0 3.737 4.568 4.65 4.65 0 0 1-2.103.08 4.665 4.665 0 0 0 4.35 3.234 9.349 9.349 0 0 1-5.787 1.995c-.38 0-.756-.022-1.127-.066A13.167 13.167 0 0 0 7.29 21.36c8.747 0 13.53-7.247 13.53-13.53 0-.206-.005-.411-.014-.615a9.664 9.664 0 0 0 2.378-2.463z"/>
  </svg>
);

const AuthView = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/c');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // On successful signup, usually you need to check email, but assuming auto-login or prompt
        navigate('/c');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef0f4] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div 
            onClick={() => navigate('/')}
            className="w-16 h-16 rounded-[20px] mb-4 cursor-pointer hover:scale-105 transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center bg-[#1f1f1f]"
          >
            <Dna size={32} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#1f1f1f] tracking-tight">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-[#71717a] text-[15px] mt-1 text-center">
            {isLogin 
              ? 'Please enter your details to sign in.' 
              : 'Please enter your details to sign up.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Social Login Buttons */}
        <div className="flex mb-6">
          <button className="w-full flex items-center justify-center gap-2 py-3 border border-[#e2e4e8] rounded-xl hover:bg-[#f4f6f8] transition-colors">
            <GoogleIcon />
            <span className="text-[14px] font-semibold text-[#1f1f1f]">Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2e4e8]"></div>
          </div>
          <div className="relative bg-white px-4 text-xs font-semibold text-[#a1a19b] tracking-wider">
            OR
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#1f1f1f]">E-Mail Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#e2e4e8] rounded-xl text-[#1f1f1f] placeholder:text-[#a1a19b] focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-transparent transition-all"
              placeholder="Enter your email..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#1f1f1f]">Password</label>
            <div className="relative flex items-center">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-white border border-[#e2e4e8] rounded-xl text-[#1f1f1f] placeholder:text-[#a1a19b] focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-[#a1a19b] hover:text-[#71717a] transition-colors bg-transparent border-none outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password */}
          {isLogin && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="w-4 h-4 border border-[#e2e4e8] rounded bg-white appearance-none checked:bg-[#1f1f1f] checked:border-[#1f1f1f] transition-all cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-[14px] text-[#1f1f1f] font-medium select-none">Remember me</span>
              </label>
              <button type="button" className="text-[14px] text-[#71717a] font-medium hover:text-[#1f1f1f] underline underline-offset-2 decoration-[#d4d4cf] hover:decoration-[#1f1f1f] transition-all bg-transparent border-none">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#232323] text-white font-medium py-3.5 rounded-xl hover:bg-black transition-colors flex items-center justify-center mt-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              isLogin ? 'Sign in' : 'Sign Up'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center justify-center flex items-center gap-1.5 text-[15px] text-[#71717a]">
          {isLogin ? "Don't have an account yet?" : "Already have an account?"}
          <button 
            onClick={() => navigate(isLogin ? '/signup' : '/login')}
            className="font-semibold text-[#1f1f1f] hover:underline bg-transparent border-none"
          >
            {isLogin ? 'Sign Up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
