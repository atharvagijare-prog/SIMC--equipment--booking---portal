import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronRight, 
  Info, 
  AlertTriangle,
  X,
  Package,
  ShoppingBag,
  ArrowRight,
  Monitor,
  Camera,
  Layers,
  Music,
  Zap,
} from 'lucide-react';
import { Equipment, User } from '../types';

interface InventoryProps {
  user: User;
}

export default function Inventory({ user }: InventoryProps) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Cameras');
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

  const categoryDefinitions = [
    { title: 'Cameras', icon: <Camera size={18} />, color: 'bg-blue-500' },
    { title: 'Lenses', icon: <Monitor size={18} />, color: 'bg-indigo-500' },
    { title: 'Audio', icon: <Music size={18} />, color: 'bg-purple-500' },
    { title: 'Lighting', icon: <Zap size={18} />, color: 'bg-orange-500' },
    { title: 'Rigs & Grips', icon: <Layers size={18} />, color: 'bg-emerald-500' },
    { title: 'Accessories', icon: <ShoppingBag size={18} />, color: 'bg-slate-500' },
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.Description.toLowerCase().includes(search.toLowerCase());
    
    const mapping: {[key: string]: string[]} = {
      'Cameras': ['Camera', 'Cameras'],
      'Lenses': ['Lens', 'Lenses'],
      'Audio': ['Audio', 'Sound', 'Mics'],
      'Lighting': ['Lighting', 'Light'],
      'Rigs & Grips': ['Grip', 'Rigs', 'Gimbals', 'Stands'],
      'Accessories': ['Accessories', 'Accessory', 'Cables', 'Cards']
    };

    const allowedCategories = mapping[selectedCategory] || [selectedCategory];
    const matchesCategory = selectedCategory === 'All' || 
                            allowedCategories.some(cat => item.Category.toLowerCase().includes(cat.toLowerCase()));
                            
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
          studentPRN: user.prn || 'GUEST',
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
    <div className="flex h-full min-h-[calc(100vh-120px)] bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl">
      {/* Sidebar: Master Titles */}
      <aside className="w-72 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-8">
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 font-mono">Select Category</h2>
           <nav className="space-y-3">
              {categoryDefinitions.map((cat) => (
                <button
                  key={cat.title}
                  onClick={() => setSelectedCategory(cat.title)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-500 ${
                    selectedCategory === cat.title 
                    ? 'bg-gray-900 text-white shadow-2xl shadow-gray-300 translate-x-2' 
                    : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${selectedCategory === cat.title ? 'bg-white/10' : 'bg-gray-200/50'}`}>
                    {cat.icon}
                  </div>
                  {cat.title}
                  {selectedCategory === cat.title && <ChevronRight size={14} className="ml-auto opacity-40" />}
                </button>
              ))}
           </nav>
        </div>

        <div className="mt-auto p-8">
           <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Store Status</p>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                 Available for 24-hour rentals. Please return on time.
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content: Equipment Listing */}
      <main className="flex-1 flex flex-col p-8 lg:p-16 overflow-y-auto bg-white relative">
        {/* Subtle background wash */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-gray-50 to-transparent pointer-events-none" />

        <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="w-12 h-1 bg-gray-900 rounded-full" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Equipment Inventory</p>
            </div>
            <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase">{selectedCategory}</h1>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Filter by name..." 
              className="w-full pl-14 pr-7 py-5 bg-gray-50 border border-transparent rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-gray-100 focus:bg-white focus:border-gray-200 text-sm font-bold shadow-inner transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-50 rounded-[3rem] animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
            {filteredItems.map((item) => (
              <motion.div
                key={item.SIMNo}
                layoutId={item.SIMNo}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -12 }}
                onClick={() => setSelectedItem(item)}
                className="group flex flex-col bg-white cursor-pointer relative"
              >
                <div className="aspect-square mb-8 relative bg-gray-50/70 rounded-[3.5rem] overflow-hidden flex items-center justify-center p-12 transition-all duration-700 group-hover:bg-gray-100/50 group-hover:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.1)]">
                   <motion.img 
                     whileHover={{ scale: 1.1 }}
                     src={item.ImageURL || `https://picsum.photos/seed/${item.SIMNo}/400/300`} 
                     className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                     referrerPolicy="no-referrer"
                   />
                   <div className="absolute top-6 left-6">
                      <span className="px-4 py-2 bg-white/80 backdrop-blur-md border border-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm text-gray-500">
                        S-{item.SIMNo}
                      </span>
                   </div>
                </div>

                <div className="px-4">
                   <h3 className="text-2xl font-black text-gray-900 mb-5 leading-[1.1] tracking-tight group-hover:text-blue-600 transition-colors">
                      {item.Description}
                   </h3>
                   <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                      <div className="flex flex-col gap-1">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</p>
                         <p className={`text-sm font-black ${item.Qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                           {item.Qty} units available
                         </p>
                      </div>
                      <div className="w-14 h-14 rounded-3xl bg-gray-900 text-white flex items-center justify-center shadow-xl shadow-gray-200 group-hover:bg-blue-600 group-hover:-translate-y-1 group-hover:shadow-blue-200 transition-all duration-500">
                         <ArrowRight size={22} />
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
            <div className="w-32 h-32 rounded-[3.5rem] bg-gray-50 flex items-center justify-center mb-10 shadow-inner">
               <Package size={50} className="text-gray-200" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Master Title Empty</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto">We couldn't find any equipment matching this category or your current search.</p>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-3xl"
            />
            
            <motion.div
              layoutId={selectedItem.SIMNo}
              className="relative bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[700px]"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-10 right-10 z-20 w-14 h-14 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-xl"
              >
                <X size={28} />
              </button>

              {/* Product Visual Area */}
              <div className="lg:w-1/2 bg-[#f9fafb] p-16 lg:p-24 flex flex-col justify-center items-center relative">
                <div className="absolute top-20 left-20">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-1 bg-gray-900" />
                      <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Product Preview</p>
                   </div>
                </div>
                
                <img 
                  src={selectedItem.ImageURL || `https://picsum.photos/seed/${selectedItem.SIMNo}/400/300`} 
                  alt={selectedItem.Description}
                  className="w-full max-w-[440px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.15)] object-contain mix-blend-multiply relative z-10"
                  referrerPolicy="no-referrer"
                />

                <div className="mt-20 flex gap-8 relative z-10 w-full max-w-xs">
                   <div className="flex-1 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">SIM Number</p>
                      <p className="text-xl font-black text-gray-900">{selectedItem.SIMNo}</p>
                   </div>
                   <div className="flex-1 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">In Stock</p>
                      <p className="text-xl font-black text-green-600">{selectedItem.Qty} Units</p>
                   </div>
                </div>
              </div>

              {/* Booking Form Area */}
              <div className="flex-1 p-16 lg:p-24 bg-white border-l border-gray-50 overflow-y-auto">
                <div className="mb-16">
                   <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Request Flow</p>
                   <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-6 leading-[0.95]">{selectedItem.Description}</h2>
                   <div className="inline-block px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest">
                     Equipment Category: {selectedItem.Category}
                   </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Collection Date</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-8 py-6 bg-gray-50/50 border border-gray-100 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-200 text-sm font-black shadow-sm transition-all"
                        value={requestData.fromDate}
                        onChange={(e) => setRequestData({...requestData, fromDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Expected Return</label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-8 py-6 bg-gray-50/50 border border-gray-100 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-200 text-sm font-black shadow-sm transition-all"
                        value={requestData.returnDate}
                        onChange={(e) => setRequestData({...requestData, returnDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Project Brief & Supervision</label>
                    <textarea 
                       required
                       className="w-full px-8 py-7 bg-gray-50/50 border border-gray-100 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-200 text-sm font-medium h-44 resize-none shadow-sm transition-all"
                       placeholder="Detail your production plan and specify the faculty member overseeing this shoot..."
                       value={requestData.purpose}
                       onChange={(e) => setRequestData({...requestData, purpose: e.target.value})}
                    />
                  </div>

                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-7 rounded-[2rem] text-sm font-black flex items-center gap-5 ${
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <Info size={24} />
                      {message.text}
                    </motion.div>
                  )}

                  <div className="pt-8">
                    <button 
                      type="submit"
                      disabled={submitting || selectedItem.Qty === 0}
                      className="w-full py-8 bg-gray-900 text-white rounded-[3rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-6 hover:bg-blue-600 hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all duration-500 disabled:opacity-30"
                    >
                      {submitting ? 'Processing request...' : (
                        <>
                          <ShoppingBag size={24} />
                          Reserve Equipment
                        </>
                      )}
                    </button>
                    <div className="flex items-center justify-center gap-3 mt-10 opacity-40">
                       <Zap size={14} className="text-blue-500" />
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                         Subject to Faculty Approval & Availability
                       </p>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
