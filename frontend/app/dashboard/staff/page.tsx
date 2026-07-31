"use client";

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { 
  Users, Mail, UserPlus, Shield, User, Clock, RefreshCw, Trash2, Edit2, ChefHat, X
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getRestaurantPermissions } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import { useWebSocket } from '@/lib/websocket-context';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';

// --- Types ---
interface StaffMember {
  id: string;
  userId: string;
  role: 'owner' | 'manager' | 'staff' | 'kitchen';
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  userName: string;
  userEmail: string;
}

interface StaffInvite {
  id: string;
  invitedEmail: string;
  role: 'manager' | 'staff' | 'kitchen';
  inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  invitedAt: string;
}

// --- Components ---
const RoleBadge = ({ role }: { role: string }) => {
  const styles: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700 border-purple-200',
    manager: 'bg-blue-100 text-blue-700 border-blue-200',
    staff: 'bg-green-100 text-green-700 border-green-200',
    kitchen: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  
  const icons: Record<string, any> = {
    owner: Shield,
    manager: Shield,
    staff: User,
    kitchen: ChefHat,
  };
  
  const Icon = icons[role] || User;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${styles[role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      <Icon size={10} />
      {role}
    </span>
  );
};

const Avatar = ({ name, email }: { name: string; email: string }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm">
    {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
  </div>
);

export default function StaffPage() {
  const { restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const { isConnected } = useWebSocket();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  
  // Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Form State
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' as 'manager' | 'staff' | 'kitchen' });
  const [newRole, setNewRole] = useState<'manager' | 'staff' | 'kitchen'>('staff');
  const [submitting, setSubmitting] = useState(false);

  // Permission check
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;
  if (!permissions?.canManageStaff) {
    return <AccessDenied requiredRole="Owner or Manager" message="You need owner or manager access to manage staff" />;
  }

  const isOwner = restaurantRole === 'owner';

  // --- Data Loading ---
  const loadData = async (isRefresh = false) => {
    if (!restaurant) return;
    try {
      if (!isRefresh) setLoading(true);
      
      const [staffData, invitesData]: any[] = await Promise.all([
        apiClient.getStaffMembers(restaurant.id),
        apiClient.getStaffInvites(restaurant.id),
      ]);
      
      setStaffMembers(staffData.staff || []);
      setInvites(invitesData.invites || []);
    } catch (error) {
      toast.error('Failed to load staff data');
      console.error('Load staff error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (restaurant) loadData();
  }, [restaurant]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!restaurant) return;

    const handleOrderCreated = (data: any) => {
      console.log('🆕 ORDER CREATED (STAFF):', data);
      if (data.restaurantId === restaurant.id) {
        // Staff activity might be tracked, but for now just log
        // Could add real-time staff activity monitoring in the future
      }
    };

    // WebSocket disabled - event listeners removed
    // socket.on('order-created', handleOrderCreated);

    return () => {
      // WebSocket disabled - no cleanup needed
      // socket.off('order-created', handleOrderCreated);
    };
  }, [restaurant]);

  // --- Actions ---
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    try {
      setSubmitting(true);
      await apiClient.inviteStaff(restaurant.id, {
        invitedEmail: inviteForm.email,
        role: inviteForm.role,
      });
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'staff' });
      loadData(true);
      setActiveTab('pending');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!restaurant || !selectedStaff) return;
    
    try {
      setSubmitting(true);
      await apiClient.updateStaffRole(restaurant.id, selectedStaff.id, newRole);
      toast.success(`Role updated to ${newRole}`);
      setShowRoleModal(false);
      setSelectedStaff(null);
      loadData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (!restaurant) return;
    if (!confirm(`Remove ${staffMember.userName || staffMember.userEmail} from your team?`)) return;
    
    try {
      await apiClient.removeStaffMember(restaurant.id, staffMember.id);
      toast.success('Staff member removed');
      loadData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove staff member');
    }
  };

  const handleRevokeInvite = async (invite: StaffInvite) => {
    if (!restaurant) return;
    if (!confirm(`Revoke invitation sent to ${invite.invitedEmail}?`)) return;
    
    try {
      await apiClient.revokeStaffInvite(restaurant.id, invite.id);
      toast.success('Invitation revoked');
      loadData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation');
    }
  };

  // --- Derived Data ---
  const pendingInvites = invites.filter(i => i.inviteStatus === 'PENDING');
  const activeStaff = staffMembers.filter(s => s.status === 'active');

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (loading) return <StaffSkeleton />;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-500 mt-1">Manage your restaurant staff and invitations</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {setRefreshing(true); loadData(true);}}
            disabled={refreshing}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {isOwner && (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
            >
              <UserPlus size={18} />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Members</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeStaff.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Invites</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{pendingInvites.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Team</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeStaff.length + pendingInvites.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-colors relative ${activeTab === 'active' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active Members ({activeStaff.length})
            {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 font-bold text-sm transition-colors relative ${activeTab === 'pending' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending Invites ({pendingInvites.length})
            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'active' ? (
            activeStaff.length === 0 ? (
              <EmptyState 
                icon={Users} 
                title="No active team members" 
                sub="Invite people to join your restaurant team." 
                action={isOwner ? () => setShowInviteModal(true) : undefined}
              />
            ) : (
              <div className="space-y-3">
                {activeStaff.map((member) => (
                  <div key={member.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <Avatar name={member.userName} email={member.userEmail} />
                      <div>
                        <h3 className="font-bold text-gray-900">{member.userName || 'No name'}</h3>
                        <p className="text-sm text-gray-500">{member.userEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">Joined {formatDateTime(member.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <RoleBadge role={member.role} />
                      
                      {isOwner && member.role !== 'owner' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedStaff(member);
                              setNewRole(member.role === 'manager' ? 'staff' : member.role === 'staff' ? 'kitchen' : 'staff');
                              setShowRoleModal(true);
                            }}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-blue-600"
                            title="Change role"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleRemoveStaff(member)}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-red-600"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            pendingInvites.length === 0 ? (
              <EmptyState 
                icon={Mail} 
                title="No pending invites" 
                sub="Invite people to join your restaurant team." 
                action={isOwner ? () => setShowInviteModal(true) : undefined}
              />
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <Mail size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{invite.invitedEmail}</h3>
                        <p className="text-xs text-gray-500 mt-1">Invited {formatDateTime(invite.invitedAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <RoleBadge role={invite.role} />
                      {isOwner && (
                        <button 
                          onClick={() => handleRevokeInvite(invite)}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* 4. Invite Modal */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)} title="Invite Team Member">
          <form onSubmit={handleInvite} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="colleague@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                value={inviteForm.email}
                onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
              <div className="grid grid-cols-3 gap-3">
                {['staff', 'manager', 'kitchen'].map((role) => (
                  <div 
                    key={role}
                    onClick={() => setInviteForm({...inviteForm, role: role as any})}
                    className={`cursor-pointer p-3 rounded-xl border text-center transition-all ${inviteForm.role === role ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className={`text-sm font-bold capitalize ${inviteForm.role === role ? 'text-red-700' : 'text-gray-700'}`}>{role}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70"
            >
              {submitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </Modal>
      )}

      {/* 5. Role Update Modal */}
      {showRoleModal && selectedStaff && (
        <Modal onClose={() => setShowRoleModal(false)} title="Update Role">
          <div className="space-y-5">
            <p className="text-gray-600">Change role for <strong>{selectedStaff.userName || selectedStaff.userEmail}</strong></p>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Role</label>
              <div className="grid grid-cols-3 gap-3">
                {['staff', 'manager', 'kitchen'].map((role) => (
                  <div 
                    key={role}
                    onClick={() => setNewRole(role as any)}
                    className={`cursor-pointer p-3 rounded-xl border text-center transition-all ${newRole === role ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className={`text-sm font-bold capitalize ${newRole === role ? 'text-red-700' : 'text-gray-700'}`}>{role}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleRoleUpdate}
              disabled={submitting}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70"
            >
              {submitting ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Helper Components ---
const Modal = ({ onClose, title, children }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, sub, action }: any) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-300" />
    </div>
    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    <p className="text-gray-500 text-sm mt-1 max-w-xs">{sub}</p>
    {action && (
      <button 
        onClick={action}
        className="mt-6 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
      >
        Invite Now
      </button>
    )}
  </div>
);

function StaffSkeleton() {
  return (
    <div className="space-y-8 p-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-10 w-48 bg-gray-200 rounded-xl"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>)}
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Staff...</p>
    </div>
  )
}
