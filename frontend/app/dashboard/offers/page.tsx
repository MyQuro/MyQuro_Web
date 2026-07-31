"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { apiClient } from '@/lib/api-client';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import { Plus, Edit2, Trash2, Tag, Calendar, Percent, XCircle, Copy, ShoppingBag, MoreVertical, Search, Filter, Clock, CheckCircle, AlertCircle, BarChart3, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface Offer {
  id: string;
  name: string;
  description: string | null;
  offerType: string;
  discountValue: number;
  applicableCategoryId: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status?: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
}

export default function OffersPage() {
  const { user, restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Permission check
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;



  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    offerType: 'percentage',
    discountValue: '',
    applicableCategoryId: '',
    startDate: '',
    endDate: '',
    code: '',
    scope: 'restaurant',
    targetType: 'all',
    targetCategory: '',
    targetRestaurantIds: [] as string[]
  });

  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const isAdmin = user?.role === 'admin';

  const fetchOffersAndCategories = useCallback(async () => {
    if (!restaurant?.id) return;
    try {
      setLoading(true);
      const [offerData, menuData, restaurantData] = await Promise.all([
        apiClient.getOffers(restaurant.id),
        apiClient.getPublicMenu(restaurant.id),
        isAdmin ? apiClient.getRestaurants() : Promise.resolve({ restaurants: [] })
      ]);
      setOffers((offerData as any).offers as Offer[]);
      if ((menuData as any).success && (menuData as any).data?.categories) {
        setCategories((menuData as any).data.categories);
      }
      if (isAdmin && (restaurantData as any).restaurants) {
        setAllRestaurants((restaurantData as any).restaurants);
      }
    } catch (error) {
      console.error('Failed to fetch offers and categories:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, isAdmin]);

  useEffect(() => {
    fetchOffersAndCategories();
  }, [fetchOffersAndCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        discountValue: Number(formData.discountValue),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (editingOffer) {
        await apiClient.updateOffer(restaurant.id, editingOffer.id, payload);
        toast.success('Offer updated successfully');
      } else {
        await apiClient.createOffer(restaurant.id, payload);
        toast.success('Offer created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchOffersAndCategories();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await apiClient.deleteOffer(restaurant!.id, id);
      toast.success('Offer deleted');
      fetchOffersAndCategories();
    } catch {
      toast.error('Failed to delete offer');
    }
  };

  const handleToggleStatus = async (offer: Offer) => {
    if (!restaurant?.id) return;
    try {
      const newStatus = offer.status === 'active' ? 'inactive' : 'active';
      await apiClient.updateOffer(restaurant.id, offer.id, { isActive: newStatus === 'active' });
      toast.success(`Offer ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchOffersAndCategories();
    } catch (error) {
      toast.error('Failed to update offer status');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || '',
      offerType: offer.offerType || 'percentage',
      discountValue: offer.discountValue?.toString() || '0',
      applicableCategoryId: offer.applicableCategoryId || '',
      startDate: new Date(offer.startDate).toISOString().slice(0, 16),
      endDate: new Date(offer.endDate).toISOString().slice(0, 16),
      code: offer.code,
      scope: (offer as any).scope || 'restaurant',
      targetType: (offer as any).targetType || 'all',
      targetCategory: (offer as any).targetCategory || '',
      targetRestaurantIds: (offer as any).targetRestaurantIds || []
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingOffer(null);
    setFormData({
      name: '',
      description: '',
      offerType: 'percentage',
      discountValue: '',
      applicableCategoryId: '',
      startDate: '',
      endDate: '',
      code: '',
      scope: 'restaurant',
      targetType: 'all',
      targetCategory: '',
      targetRestaurantIds: []
    });
  };

  const [selectedFilter, setSelectedFilter] = useState('All Offers');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (!permissions?.canManageOffers) {
    return <AccessDenied requiredRole="Owner or Manager" message="You need owner or manager access to manage offers" />;
  }

  if (loading && !offers.length) {
    return <div className="p-8 text-center">Loading offers...</div>;
  }

  return (

    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Tag className="w-10 h-10 text-[#d5b263]" />
            Offers & Promotions
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-2">Create, manage & automate offers for your restaurant</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 stroke-[3px]" />
          <span>Create Offer</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Offers', value: offers.length, icon: Tag, gold: true },
          { label: 'Active Now', value: offers.filter(o => o.status === 'active').length, icon: CheckCircle, gold: false },
          { label: 'Upcoming', value: offers.filter(o => o.status === 'upcoming').length, icon: Clock, gold: true },
          { label: 'Expired', value: offers.filter(o => o.status === 'expired').length, icon: XCircle, gold: false },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0c0c0e] border border-zinc-900/40 p-6 rounded-3xl shadow-sm transition-all group">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                stat.gold ? 'bg-[#d5b263]/10 border border-[#d5b263]/20 text-[#d5b263]' : 'bg-zinc-900 border border-zinc-850 text-white'
              }`}>
                <stat.icon className="w-7 h-7 stroke-[2.5px]" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-white tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 p-1.5 bg-zinc-950/30 border border-zinc-900/40 rounded-2xl w-full lg:w-auto overflow-x-auto">
          {['All Offers', 'Active', 'Upcoming', 'Expired'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedFilter === filter
                ? 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900/45 px-6 py-3.5 pl-14 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-medium text-white placeholder:text-zinc-600"
            />
            <Search className="w-6 h-6 text-zinc-500 absolute left-5 top-1/2 -translate-y-1/2 stroke-[2.5px]" />
          </div>
        </div>
      </div>

      {/* Featured Offer Card */}
      {offers.length > 0 && (() => {
        const featuredOffer = offers[0];
        if (!featuredOffer) return null;
        
        return (
          <div className="bg-[#0c0c0e] rounded-[32px] border border-zinc-900/40 p-8 relative overflow-hidden group transition-all duration-500">
            {/* Subtle Background Pattern */}
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 group-hover:scale-175 group-hover:rotate-45 transition-all duration-1000">
              <Tag className="w-64 h-64 text-[#d5b263]" />
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-3xl flex items-center justify-center text-[#d5b263] group-hover:scale-110 transition-transform duration-500">
                  <Tag className="w-10 h-10 stroke-[2.5px]" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{featuredOffer.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border flex items-center gap-1.5 ${
                        (featuredOffer as any).scope === 'company'
                          ? 'bg-[#d5b263]/10 text-[#d5b263] border-[#d5b263]/25'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                      }`}>
                        {(featuredOffer as any).scope === 'company' ? (
                          <><ShoppingBag className="w-3 h-3" />Global</>
                        ) : (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${featuredOffer.status === 'active' ? 'bg-[#d5b263]' : 'bg-zinc-600'}`} />
                            {(featuredOffer.status || 'Active').charAt(0).toUpperCase() + (featuredOffer.status || 'Active').slice(1)}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-400 font-medium max-w-lg leading-relaxed">{featuredOffer.description}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="bg-[#d5b263]/10 text-[#d5b263] px-4 py-1.5 rounded-xl text-sm font-bold border border-[#d5b263]/20 cursor-default">
                      {featuredOffer.offerType === 'percentage' && `${featuredOffer.discountValue}% OFF`}
                      {featuredOffer.offerType === 'flat_discount' && `₹${featuredOffer.discountValue} OFF`}
                    </span>
                    <span className="bg-zinc-900 text-zinc-400 px-4 py-1.5 rounded-xl text-sm font-bold border border-zinc-850 cursor-default">
                      {featuredOffer.offerType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 md:border-l border-zinc-900/40 pt-6 md:pt-0 md:pl-10">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Start Date</p>
                    <p className="font-bold text-white">{new Date(featuredOffer.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="w-6 h-[2px] bg-zinc-800 rounded-full rotate-[-45deg]" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">End Date</p>
                    <p className="font-bold text-white">{new Date(featuredOffer.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 pr-4 border-r border-zinc-900/40">
                    <button onClick={() => handleCopyCode(featuredOffer.code)} className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-all" title="Copy Code">
                      <Copy className="w-5 h-5" />
                    </button>
                    <button onClick={() => openEditModal(featuredOffer)} className="p-2.5 text-zinc-500 hover:text-[#d5b263] hover:bg-[#d5b263]/10 rounded-xl transition-all" title="Edit offer">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(featuredOffer.id)} className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-950/30 rounded-xl transition-all" title="Delete offer">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-3 pl-2">
                    <button
                      onClick={() => handleToggleStatus(featuredOffer)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${featuredOffer.status === 'active' ? 'bg-[#d5b263]' : 'bg-zinc-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-all duration-300 ${featuredOffer.status === 'active' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Offer Types Selection */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-white tracking-tight">Offer Types</h2>
          {selectedType && (
            <button
              onClick={() => setSelectedType(null)}
              className="text-xs font-bold text-[#d5b263] hover:text-white underline"
            >
              Clear Type Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Flat Discount', type: 'flat_discount', icon: Calendar },
            { name: 'Percentage Discount', type: 'percentage', icon: Percent },
            { name: 'Buy 1 Get 1', type: 'buy_1_get_1', icon: ShoppingBag },
            { name: 'Category Discount', type: 'category_discount', icon: Tag },
          ].map((type, idx) => (
            <button
              key={type.name}
              onClick={() => setSelectedType(type.type)}
              className={`h-24 bg-[#0c0c0e] p-5 rounded-3xl flex items-center gap-4 group transition-all hover:-translate-y-1 border ${
                selectedType === type.type
                  ? 'border-[#d5b263] ring-1 ring-[#d5b263]/20'
                  : 'border-zinc-900/40 hover:border-zinc-800'
                }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                idx % 2 === 0 ? 'bg-[#d5b263]/10 border border-[#d5b263]/20 text-[#d5b263]' : 'bg-zinc-900 border border-zinc-850 text-white'
              }`}>
                <type.icon className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <span className="font-bold text-zinc-300 text-sm leading-tight text-left">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {offers
          .filter(offer => {
            const matchesFilter =
              selectedFilter === 'All Offers' ||
              (selectedFilter === 'Active' && offer.status === 'active') ||
              (selectedFilter === 'Upcoming' && offer.status === 'upcoming') ||
              (selectedFilter === 'Expired' && offer.status === 'expired');

            const matchesType = !selectedType || offer.offerType === selectedType;
            const matchesSearch = !searchQuery || offer.name.toLowerCase().includes(searchQuery.toLowerCase()) || offer.code.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesFilter && matchesType && matchesSearch;
          })
          .map((offer) => (
            <div key={offer.id} className="group bg-[#0c0c0e] rounded-[32px] border border-zinc-900/40 p-6 transition-all duration-500 relative overflow-hidden hover:-translate-y-1">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-[#d5b263]/10 border border-[#d5b263]/20 text-[#d5b263] rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                  <Tag className="w-7 h-7 stroke-[2.5px]" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    offer.status === 'active' ? 'bg-[#d5b263]/10 text-[#d5b263] border-[#d5b263]/25' :
                    offer.status === 'upcoming' ? 'bg-zinc-900 text-zinc-400 border-zinc-850' :
                    offer.status === 'scheduled' ? 'bg-zinc-900 text-zinc-400 border-zinc-850' :
                    'bg-zinc-900/50 text-zinc-600 border-zinc-900'
                  }`}>
                    {offer.status}
                  </span>
                  {(offer as any).scope === 'company' && (
                    <span className="bg-[#d5b263]/10 text-[#d5b263] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#d5b263]/25 uppercase tracking-tighter">GLOBAL</span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white line-clamp-1">{offer.name}</h3>
                  <p className="text-sm font-bold text-[#d5b263] tracking-tight mt-0.5">{offer.code}</p>
                </div>
                <p className="text-sm text-zinc-500 font-medium line-clamp-2 min-h-[2.5rem] leading-relaxed">
                  {offer.description || 'No description provided for this promotion.'}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Validity</span>
                    <span className="text-sm font-bold text-zinc-300">
                      {new Date(offer.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(offer.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div className="bg-[#d5b263]/10 text-[#d5b263] px-4 py-2 rounded-2xl text-base font-black border border-[#d5b263]/20">
                    {offer.offerType === 'percentage' && `${offer.discountValue}%`}
                    {offer.offerType === 'flat_discount' && `₹${offer.discountValue}`}
                    {offer.offerType === 'buy_1_get_1' && 'B1G1'}
                    {offer.offerType === 'category_discount' && `% OFF`}
                  </div>
                </div>
              </div>

              {/* Interactive Actions Overlay */}
              <div className="mt-8 pt-6 border-t border-zinc-900/40 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(offer)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    offer.status === 'active' ? 'bg-[#d5b263] text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                >
                  {offer.status === 'active' ? 'Live' : 'Paused'}
                  <div className={`w-2 h-2 rounded-full ${offer.status === 'active' ? 'bg-black animate-pulse' : 'bg-zinc-600'}`} />
                </button>

                <div className="flex items-center gap-1">
                  <button onClick={() => handleCopyCode(offer.code)} className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-all" title="Copy Code">
                    <Copy className="w-5 h-5 stroke-[2.5px]" />
                  </button>
                  <button onClick={() => openEditModal(offer)} className="p-2.5 text-zinc-500 hover:text-[#d5b263] hover:bg-[#d5b263]/10 rounded-xl transition-all" title="Edit Offer">
                    <Edit2 className="w-5 h-5 stroke-[2.5px]" />
                  </button>
                  <button onClick={() => handleDelete(offer.id)} className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-950/30 rounded-xl transition-all" title="Delete Offer">
                    <Trash2 className="w-5 h-5 stroke-[2.5px]" />
                  </button>
                </div>
              </div>

              {/* Subtle gold glow on hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#d5b263]/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-[3] transition-transform duration-1000 pointer-events-none" />
            </div>
          ))}
        
        {offers.length > 0 && offers.filter(offer => {
          const matchesFilter = selectedFilter === 'All Offers' || (selectedFilter === 'Active' && offer.status === 'active') || (selectedFilter === 'Upcoming' && offer.status === 'upcoming') || (selectedFilter === 'Expired' && offer.status === 'expired');
          const matchesType = !selectedType || offer.offerType === selectedType;
          const matchesSearch = !searchQuery || offer.name.toLowerCase().includes(searchQuery.toLowerCase()) || offer.code.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesFilter && matchesType && matchesSearch;
        }).length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 bg-zinc-900/10 rounded-[40px] border-2 border-dashed border-zinc-800/60">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-[#d5b263] border border-zinc-850">
              <Search className="w-10 h-10 stroke-[2.5px]" />
            </div>
            <div>
              <p className="text-xl font-black text-white">No offers found</p>
              <p className="text-zinc-500 font-medium">Try adjusting your filters or search query</p>
            </div>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedType(null); setSelectedFilter('All Offers'); }}
              className="text-[#d5b263] font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-hidden border border-zinc-900/40 flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 pb-6 border-b border-zinc-900/40 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {editingOffer ? 'Edit Promotion' : 'New Promotion'}
                </h2>
                <p className="text-sm font-medium text-zinc-500 mt-1">Configure your offer details below</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all group" 
                aria-label="Close modal"
              >
                <XCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
 
            <div className="flex-1 overflow-y-auto p-8 pt-6">
              <form id="offer-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Offer Name</label>
                    <input
                      type="text"
                      required
                      disabled={submitting}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-white placeholder:text-zinc-600"
                      placeholder="e.g. Weekend Feast"
                    />
                  </div>
 
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      disabled={submitting}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-white placeholder:text-zinc-600 resize-none"
                      rows={3}
                      placeholder="Details about the promotion..."
                    />
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Type</label>
                      <select
                        required
                        disabled={submitting}
                        value={formData.offerType}
                        onChange={e => setFormData({ ...formData, offerType: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-white appearance-none cursor-pointer"
                      >
                        <option value="percentage" className="bg-[#0c0c0e]">Percentage</option>
                        <option value="flat_discount" className="bg-[#0c0c0e]">Flat Off</option>
                        <option value="buy_1_get_1" className="bg-[#0c0c0e]">B1G1</option>
                        <option value="category_discount" className="bg-[#0c0c0e]">Category</option>
                      </select>
                    </div>
 
                    <div className="relative">
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Promo Code</label>
                      <input
                        type="text"
                        required
                        disabled={submitting}
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-black text-[#d5b263] placeholder:text-zinc-600"
                        placeholder="OFFER20"
                      />
                    </div>
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    {formData.offerType !== 'buy_1_get_1' && (
                      <div className={formData.offerType === 'category_discount' ? "col-span-1" : "col-span-2"}>
                        <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Value {formData.offerType === 'percentage' || formData.offerType === 'category_discount' ? '(%)' : '(₹)'}
                        </label>
                        <input
                          type="number"
                          required={formData.offerType !== 'buy_1_get_1'}
                          disabled={submitting}
                          min="0"
                          max={formData.offerType === 'percentage' || formData.offerType === 'category_discount' ? "100" : undefined}
                          value={formData.discountValue}
                          onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-black text-white placeholder:text-zinc-600"
                          placeholder="0"
                        />
                      </div>
                    )}
 
                    {formData.offerType === 'category_discount' && (
                      <div className="col-span-1">
                        <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Category</label>
                        <select
                          required={formData.offerType === 'category_discount'}
                          disabled={submitting}
                          value={formData.applicableCategoryId}
                          onChange={e => setFormData({ ...formData, applicableCategoryId: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-900/45 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-white appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-[#0c0c0e]">Select</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-[#0c0c0e]">{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
 
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        required
                        disabled={submitting}
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-900/45 px-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-zinc-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">End Date</label>
                      <input
                        type="datetime-local"
                        required
                        disabled={submitting}
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-900/45 px-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-bold text-zinc-300 text-xs"
                      />
                    </div>
                  </div>
 
                  {isAdmin && (
                    <div className="p-6 bg-[#d5b263]/5 rounded-[32px] space-y-4 border border-[#d5b263]/20 mt-4 overflow-hidden relative">
                      <Zap className="absolute top-0 right-0 w-24 h-24 text-[#d5b263]/10 -mr-8 -mt-8" />
                      <p className="text-[10px] font-black text-[#d5b263] uppercase tracking-widest relative z-10">Admin Authority Controls</p>
                      
                      <div className="relative z-10">
                        <select
                          value={formData.scope}
                          onChange={e => setFormData({ ...formData, scope: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-900/45 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#d5b263] outline-none transition-all font-black text-white text-xs mb-3"
                        >
                          <option value="restaurant" className="bg-[#0c0c0e]">Single Restaurant</option>
                          <option value="company" className="bg-[#0c0c0e]">Company-wide (Global)</option>
                        </select>
 
                        {formData.scope === 'company' && (
                          <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900/45 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              {['all', 'category', 'specific'].map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, targetType: t })}
                                  className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${formData.targetType === t ? 'bg-[#d5b263] text-black border-[#d5b263]' : 'bg-zinc-900 text-zinc-500 border-zinc-850'}`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
 
                            {formData.targetType === 'category' && (
                              <select
                                value={formData.targetCategory}
                                onChange={e => setFormData({ ...formData, targetCategory: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-850 px-4 py-2 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-[#d5b263]"
                              >
                                <option value="" className="bg-[#0c0c0e]">Select Category</option>
                                <option value="cafe" className="bg-[#0c0c0e]">Cafes</option>
                                <option value="fine_dining" className="bg-[#0c0c0e]">Fine Dining</option>
                                <option value="fast_food" className="bg-[#0c0c0e]">Fast Food</option>
                                <option value="bakery" className="bg-[#0c0c0e]">Bakery</option>
                              </select>
                            )}
 
                            {formData.targetType === 'specific' && (
                              <div className="max-h-32 overflow-y-auto border border-zinc-850 rounded-xl p-3 bg-zinc-900 space-y-2">
                                {allRestaurants.map(r => (
                                  <label key={r.id} className="flex items-center gap-2 p-1 hover:bg-[#d5b263]/10 rounded cursor-pointer transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={formData.targetRestaurantIds.includes(r.id)}
                                      onChange={e => {
                                        const ids = e.target.checked ? [...formData.targetRestaurantIds, r.id] : formData.targetRestaurantIds.filter(id => id !== r.id);
                                        setFormData({ ...formData, targetRestaurantIds: ids });
                                      }}
                                      className="w-4 h-4 rounded accent-[#d5b263]"
                                    />
                                    <span className="text-[10px] font-black text-zinc-400">{r.restaurantName}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
 
            {/* Modal Footer */}
            <div className="p-8 border-t border-zinc-900/40 flex gap-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 border border-zinc-900/40 text-zinc-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                form="offer-form"
                type="submit"
                disabled={submitting}
                className="flex-[2] px-6 py-4 bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black rounded-3xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{submitting ? 'Saving Changes...' : (editingOffer ? 'Commit Changes' : 'Launch Promotion')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Offers...</p>
    </div>
  )
}
