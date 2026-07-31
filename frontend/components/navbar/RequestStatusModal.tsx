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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Application Status</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : data?.error ? (
             <div className="text-center py-6">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-gray-900 font-medium">{data.error}</p>
             </div>
          ) : data ? (
            <div className="space-y-6">
               <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className={`h-3 w-3 rounded-full ${
                     data.status === 'approved' ? 'bg-green-500' : 
                     data.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-semibold text-gray-900 capitalize">{data.status || 'Pending'}</span>
               </div>

               <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                      <span className="text-gray-500">Name</span>
                      <span className="col-span-2 font-medium text-gray-900">{data.restaurantName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                      <span className="text-gray-500">Address</span>
                      <span className="col-span-2 font-medium text-gray-900">{data.restaurantAddress}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">Date</span>
                      <span className="col-span-2 font-medium text-gray-900">
                        {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
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