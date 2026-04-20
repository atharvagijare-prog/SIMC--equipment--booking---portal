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
  Package,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { Equipment, User, BookingRequest } from '../types';

interface InventoryProps {
  user: User;
}

export default function Inventory({ user }: InventoryProps) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  const categories = ['All', ...new Set(items.map(item => item.Category))];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.Description.toLowerCase().includes(search.toLowerCase()) ||
                          item.Category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.Category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filter */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Categories</h2>
          <div className="flex flex-wrap lg:flex-col gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-left rounded-xl text-sm transition-all ${
                  selectedCategory === cat 
                  ? 'bg-primary text-white font-semibold' 
                  : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block p-4 bg-accent/5 rounded-2xl border border-accent/10">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Store Notice</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Ensure you submit requests at least 48 hours in advance for faculty approval.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              <span>Catalog</span>
              <ChevronRight size={10} />
              <span className="text-accent">{selectedCategory}</span>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Equipment Store</h1>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search gear..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
            ))
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <motion.div
                layoutId={item.SIMNo}
                key={item.SIMNo}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-transparent transition-all duration-500"
              >
                {/* Image Container */}
                <div 
                  className="aspect-[4/3] bg-gray-50 flex items-center justify-center p-8 relative overflow-hidden cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <motion.img 
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    src={item.ImageURL || `https://picsum.photos/seed/${item.SIMNo}/400/300`} 
                    alt={item.Description}
                    className="w-full h-full object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      {item.SIMNo}
                    </span>
                  </div>

                  {item.Qty <= 2 && item.Qty > 0 && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      Low Stock
                    </div>
                  )}
                  {item.Qty === 0 && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <span className="px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest">Out of Stock</span>
                    </div>
                  )}
                </div>

                {/* Info Container */}
                <div className="flex-1 p-6 flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1">{item.Category}</p>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 line-clamp-2 leading-snug">
                    {item.Description}
                  </h3>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Availability</p>
                      <p className={`text-sm font-bold ${item.Qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {item.Qty} Units Left
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="p-3 bg-gray-50 text-gray-900 rounded-2xl hover:bg-primary hover:text-white transition-all group-hover:shadow-lg"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <Package size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">No equipment found</h3>
              <p className="text-gray-500">Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal (Redesigned as a slide-over or centered hero) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-primary/60 backdrop-blur-md"
            />
            
            <motion.div
              layoutId={selectedItem.SIMNo}
              className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]"
            >
              {/* Product Preview Pane */}
              <div className="md:w-5/12 bg-gray-50 p-8 flex flex-col justify-center items-center border-r border-gray-100">
                <img 
                  src={selectedItem.ImageURL || `https://picsum.photos/seed/${selectedItem.SIMNo}/400/300`} 
                  alt={selectedItem.Description}
                  className="w-full max-w-[280px] object-contain mix-blend-multiply mb-8"
                  referrerPolicy="no-referrer"
                />
                <div className="text-center">
                  <span className="px-4 py-1.5 bg-white rounded-full text-xs font-mono font-bold shadow-sm">{selectedItem.SIMNo}</span>
                  <p className="mt-4 text-sm text-gray-500 font-medium">{selectedItem.Category}</p>
                </div>
              </div>

              {/* Booking Form Pane */}
              <div className="flex-1 p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">Request Booking</h2>
                    <p className="text-gray-500 font-medium">For {selectedItem.Description}</p>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleBooking} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm font-semibold"
                        value={requestData.fromDate}
                        onChange={(e) => setRequestData({...requestData, fromDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Return Date</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm font-semibold"
                        value={requestData.returnDate}
                        onChange={(e) => setRequestData({...requestData, returnDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Purpose</label>
                    <textarea 
                       required
                       className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm font-medium h-32 resize-none"
                       placeholder="Explain why you need this equipment..."
                       value={requestData.purpose}
                       onChange={(e) => setRequestData({...requestData, purpose: e.target.value})}
                    />
                  </div>

                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${
                        message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {message.type === 'success' ? <Info size={18} /> : <AlertTriangle size={18} />}
                      {message.text}
                    </motion.div>
                  )}

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={submitting || selectedItem.Qty === 0}
                      className="w-full py-5 bg-primary text-white rounded-[1.25rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50"
                    >
                      {submitting ? 'Processing...' : (
                        <>
                          <ShoppingBag size={20} />
                          Check-out Request
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-50 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={20} className="text-blue-500" />
                   </div>
                   <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                     Your request will be vetted by SIMC faculty. 
                     Check your email for approval status within 24 hours.
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Minimal ShieldCheck icon used in footer
function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
