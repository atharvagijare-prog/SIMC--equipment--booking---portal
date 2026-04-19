import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  LogOut, 
  PlusCircle, 
  CheckCircle,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ user, onLogout, activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'faculty', 'manager'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['student', 'manager'] },
    { id: 'requests', label: 'Requests', icon: Clock, roles: ['student', 'faculty', 'manager'] },
    { id: 'bookings', label: 'Bookings', icon: Calendar, roles: ['student', 'manager'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col p-4 fixed left-0 top-0">
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <CheckCircle size={20} />
        </div>
        <span className="font-bold text-xl tracking-tight">SIMC Store</span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
        <div className="px-4 py-3 bg-gray-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
             <UserIcon size={20} className="text-gray-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-[10px] uppercase font-mono tracking-widest text-gray-400">{user.role}</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
