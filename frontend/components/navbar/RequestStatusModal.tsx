import React from 'react';
import { X } from 'lucide-react';

interface RequestStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
}

export default function RequestStatusModal({ isOpen, onClose, data, loading }: RequestStatusModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Application Status</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d5b263]"></div>
            </div>
          ) : data?.error ? (
             <div className="text-center py-8">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-zinc-300 font-bold text-sm">{data.error}</p>
             </div>
          ) : data ? (
            <div className="space-y-6">
               <div className="flex items-center gap-3 bg-[#050506]/65 border border-white/5 p-4 rounded-xl">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                     data.status === 'approved' ? 'bg-emerald-500 animate-pulse' : 
                     data.status === 'rejected' ? 'bg-red-500' : 'bg-[#d5b263] animate-pulse'
                  }`} />
                  <span className={`text-xs font-black uppercase tracking-widest ${
                     data.status === 'approved' ? 'text-emerald-400' : 
                     data.status === 'rejected' ? 'text-red-400' : 'text-[#d5b263]'
                  }`}>{data.status || 'Pending'}</span>
               </div>

               <div className="space-y-4 text-xs bg-[#050506]/35 border border-white/5 rounded-2xl p-5">
                  <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Name</span>
                      <span className="col-span-2 font-bold text-white text-sm">{data.restaurantName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Address</span>
                      <span className="col-span-2 font-medium text-zinc-300 leading-relaxed">{data.restaurantAddress}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</span>
                      <span className="col-span-2 font-bold text-zinc-300">
                        {data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </span>
                  </div>
               </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}