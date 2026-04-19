import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, LogIn, ShieldCheck, Cog } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl shadow-sm space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-t-2xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-b-2xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-primary hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-3 gap-4 border-t border-gray-200 pt-8">
           <div className="text-center space-y-1">
              <User size={20} className="mx-auto text-gray-400" />
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Student</p>
           </div>
           <div className="text-center space-y-1">
              <LogIn size={20} className="mx-auto text-gray-400" />
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Faculty</p>
           </div>
           <div className="text-center space-y-1">
              <Cog size={20} className="mx-auto text-gray-400" />
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Manager</p>
           </div>
        </div>
        
        <div className="text-center bg-gray-100 p-3 rounded-xl">
           <p className="text-xs text-gray-500 font-mono">
             Demo: email@simc.edu / password
           </p>
        </div>
      </motion.div>
    </div>
  );
}
