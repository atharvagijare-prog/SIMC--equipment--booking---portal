import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  X, 
  Package, 
  User as UserIcon, 
  Clock, 
  Calendar,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { BookingRequest, User } from '../types';

interface RequestsProps {
  user: User;
}

export default function Requests({ user }: RequestsProps) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api?action=getRequests&role=${user.role}&prn=${user.prn || ''}`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleAction = async (requestId: string, action: string, status: string) => {
    try {
      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
          <p className="text-gray-500 text-sm">Review and manage equipment allocation.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Request Details</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Student</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Dates</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg" /></td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                      No requests found.
                   </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.RequestID} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-accent/5 text-accent rounded-lg">
                          <Package size={18} />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-gray-900">{req.EquipmentDescription}</p>
                          <p className="text-[10px] font-mono text-gray-400">{req.RequestID}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{req.StudentName}</span>
                     </div>
                     <p className="text-[10px] text-gray-400 ml-5">{req.StudentPRN}</p>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Calendar size={12} />
                        <span>{new Date(req.FromDate).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>{new Date(req.ReturnDate).toLocaleDateString()}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Faculty:</span>
                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                             req.FacultyStatus === 'Approved' ? 'bg-green-50 text-green-600' : 
                             req.FacultyStatus === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                           }`}>
                             {req.FacultyStatus}
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Manager:</span>
                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                             req.ManagerStatus === 'Issued' ? 'bg-blue-50 text-blue-600' : 
                             req.ManagerStatus === 'Returned' ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-orange-600'
                           }`}>
                             {req.ManagerStatus}
                           </span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        {user.role === 'faculty' && req.FacultyStatus === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleAction(req.RequestID, 'updateFacultyStatus', 'Approved')}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                               <Check size={16} />
                            </button>
                            <button 
                              onClick={() => handleAction(req.RequestID, 'updateFacultyStatus', 'Rejected')}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                               <X size={16} />
                            </button>
                          </>
                        )}

                        {user.role === 'manager' && req.FacultyStatus === 'Approved' && (
                          <>
                            {req.ManagerStatus === 'Pending' && (
                              <button 
                                onClick={() => handleAction(req.RequestID, 'updateManagerStatus', 'Issued')}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                              >
                                Issue Gear
                              </button>
                            )}
                            {req.ManagerStatus === 'Issued' && (
                              <button 
                                onClick={() => handleAction(req.RequestID, 'updateManagerStatus', 'Returned')}
                                className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                              >
                                Mark Returned
                              </button>
                            )}
                          </>
                        )}
                        
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                           <MoreVertical size={16} />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
