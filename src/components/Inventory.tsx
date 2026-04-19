import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Info, 
  AlertTriangle,
  Send,
  X,
  Package
} from 'lucide-react';
import { Equipment, User, BookingRequest } from '../types';

interface InventoryProps {
  user: User;
}

export default function Inventory({ user }: InventoryProps) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [requestData, setRequestData] = useState({
    purpose: '',
    quantity: 1,
    fromDate: '',
    returnDate: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetch('/api?action=getInventory')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  const filteredItems = items.filter(item => 
    item.Description.toLowerCase().includes(search.toLowerCase()) ||
    item.Category.toLowerCase().includes(search.toLowerCase())
  );

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitRequest',
          studentName: user.name,
          studentPRN: user.prn,
          studentEmail: user.email,
          equipmentSIMNo: selectedItem.SIMNo,
          equipmentDescription: selectedItem.Description,
          quantity: requestData.quantity,
          purpose: requestData.purpose,
          fromDate: requestData.fromDate,
          returnDate: requestData.returnDate
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Request submitted! ID: ${data.requestId}` });
        setTimeout(() => {
          setSelectedItem(null);
          setMessage(null);
          setRequestData({ purpose: '', quantity: 1, fromDate: '', returnDate: '' });
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Equipment Inventory</h1>
          <p className="text-gray-500 text-sm">Browse and request professional production gear.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search gear..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
             <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredItems.map((item) => (
          <motion.div
            layoutId={item.SIMNo}
            key={item.SIMNo}
            onClick={() => setSelectedItem(item)}
            className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-accent/10 transition-all cursor-pointer relative"
          >
            <div className="aspect-video bg-gray-50 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
               <Package size={40} className="text-gray-200" />
               <div className="absolute top-3 left-3 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-[10px] font-mono font-bold tracking-tighter shadow-sm">
                  {item.SIMNo}
               </div>
               {item.Qty <= 2 && (
                 <div className="absolute top-3 right-3 p-1 bg-red-50 text-red-500 rounded-lg">
                    <AlertTriangle size={14} />
                 </div>
               )}
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-accent">
                {item.Category}
              </p>
              <h3 className="font-bold text-gray-900 group-hover:text-accent transition-colors truncate">
                {item.Description}
              </h3>
              <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.Qty > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium text-gray-500">
                      {item.Qty} available
                    </span>
                 </div>
                 <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            
            <motion.div
              layoutId={selectedItem.SIMNo}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-1">{selectedItem.Category}</p>
                    <h2 className="text-2xl font-bold tracking-tight">{selectedItem.Description}</h2>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-mono uppercase text-gray-400 mb-1">SIM Code</p>
                      <p className="font-bold">{selectedItem.SIMNo}</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-mono uppercase text-gray-400 mb-1">Availability</p>
                      <p className="font-bold">{selectedItem.Qty} units</p>
                   </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Purpose of Booking</label>
                    <textarea 
                       required
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm h-24"
                       placeholder="Project name, faculty guidance, etc."
                       value={requestData.purpose}
                       onChange={(e) => setRequestData({...requestData, purpose: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">From</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                        value={requestData.fromDate}
                        onChange={(e) => setRequestData({...requestData, fromDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Return</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                        value={requestData.returnDate}
                        onChange={(e) => setRequestData({...requestData, returnDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {message.text}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting || selectedItem.Qty === 0}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : (
                      <>
                        <Send size={18} />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                 <Info size={16} className="text-blue-500" />
                 <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                   Request will be sent to faculty for initial approval. You will receive an email confirmation once approved.
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
