import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, LogIn, ShieldCheck, Cog, Chrome } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onLogin(event.data.user);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Authentication failed');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        setError('Popup blocked. Please enable popups for this site.');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to initiate Google login');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <motion.div 
              whileHover={{ rotate: 15 }}
              className="p-3 bg-accent rounded-2xl text-white shadow-xl shadow-accent/20"
            >
              <ShieldCheck size={40} />
            </motion.div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">SIMC Portal</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to manage equipment and bookings
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 px-4 bg-white border border-gray-300 rounded-2xl text-gray-700 font-semibold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Chrome size={20} className="text-blue-500" />
            Sign in with Google (Staff)
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-3 text-gray-400 font-mono tracking-widest">or student prn</span>
            </div>
          </div>
        </div>

        <form className="mt-0 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl shadow-sm space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-t-2xl relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-b-2xl relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-primary hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sign in as Student'}
            </button>
            <button
              type="button"
              onClick={() => onLogin({ id: 'guest', name: 'Guest User', email: 'guest@simc.edu', role: 'guest' })}
              className="w-full flex justify-center py-3 px-4 border border-gray-200 text-sm font-semibold rounded-2xl text-gray-600 bg-white hover:bg-gray-50 transition-all"
            >
              Skip to Portal (Guest View)
            </button>
          </div>
        </form>

        <div className="text-center bg-gray-100 p-3 rounded-xl">
           <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest leading-loose">
             Faculty authentication is verified against the official Google Sheet database.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
