"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { 
  Save, AlertCircle, MapPin, Store, 
  Phone, X, Globe, ShieldCheck, Info,
  Mail, Lock, ChevronDown, Building2, Utensils, Upload, Star
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';
import { ImageUploader } from '@/components/ImageUploader';
import { YearPicker } from '@/components/YearPicker';

// Restaurant type options
const RESTAURANT_TYPES = [
  'Fine Dining',
  'Casual Dining',
  'Fast Food',
  'Cafe',
  'Bistro',
  'Food Court',
  'Quick Service',
  'Cloud Kitchen',
  'Bakery',
  'Bar & Grill',
  'Family Restaurant',
  'Ethnic Restaurant',
  'Other'
];

export default function SettingsPage() {
  const { restaurant, refreshRestaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [cuisineInput, setCuisineInput] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fullRestaurantData, setFullRestaurantData] = useState<Record<string, any> | null>(null);
  const [loadingFullData, setLoadingFullData] = useState(true);
  
  // Comprehensive Form State matching API
  const [form, setForm] = useState({
    restaurantName: '',
    restaurantType: '',
    description: '',
    establishmentYear: '',
    cuisine: [] as string[],
    
    // Images (URLs)
    restaurantLogo: '',
    restaurantBanner: '',
    
    // Location
    restaurantAddress: '',
    city: '',
    state: '',
    postalCode: '',
    
    // Contact
    phoneNumber: '',
    email: '',
    website: '',
    googleReviewUrl: '',
    
    // Operations
    seatingCapacity: '',
    
    // Compliance & Tax
    gstNumber: '',
    fssaiLicenseNumber: '',
    defaultGstPercentage: '',

    // Geofencing
    latitude: '',
    longitude: '',
    geofenceRadius: '100',
    enforceProximity: false,
  });

  const [initialForm, setInitialForm] = useState(form);

  // Fetch full restaurant data on mount
  useEffect(() => {
    const fetchFullRestaurantData = async () => {
      if (!restaurant) return;
      
      try {
        setLoadingFullData(true);
        const data = await apiClient.getMyRestaurant() as any;
        setFullRestaurantData(data.restaurant);
        
        // Populate form with full data
        const newForm = {
          restaurantName: data.restaurant.restaurantName || '',
          restaurantType: data.restaurant.restaurantType || '',
          description: data.restaurant.description || '',
          establishmentYear: data.restaurant.establishmentYear?.toString() || '',
          cuisine: data.restaurant.cuisine || [],
          
          restaurantLogo: data.restaurant.restaurantLogo || '',
          restaurantBanner: data.restaurant.restaurantBanner || '',
          
          restaurantAddress: data.restaurant.restaurantAddress || '',
          city: data.restaurant.city || '',
          state: data.restaurant.state || '',
          postalCode: data.restaurant.postalCode?.toString() || '',
          
          phoneNumber: data.restaurant.phoneNumber || '',
          email: data.restaurant.email || '',
          website: data.restaurant.website || '',
          googleReviewUrl: data.restaurant.googleReviewUrl || '',
          
          seatingCapacity: data.restaurant.seatingCapacity?.toString() || '',
          
          gstNumber: data.restaurant.gstNumber || '',
          fssaiLicenseNumber: data.restaurant.fssaiLicenseNumber || '',
          defaultGstPercentage: data.restaurant.defaultGstPercentage?.toString() || '',

          latitude: data.restaurant.latitude || '',
          longitude: data.restaurant.longitude || '',
          geofenceRadius: data.restaurant.geofenceRadius?.toString() || '100',
          enforceProximity: data.restaurant.enforceProximity || false,
        };
        setForm(newForm);
        setInitialForm(newForm);
      } catch (error) {
        console.error('Error fetching full restaurant data:', error);
        toast.error('Failed to load restaurant details');
      } finally {
        setLoadingFullData(false);
      }
    };

    fetchFullRestaurantData();
  }, [restaurant]);
  
  // Permission check (after all hooks)
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;
  if (!permissions?.canManageSettings) {
    return <AccessDenied requiredRole="Owner only" message="You need owner access to modify restaurant settings" />;
  }

  // Check if form has changes
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  // --- Handlers ---

  const handleCuisineAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cuisineInput.trim()) {
      e.preventDefault();
      if (!form.cuisine.includes(cuisineInput.trim())) {
        setForm(prev => ({ ...prev, cuisine: [...prev.cuisine, cuisineInput.trim()] }));
      }
      setCuisineInput('');
    }
  };

  const removeCuisine = (tag: string) => {
    setForm(prev => ({ ...prev, cuisine: prev.cuisine.filter(c => c !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullRestaurantData) return;

    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      // No changes, just show message
      toast('No changes to save', { icon: 'ℹ️' });
    }
  };

  const confirmSave = async () => {
    setShowConfirmDialog(false);
    if (!fullRestaurantData) return;

    try {
      setLoading(true);
      
      // Parse numeric values before sending
      const payload = {
        ...form,
        establishmentYear: form.establishmentYear ? Number.parseInt(form.establishmentYear) : undefined,
        seatingCapacity: form.seatingCapacity ? Number.parseInt(form.seatingCapacity) : undefined,
        defaultGstPercentage: form.defaultGstPercentage ? Number.parseFloat(form.defaultGstPercentage) : undefined,
        geofenceRadius: form.geofenceRadius ? Number.parseInt(form.geofenceRadius) : undefined,
      };

      await apiClient.updateRestaurant(fullRestaurantData.id, payload);
      toast.success('Restaurant profile updated successfully');
      setInitialForm(form); // Update initial form after save
      await refreshRestaurant(); // Update global context
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelSave = () => {
    setShowConfirmDialog(false);
  };

  if (loadingFullData) return <div className="h-[60vh] flex flex-col items-center justify-center text-center">
    <div className="bg-blue-50 p-6 rounded-full mb-4"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
    <h2 className="text-xl font-bold text-gray-900">Loading Settings...</h2>
    <p className="text-gray-500 mt-2">Fetching your restaurant details</p>
  </div>;

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (!permissions?.canManageSettings) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="bg-red-50 p-6 rounded-full mb-4"><AlertCircle className="w-10 h-10 text-red-500" /></div>
        <h2 className="text-xl font-bold text-gray-900">Settings Restricted</h2>
        <p className="text-gray-500 mt-2">Only owners and managers can update restaurant details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 sm:px-6 lg:px-8">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-100">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Restaurant Settings</h1>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
              Manage your brand identity, contact information, and operational details.
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !hasChanges}
          className="w-full sm:w-auto flex items-center justify-center px-8 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
          <Save className="w-4 h-4 ml-2" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Brand Identity */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">Brand Identity</h2>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Restaurant Name */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                Restaurant Name <span className="text-red-500">*</span>
              </label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                value={form.restaurantName}
                onChange={e => setForm({...form, restaurantName: e.target.value})}
                placeholder="Enter restaurant name"
              />
            </div>

            {/* Restaurant Type Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Restaurant Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none bg-white flex items-center justify-between hover:border-gray-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className={form.restaurantType ? 'text-gray-900' : 'text-gray-400'}>
                      {form.restaurantType || 'Select Type'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showTypeDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-y-auto">
                    {RESTAURANT_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setForm({...form, restaurantType: type});
                          setShowTypeDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-red-50 transition-colors ${
                          form.restaurantType === type ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-900'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Year Picker */}
            <YearPicker
              value={form.establishmentYear}
              onChange={(year) => setForm({...form, establishmentYear: year})}
              label="Establishment Year"
              minYear={1900}
              maxYear={new Date().getFullYear()}
            />

            {/* Description */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 resize-none"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Brief description of your restaurant"
              />
            </div>

            {/* Cuisine Tags */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cuisine Types</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.cuisine.map((tag, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeCuisine(tag)}
                      className="hover:bg-red-100 rounded-full p-0.5"
                      aria-label={`Remove ${tag} cuisine`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                value={cuisineInput}
                onChange={e => setCuisineInput(e.target.value)}
                onKeyDown={handleCuisineAdd}
                placeholder="Add cuisine type and press Enter"
              />
            </div>
          </div>
        </section>

        {/* 2. Visual Identity */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Upload className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg">Visual Identity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Upload your restaurant logo and banner</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Logo Uploader */}
            <ImageUploader
              value={form.restaurantLogo}
              onChange={(url) => setForm({...form, restaurantLogo: url})}
              label="Restaurant Logo"
              aspectRatio="square"
              maxSize={5}
            />

            {/* Banner Uploader */}
            <ImageUploader
              value={form.restaurantBanner}
              onChange={(url) => setForm({...form, restaurantBanner: url})}
              label="Restaurant Banner"
              aspectRatio="landscape"
              maxSize={10}
            />
          </div>
        </section>

        {/* 3. Location & Contact */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg">Location & Contact</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage your address and contact information</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Address - READ ONLY */}
            <div className="lg:col-span-2 space-y-2">
              <label htmlFor="restaurantAddress" className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Address Line (Protected)
              </label>
              <div className="relative">
                <input 
                  id="restaurantAddress"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                  value={form.restaurantAddress}
                  aria-label="Restaurant address (protected field)"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* City - READ ONLY */}
            <div className="space-y-2">
              <label htmlFor="city" className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                City (Protected)
              </label>
              <input 
                id="city"
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                value={form.city}
                aria-label="City (protected field)"
              />
            </div>

            {/* State & Postal Code - READ ONLY */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="state" className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  State
                </label>
                <input 
                  id="state"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                  value={form.state}
                  aria-label="State (protected field)"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="postalCode" className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Zip
                </label>
                <input 
                  id="postalCode"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                  value={form.postalCode}
                  aria-label="Postal code (protected field)"
                />
              </div>
            </div>

            {/* Geofencing Configuration */}
            <div className="lg:col-span-2 space-y-4 border-t border-gray-100 pt-6 mt-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Ordering Geofence (QR Code Verification)
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Configure your restaurant's coordinates and geofence radius to prevent customers from scanning QR code photos and ordering remotely.
              </p>
              
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="enforceProximity"
                  className="w-4.5 h-4.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  checked={form.enforceProximity}
                  onChange={e => setForm({...form, enforceProximity: e.target.checked})}
                />
                <div className="space-y-0.5">
                  <label htmlFor="enforceProximity" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                    Enforce Ordering Location Check
                  </label>
                  <p className="text-[11px] text-gray-500">
                    If checked, users must be physically within the geofence to open a session and order.
                  </p>
                </div>
              </div>

              {form.enforceProximity && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="latitude" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Latitude
                    </label>
                    <input 
                      id="latitude"
                      type="text"
                      placeholder="e.g. 28.6139"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 text-sm"
                      value={form.latitude}
                      onChange={e => setForm({...form, latitude: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="longitude" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Longitude
                    </label>
                    <input 
                      id="longitude"
                      type="text"
                      placeholder="e.g. 77.2090"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 text-sm"
                      value={form.longitude}
                      onChange={e => setForm({...form, longitude: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="geofenceRadius" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Allowed Radius (Meters)
                    </label>
                    <input 
                      id="geofenceRadius"
                      type="number"
                      placeholder="100"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 text-sm"
                      value={form.geofenceRadius}
                      onChange={e => setForm({...form, geofenceRadius: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              setForm(prev => ({
                                ...prev,
                                latitude: position.coords.latitude.toString(),
                                longitude: position.coords.longitude.toString()
                              }));
                              toast.success("Coordinates updated from browser location!");
                            },
                            (err) => {
                              toast.error("Failed to get location: " + err.message);
                            }
                          );
                        } else {
                          toast.error("Geolocation is not supported by your browser");
                        }
                      }}
                      className="px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl text-xs hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      Set to My Current Location
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Important Notice for Address */}
            <div className="lg:col-span-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-blue-900">Address Change Request</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    To update your restaurant address, please contact our support team at{' '}
                    <a href="mailto:support@myquro.com" className="underline font-bold hover:text-blue-900">
                      support@myquro.com
                    </a>
                    {' '}with your restaurant details and new address.
                  </p>
                </div>
              </div>
            </div>

            {/* Phone - Editable */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3" /> 
                Phone Number
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 transition-all">
                <div className="flex items-center pl-4 pr-2">
                  <svg width="20" height="15" viewBox="0 0 640 480" className="mr-2 rounded-[2px] overflow-hidden">
                    <path fill="#f93" d="M0 0h640v160H0z"></path>
                    <path fill="#fff" d="M0 160h640v160H0z"></path>
                    <path fill="#128807" d="M0 320h640v160H0z"></path>
                    <g transform="matrix(3.2 0 0 3.2 320 240)">
                      <circle r="20" fill="#008"></circle>
                      <circle r="17.5" fill="#fff"></circle>
                      <circle r="3.5" fill="#008"></circle>
                      <g id="d">
                        <g id="c">
                          <g id="b">
                            <g id="a" fill="#008">
                              <circle r=".875" transform="rotate(7.5 -8.75 133.5)"></circle>
                              <path d="M0 17.5.6 7 0 2l-.6 5L0 17.5z"></path>
                            </g>
                            <use href="#a" transform="rotate(15)"></use>
                          </g>
                          <use href="#b" transform="rotate(30)"></use>
                        </g>
                        <use href="#c" transform="rotate(60)"></use>
                      </g>
                      <use href="#d" transform="rotate(120)"></use>
                      <use href="#d" transform="rotate(-120)"></use>
                    </g>
                  </svg>
                  <span className="text-gray-600 font-medium">+91</span>
                </div>
                <input 
                  type="tel"
                  className="flex-1 px-3 py-3 outline-none text-gray-900"
                  value={form.phoneNumber.replace(/^\+91\s*/, '')}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    if (value === '' || /^[6-9]/.test(value)) {
                      setForm({...form, phoneNumber: value ? '+91 ' + value : ''});
                    }
                  }}
                  placeholder="9876543210"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                />
              </div>
            </div>

             {/* Website - Editable */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3" /> 
                Website
              </label>
              <input 
                type="url"
                placeholder="https://yourrestaurant.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900"
                value={form.website}
                onChange={e => setForm({...form, website: e.target.value})}
              />
            </div>

            {/* Google Review Link - Editable */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 
                Google Review Link
              </label>
              <input 
                type="url"
                placeholder="https://g.page/r/.../review"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900"
                value={form.googleReviewUrl}
                onChange={e => setForm({...form, googleReviewUrl: e.target.value})}
              />
            </div>

            {/* Seating Capacity - Editable */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Seating Capacity</label>
              <input 
                type="number"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900"
                value={form.seatingCapacity}
                onChange={e => setForm({...form, seatingCapacity: e.target.value})}
                placeholder="Enter total number of seats"
              />
            </div>
          </div>
        </section>

        {/* 4. Compliance & Tax Information */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 text-lg">Compliance & Tax</h2>
              <p className="text-xs text-gray-500 mt-0.5">Legal and tax registration details</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* GST Number - READ ONLY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                GST Number (Protected)
                <button
                  type="button"
                  className="ml-auto group relative"
                  aria-label="GST Information"
                >
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                  <div className="hidden group-hover:block absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    GST number is locked for compliance. Contact support to update.
                  </div>
                </button>
              </label>
              <div className="relative">
                <input 
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none font-mono"
                  placeholder="Not Provided"
                  value={form.gstNumber}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* FSSAI License - READ ONLY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                FSSAI License (Protected)
                <button
                  type="button"
                  className="ml-auto group relative"
                  aria-label="FSSAI Information"
                >
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                  <div className="hidden group-hover:block absolute z-10 right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    FSSAI license is locked for compliance. Contact support to update.
                  </div>
                </button>
              </label>
              <div className="relative">
                <input 
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none font-mono"
                  placeholder="Not Provided"
                  value={form.fssaiLicenseNumber}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Default GST Percentage - READ ONLY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Default Tax Rate (Protected)
                <button
                  type="button"
                  className="ml-auto group relative"
                  aria-label="Tax Rate Information"
                >
                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                  <div className="hidden group-hover:block absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    Default tax rate is locked. Contact support for changes.
                  </div>
                </button>
              </label>
              <div className="relative">
                <input 
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed outline-none pr-10"
                  value={form.defaultGstPercentage}
                  placeholder="0"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Important Notice for Compliance Changes */}
            <div className="lg:col-span-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900">Compliance Document Updates</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    GST, FSSAI, and tax rate changes require verification. Please email{' '}
                    <a href="mailto:compliance@myquro.com" className="underline font-bold hover:text-amber-900">
                      compliance@myquro.com
                    </a>
                    {' '}with updated documents and restaurant ID for processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save these changes to your restaurant profile? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelSave}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
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
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Settings...</p>
    </div>
  )
}