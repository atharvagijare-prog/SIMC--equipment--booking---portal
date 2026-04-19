import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { User, Equipment, BookingRequest } from '../types';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    totalItems: 0,
    activeRequests: 0,
    approvedBookings: 0,
    pendingFaculty: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, reqRes] = await Promise.all([
          fetch('/api?action=getInventory'),
          fetch(`/api?action=getRequests&role=${user.role}&prn=${user.prn || ''}`)
        ]);
        
        const inventory: Equipment[] = await invRes.json();
        const requests: BookingRequest[] = await reqRes.json();

        setStats({
          totalItems: inventory.reduce((acc, item) => acc + item.Qty, 0),
          activeRequests: requests.filter(r => r.FacultyStatus === 'Pending').length,
          approvedBookings: requests.filter(r => r.FacultyStatus === 'Approved').length,
          pendingFaculty: requests.filter(r => r.FacultyStatus === 'Pending').length
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };

    fetchData();
  }, [user]);

  const cards = [
    { label: 'Available Gear', value: stats.totalItems, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'My Requests', value: stats.activeRequests, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Approved', value: stats.approvedBookings, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Approval', value: stats.pendingFaculty, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-gray-500">Here's what's happening in the SIMC Store today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label}
            className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center ${card.color} mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Quick Actions</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-primary hover:text-white transition-all">
                 <div className="flex items-center gap-4">
                    <Package className="text-gray-400 group-hover:text-white/80" />
                    <div className="text-left">
                       <p className="font-semibold">Browse Inventory</p>
                       <p className="text-xs opacity-60">Check availability of cameras & gear</p>
                    </div>
                 </div>
                 <ArrowRight size={16} />
              </button>
              
              <button className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-primary hover:text-white transition-all">
                 <div className="flex items-center gap-4">
                    <Clock className="text-gray-400 group-hover:text-white/80" />
                    <div className="text-left">
                       <p className="font-semibold">My Requests</p>
                       <p className="text-xs opacity-60">Check your current booking status</p>
                    </div>
                 </div>
                 <ArrowRight size={16} />
              </button>
           </div>
        </div>

        <div className="bg-primary text-white rounded-3xl p-8 relative overflow-hidden">
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                 <TrendingUp size={32} className="mb-4 text-white/40" />
                 <h2 className="text-2xl font-bold leading-tight">Production Season is here.</h2>
                 <p className="text-white/60 mt-2 text-sm">Most cameras are currently booked for the Semester 4 projects. Plan ahead!</p>
              </div>
              <button className="mt-8 bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm w-fit shadow-xl shadow-black/20">
                 Read Store Policy
              </button>
           </div>
           
           {/* Abstract Circle for Decoration */}
           <div className="absolute -right-16 -bottom-16 w-64 h-64 border-[32px] border-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
