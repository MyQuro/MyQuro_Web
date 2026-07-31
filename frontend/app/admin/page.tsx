"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

// Layout & Core Components
import AdminLayout from './components/AdminLayout';
import AdminModal from './components/AdminModal';

// Tab Components
import OverviewTab from './tabs/OverviewTab';
import RestaurantsTab from './tabs/RestaurantsTab';
import GroupsTab from './tabs/GroupsTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import OffersTab from './tabs/OffersTab';
import QRToolsTab from './tabs/QRToolsTab';
import IdentityEngineTab from './tabs/IdentityEngineTab';
import SettingsTab from './tabs/SettingsTab';

// Utility Components
import CommandPalette from './components/CommandPalette';
import NotificationCenter from './components/NotificationCenter';

// Icons for Modals (the ones still needed in main)
import {
  Building2,
  Store,
  Check,
  Eye,
  EyeOff,
  Copy,
  Tag,
  Percent,
  DollarSign,
  ShoppingBag,
  CheckCircle
} from 'lucide-react';

export type AdminTab = 'overview' | 'restaurants' | 'groups' | 'qr-tools' | 'analytics' | 'offers' | 'identity-engine' | 'settings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Stats / Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [restroFilter, setRestroFilter] = useState('all');
  const [companies, setCompanies] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Selection / Modal / Overlay States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Offers');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");
  const [analyticsRestaurantId, setAnalyticsRestaurantId] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // QR State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [generatedQR, setGeneratedQR] = useState<any>(null);

  // Auth State
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  // Form States
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newInvite, setNewInvite] = useState({ companyName: '', ownerEmail: '', restaurantIds: [] as string[] });

  const [offerLoading, setOfferLoading] = useState(false);
  const [offerForm, setOfferForm] = useState({
    name: '',
    description: '',
    code: '',
    offerType: 'percentage' as any,
    discountValue: 0,
    startDate: '',
    endDate: '',
    scope: 'restaurant' as any,
    targetType: 'specific' as any,
    targetRestaurantIds: [] as string[],
    applicableCategoryId: ''
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await apiClient.getSession() as any;
        if (session?.user) {
          setUserRole(session.user.role);
          setUserEmail(session.user.email);
        }
      } catch (error) {
        console.error('Failed to get session:', error);
      }
    };
    checkAuth();
    loadTabData(activeTab);
  }, [activeTab, period, analyticsRestaurantId, customStartDate, customEndDate]);

  const loadTabData = async (tab: AdminTab) => {
    try {
      setLoading(true);
      if (tab === 'overview') {
        const data = await apiClient.getAdminOverview();
        setOverviewData(data);
      } else if (tab === 'restaurants') {
        const data = await apiClient.getAdminRestaurants();
        setRestaurants(data.restaurants || []);
      } else if (tab === 'groups') {
        const [compRes, invRes] = await Promise.all([
          apiClient.getCompanies(),
          apiClient.getCompanyInvitations()
        ]);
        setCompanies(compRes.companies || []);
        setInvitations(invRes.invitations || []);
      } else if (tab === 'analytics') {
        const [analyticRes, restroRes] = await Promise.all([
          apiClient.getPlatformAnalytics(
            period === 'custom' ? undefined : period,
            analyticsRestaurantId,
            customStartDate,
            customEndDate
          ),
          apiClient.getAdminRestaurants()
        ]);
        setAnalyticsData(analyticRes);
        setRestaurants(restroRes.restaurants || []);
      } else if (tab === 'qr-tools') {
        if (restaurants.length === 0) {
          const data = await apiClient.getAdminRestaurants();
          setRestaurants(data.restaurants || []);
        }
      } else if (tab === 'offers') {
        const restroRes = await apiClient.getAdminRestaurants();
        const availableRestros = restroRes.restaurants || [];
        setRestaurants(availableRestros);

        if (availableRestros.length > 0) {
          const targetId = analyticsRestaurantId || availableRestros[0].id;
          const offerRes = await apiClient.getOffers(targetId) as any;
          setOffers(offerRes.offers || []);
        }
      } else if (tab === 'identity-engine') {
        const data = await apiClient.getAdminUsers();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error(`Failed to load ${tab} data:`, error);
      toast.error(`Error synchronizing ${tab} data layer`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.approveRestaurant(id);
      toast.success('Entity authorization completed');
      loadTabData('restaurants');
    } catch (error) {
      toast.error('Authorization sequence failed');
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Specify suspension vector:');
    if (!reason || reason.length < 5) {
      toast.error('Valid vector required for suspension');
      return;
    }
    try {
      await apiClient.suspendRestaurant(id, reason);
      toast.success('Entity isolation active');
      loadTabData('restaurants');
    } catch (error) {
      toast.error('Isolation sequence failed');
    }
  };

  const handleFetchTables = async (restroId: string) => {
    setSelectedRestaurantId(restroId);
    setSelectedTableId("");
    setGeneratedQR(null);
    try {
      const data = await apiClient.getAdminRestaurantTables(restroId);
      setRestaurantTables(data.tables || []);
    } catch (error) {
      toast.error('Node table discovery failed');
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedTableId || !selectedRestaurantId) return;
    try {
      const data = await apiClient.generateAdminQRCode(selectedTableId, selectedRestaurantId);
      setGeneratedQR(data);
      toast.success('Neural QR Vector generated');
    } catch (error) {
      toast.error('QR Synthesis failed');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite.companyName || !newInvite.ownerEmail || newInvite.restaurantIds.length === 0) {
      toast.error('Incomplete provisioning parameters');
      return;
    }

    try {
      setInviteLoading(true);
      await apiClient.createCompanyInvitation(newInvite);
      toast.success('Network invitation broadcast successfully');
      setShowInviteModal(false);
      setNewInvite({ companyName: '', ownerEmail: '', restaurantIds: [] });
      loadTabData('groups');
    } catch (error: any) {
      toast.error(error.message || 'Provisioning sequence abort');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.name || !offerForm.code || !offerForm.startDate || !offerForm.endDate) {
      toast.error('Required strategy parameters missing');
      return;
    }

    try {
      setOfferLoading(true);
      const targetRestroId = analyticsRestaurantId || (restaurants.length > 0 ? restaurants[0].id : "");

      if (!targetRestroId) {
        toast.error('No restaurant context discovered');
        return;
      }

      const payload = {
        ...offerForm,
        discountValue: Number(offerForm.discountValue)
      };

      if (selectedOffer) {
        await apiClient.updateOffer(targetRestroId, selectedOffer.id, payload);
        toast.success('Strategy optimized');
      } else {
        await apiClient.createOffer(targetRestroId, payload);
        toast.success('Campaign vector deployed');
      }

      setShowOfferModal(false);
      setSelectedOffer(null);
      loadTabData('offers');
    } catch (error: any) {
      toast.error(error.message || 'Deployment sequence failure');
    } finally {
      setOfferLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Dissolve this promotional strategy?')) return;
    try {
      const targetId = analyticsRestaurantId || (restaurants.length > 0 ? restaurants[0].id : "");
      await apiClient.deleteOffer(targetId, id);
      toast.success('Strategy terminated');
      loadTabData('offers');
    } catch (error) {
      toast.error('Termination sequence failed');
    }
  };

  const prepareOfferEdit = (offer: any) => {
    setSelectedOffer(offer);
    setOfferForm({
      name: offer.name,
      description: offer.description || '',
      code: offer.code,
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      startDate: new Date(offer.startDate).toISOString().split('T')[0],
      endDate: new Date(offer.endDate).toISOString().split('T')[0],
      scope: offer.scope,
      targetType: offer.targetType,
      targetRestaurantIds: offer.targetRestaurantIds || [],
      applicableCategoryId: offer.applicableCategoryId || ''
    });
    setShowOfferModal(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Platform Hub...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return overviewData && <OverviewTab data={overviewData} />;
      case 'restaurants':
        return (
          <RestaurantsTab
            restaurants={restaurants}
            filter={restroFilter}
            setFilter={setRestroFilter}
            handleApprove={handleApprove}
            handleSuspend={handleSuspend}
          />
        );
      case 'groups':
        return (
          <GroupsTab
            companies={companies}
            invitations={invitations}
            setShowInviteModal={setShowInviteModal}
            setSelectedCompany={setSelectedCompany}
          />
        );
      case 'analytics':
        return (
          <AnalyticsTab
            data={analyticsData}
            restaurants={restaurants}
            period={period}
            setPeriod={setPeriod}
            analyticsRestaurantId={analyticsRestaurantId}
            setAnalyticsRestaurantId={setAnalyticsRestaurantId}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        );
      case 'offers':
        return (
          <OffersTab
            offers={offers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            setShowOfferModal={setShowOfferModal}
            handleDeleteOffer={handleDeleteOffer}
            prepareOfferEdit={prepareOfferEdit}
          />
        );
      case 'qr-tools':
        return (
          <QRToolsTab
            restaurants={restaurants}
            selectedRestaurantId={selectedRestaurantId}
            handleFetchTables={handleFetchTables}
            restaurantTables={restaurantTables}
            selectedTableId={selectedTableId}
            setSelectedTableId={setSelectedTableId}
            handleGenerateQR={handleGenerateQR}
            generatedQR={generatedQR}
          />
        );
      case 'identity-engine':
        return <IdentityEngineTab users={users} onRefresh={() => loadTabData('identity-engine')} />;
      case 'settings':
        return <SettingsTab userEmail={userEmail} userRole={userRole} />;
      default:
        return null;
    }
  };

  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        userEmail={userEmail}
        title={activeTab.replace('-', ' ')}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      >
        {renderContent()}

        {/* Modals */}
        <AdminModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Provision Brand Network"
          subtitle="Initiating enterprise collection"
        >
          <form onSubmit={handleInviteSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="Hospitality Group Name"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                  value={newInvite.companyName}
                  onChange={(e) => setNewInvite({ ...newInvite, companyName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@brand.com"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                  value={newInvite.ownerEmail}
                  onChange={(e) => setNewInvite({ ...newInvite, ownerEmail: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Include Assets</label>
                <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 max-h-48 overflow-y-auto space-y-3">
                  {restaurants.filter(r => r.status === 'approved').map(r => (
                    <label key={r.id} className="flex items-center gap-4 p-3 hover:bg-white rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100 group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="peer w-5 h-5 opacity-0 absolute inset-0 cursor-pointer"
                          checked={newInvite.restaurantIds.includes(r.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...newInvite.restaurantIds, r.id]
                              : newInvite.restaurantIds.filter(id => id !== r.id);
                            setNewInvite({ ...newInvite, restaurantIds: ids });
                          }}
                        />
                        <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${newInvite.restaurantIds.includes(r.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                          {newInvite.restaurantIds.includes(r.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-[13px] font-black text-slate-600 group-hover:text-slate-900 transition-colors">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[11px] hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 disabled:bg-slate-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {inviteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Building2 className="w-4 h-4" /> Provision Group</>}
              </button>
            </div>
          </form>
        </AdminModal>

        <AdminModal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          title={selectedCompany?.name || 'Company Details'}
          subtitle="Network Identity & Topology"
        >
          <div className="space-y-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Access</h4>
              <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entry ID</span>
                  <span className="text-[13px] font-bold text-slate-900 italic font-mono">{selectedCompany?.ownerEmail}</span>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-200/50">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Secret Key</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-black text-indigo-600">
                      {selectedCompany?.generatedPassword
                        ? (showPasswordInModal ? selectedCompany.generatedPassword : '••••••••')
                        : 'ENCRYPTED'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowPasswordInModal(!showPasswordInModal)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        {showPasswordInModal ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedCompany.generatedPassword!);
                          toast.success('Key cached');
                        }}
                        className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Affiliate Nodes</h4>
              <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-4 max-h-56 overflow-y-auto space-y-3">
                {selectedCompany?.restaurants?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs shadow-sm">
                        {r.name[0]}
                      </div>
                      <span className="text-[13px] font-black text-slate-900">{r.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedCompany(null)}
              className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] transition-all"
            >
              Dissolve Context
            </button>
          </div>
        </AdminModal>

        <AdminModal
          isOpen={showOfferModal}
          onClose={() => {
            setShowOfferModal(false);
            setSelectedOffer(null);
          }}
          title={selectedOffer ? 'Optimize Strategy' : 'Configure Strategy'}
          subtitle="Deployment Parameters"
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleOfferSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Strategy Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                    value={offerForm.name}
                    onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Magnitude & Type</label>
                  <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                    {[
                      { id: 'percentage', label: '%', icon: Percent },
                      { id: 'flat_discount', label: 'Flat', icon: DollarSign },
                      { id: 'buy_1_get_1', label: 'BOGO', icon: ShoppingBag },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setOfferForm({ ...offerForm, offerType: type.id as any })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${offerForm.offerType === type.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'
                          }`}
                      >
                        <type.icon className="w-3.5 h-3.5" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Value Amount</label>
                  <input
                    type="number"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                    value={offerForm.discountValue}
                    onChange={(e) => setOfferForm({ ...offerForm, discountValue: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vector Code</label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-black text-indigo-600 font-mono focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all uppercase"
                    value={offerForm.code}
                    onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Activation</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-bold text-slate-900 outline-none"
                      value={offerForm.startDate}
                      onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Termination</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-bold text-slate-900 outline-none"
                      value={offerForm.endDate}
                      onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Scope Selection</label>
                    <select
                      value={offerForm.scope}
                      onChange={(e) => setOfferForm({ ...offerForm, scope: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 outline-none"
                    >
                      <option value="restaurant">Isolated Node</option>
                      <option value="company">Platform Global</option>
                    </select>
                  </div>
                  {offerForm.scope === 'company' && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Targeting Vector</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['all', 'specific'].map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setOfferForm({ ...offerForm, targetType: v as any })}
                              className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${offerForm.targetType === v ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'
                                }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[11px] hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={offerLoading}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 disabled:bg-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {offerLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Deploy strategy</>}
              </button>
            </div>
          </form>
        </AdminModal>
      </AdminLayout>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        restaurants={restaurants}
      />

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </>
  );
}
