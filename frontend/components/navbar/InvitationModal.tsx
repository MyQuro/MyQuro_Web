import React from 'react';
import { X, Check, Clock } from 'lucide-react';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: any[];
  loading: boolean;
  onAccept: (token: string) => void;
  onReject: (token: string) => void;
}

export default function InvitationModal({ isOpen, onClose, invitations, loading, onAccept, onReject }: InvitationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Staff Invitations</h3>
            <p className="text-sm text-gray-500">Manage your pending invites</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <p className="text-sm text-gray-500">Syncing invitations...</p>
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invite, index) => (
                <div key={index} className="group border border-gray-100 rounded-xl p-4 hover:border-red-100 hover:shadow-sm transition-all bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{invite.restaurantName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium uppercase tracking-wide">
                            {invite.role}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{invite.city}</span>
                      </div>
                    </div>
                    <StatusBadge status={invite.inviteStatus} />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                     <p className="text-xs text-gray-500 mb-1">Invited by</p>
                     <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        {invite.invitedByUserName}
                        <span className="text-gray-400 font-normal">({invite.invitedByUserEmail})</span>
                     </p>
                  </div>

                  {invite.inviteStatus === 'PENDING' && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => onAccept(invite.inviteToken)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition-colors"
                      >
                        <Check size={16} /> Accept
                      </button>
                      <button 
                        onClick={() => onReject(invite.inviteToken)}
                        className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No pending invitations</p>
              <p className="text-gray-500 text-sm mt-1">Check back later or ask your admin to resend.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: "bg-amber-100 text-amber-700 border-amber-200",
        ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
        REJECTED: "bg-red-50 text-red-600 border-red-100",
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status] || "bg-gray-100 text-gray-600"}`}>
            {status}
        </span>
    );
}