import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import AppBackground from './AppBackground';

const AuthScreen = ({ onAuthSuccess, initialIsLogin = true }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(initialIsLogin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Try to find a real profile for this email to get a valid UUID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      let userData;

      if (profile) {
        // User exists, use their real ID
        userData = {
          id: profile.id,
          email: profile.email,
          user_metadata: { full_name: profile.full_name },
          isAdmin: true
        };
      } else if (!isLogin) {
        // Register mode: generate a proper unique UUID for this new user
        const newId = crypto.randomUUID();
        userData = {
          id: newId,
          email: email,
          user_metadata: { full_name: fullName || 'User' },
          isAdmin: true
        };

        const { error: insertError } = await supabase.from('profiles').insert({
          id: newId,
          email: email,
          full_name: fullName || 'User'
        });

        if (insertError) {
          throw new Error('Gagal membuat akun: ' + insertError.message);
        }
      } else {
        // Login mode but email not found in profiles
        throw new Error('Email tidak terdaftar. Silakan daftar terlebih dahulu.');
      }

      // Store in localStorage for persistence (since we're bypassing Supabase Auth)
      localStorage.setItem('pb_mock_session', JSON.stringify({ user: userData }));
      
      onAuthSuccess({ user: userData });
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Gagal masuk: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
      <AppBackground />
      
      <div className="z-10 w-full max-w-md bg-white/70 backdrop-blur-2xl rounded-[40px] border border-white shadow-2xl p-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-8 shadow-lg transform -rotate-6">
          <LogIn className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
          Login Cepat
        </h1>
        <p className="text-slate-500 mb-8 text-center text-sm font-medium">
          Masukkan email untuk langsung masuk ke portal
        </p>

        {error && (
          <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-shake">
            <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs leading-tight font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Nama Lengkap" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="email" 
              placeholder="Alamat Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>
        </form>

        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          disabled={loading}
          className="mt-8 text-slate-400 hover:text-blue-600 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          {isLogin ? "Daftar User Baru" : "Sudah punya email? Masuk"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
