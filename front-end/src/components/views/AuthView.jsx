import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dna, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AuthView = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="min-h-screen bg-[#f6f7ed] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#e8e8e4] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div 
            onClick={() => navigate('/')}
            className="p-3 bg-[#1f1f1f] rounded-2xl mb-4 cursor-pointer hover:scale-105 transition-transform shadow-md"
          >
            <Dna size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-[#71717a] text-sm mt-2 text-center">
            {isLogin 
              ? 'Enter your credentials to access your workspace.' 
              : 'Sign up to start analyzing digital evidence.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1f1f1f] px-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a19b]" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f4f4f4] border border-[#e8e8e4] rounded-2xl text-[#1f1f1f] placeholder:text-[#a1a19b] focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-transparent transition-all"
                placeholder="investigator@agency.gov"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1f1f1f] px-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a19b]" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f4f4f4] border border-[#e8e8e4] rounded-2xl text-[#1f1f1f] placeholder:text-[#a1a19b] focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1f1f1f] text-white font-semibold py-4 rounded-2xl hover:bg-black transition-transform hover:scale-[1.02] shadow-lg shadow-black/10 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Sign Up'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#71717a]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => navigate(isLogin ? '/signup' : '/login')}
            className="font-bold text-[#1f1f1f] hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
