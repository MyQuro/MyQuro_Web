"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChefHat, Plus, Edit, Trash2, Eye, EyeOff,
  DollarSign, Clock, Users, TrendingUp,
  BarChart3, Settings, Menu as MenuIcon,
  CheckCircle, XCircle, AlertTriangle,
  Upload, X, Image as ImageIcon, Camera
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageURL?: string;
  isVeg: boolean;
  isActive: boolean;
  variants: MenuItemVariant[];
}

interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface RestaurantStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  averageRating: number;
}

export default function RestaurantDashboard() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  const { data: session, isPending } = authClient.useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Auth check
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/signin?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
  }, [session, isPending, router]);

  // Check user role for this restaurant
  useEffect(() => {
    const checkUserRole = async () => {
      if (!session?.user || !restaurantId) return;

      try {
        const status = await apiClient.getUserRestaurantStatus();
        const restaurantRole = status.allRestaurants?.find((r: any) => r.id === restaurantId)?.role;

        if (!restaurantRole || !['owner', 'manager', 'staff'].includes(restaurantRole)) {
          toast.error('You do not have permission to access this restaurant dashboard');
          router.push('/dashboard');
          return;
        }

        setUserRole(restaurantRole);
      } catch (error) {
        console.error('Failed to check user role:', error);
        toast.error('Failed to verify permissions');
        router.push('/dashboard');
      } finally {
        setCheckingRole(false);
      }
    };

    if (session?.user) {
      checkUserRole();
    }
  }, [session, restaurantId, router]);

  // Show loading while checking auth or role
  if (isPending || !session?.user || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('overview');
  const [menuData, setMenuData] = useState<MenuCategory[]>([]);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    isVeg: true,
    categoryId: '',
    imageURL: '',
    variants: [{ name: 'Regular', price: 0 }]
  });

  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, [restaurantId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [menuRes, statsRes] = await Promise.all([
        fetch(`/api/menus/${restaurantId}/manage`),
        fetch(`/api/restaurants/${restaurantId}/stats`)
      ]);

      if (menuRes.ok) {
        const menu = await menuRes.json();
        setMenuData(menu.categories || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const uploadImageToImgbb = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.data.url;
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImageToImgbb(file);
      setNewItem(prev => ({ ...prev, imageURL: imageUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const removeImage = () => {
    setNewItem(prev => ({ ...prev, imageURL: '' }));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await apiClient.createCategory(restaurantId, {
        name: newCategoryName,
        description: '',
        display_order: menuData.length + 1
      });
      toast.success('Category added successfully');
      setNewCategoryName('');
      setShowAddCategory(false);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !newItem.categoryId) return;

    try {
      const itemData = {
        ...newItem,
        variants: newItem.variants.map(v => ({ ...v, price: v.price * 100 })) // Convert to paise
      };

      await apiClient.createMenuItem(restaurantId, itemData);
      toast.success('Item added successfully');
      setNewItem({
        name: '',
        description: '',
        isVeg: true,
        categoryId: '',
        imageURL: '',
        variants: [{ name: 'Regular', price: 0 }]
      });
      setShowAddItem(null);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      await apiClient.updateMenuItem(restaurantId, itemId, { isActive: !currentStatus });
      toast.success(`Item ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await apiClient.deleteMenuItem(restaurantId, itemId);
      toast.success('Item deleted successfully');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <ChefHat className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Restaurant Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your menu and track performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/restro/${restaurantId}`)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Public Page</span>
              </button>
              <button
                onClick={() => router.push(`/restro/${restaurantId}/menu`)}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-500 border border-transparent rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-200 flex items-center space-x-2"
              >
                <MenuIcon className="w-4 h-4" />
                <span>View Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'menu', label: 'Menu Management', icon: MenuIcon },
              { id: 'orders', label: 'Orders', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Enhanced Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ₹{stats?.totalRevenue ? (stats.totalRevenue / 100).toFixed(0) : '0'}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+12.5%</span>
                <span className="text-gray-500 ml-1">from last month</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalOrders || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+8.2%</span>
                <span className="text-gray-500 ml-1">from last month</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Active Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.activeOrders || 0}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Clock className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-orange-600 font-medium">Processing</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Average Rating</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.averageRating?.toFixed(1) || 'N/A'}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Users className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-purple-600 font-medium">4.8/5</span>
                <span className="text-gray-500 ml-1">customer rating</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Menu Management Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-8">
            {/* Add Category Section */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Menu Categories</h2>
                  <p className="text-gray-600 mt-1">Organize your menu items into categories</p>
                </div>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-200 flex items-center space-x-2 transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Category</span>
                </button>
              </div>

              {showAddCategory && (
                <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-100">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      placeholder="Enter category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      onClick={() => setShowAddCategory(false)}
                      className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleAddCategory}
                      className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-md"
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuData.map(category => (
                  <div key={category.id} className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.items.length} items</p>
                      </div>
                      <button
                        onClick={() => setShowAddItem(category.id)}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title="Add Item"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Items Preview */}
                    <div className="space-y-3">
                      {category.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                          {item.imageURL ? (
                            <img src={item.imageURL} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-sm text-gray-600">₹{(item.variants[0]?.price / 100).toFixed(0) || '0'}</p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                      ))}
                      {category.items.length > 3 && (
                        <p className="text-sm text-gray-500 text-center">+{category.items.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Item Modal */}
            {showAddItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Add New Item</h3>
                      <button
                        onClick={() => setShowAddItem(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Image Upload */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Item Image</label>
                        <div
                          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                            dragOver ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          {newItem.imageURL ? (
                            <div className="relative">
                              <img
                                src={newItem.imageURL}
                                alt="Item preview"
                                className="max-w-full h-48 object-cover rounded-lg mx-auto"
                              />
                              <button
                                onClick={removeImage}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              {uploadingImage ? (
                                <div className="flex flex-col items-center">
                                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-500 mb-4"></div>
                                  <p className="text-gray-600">Uploading image...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                  <p className="text-lg font-medium text-gray-900 mb-2">Drop your image here</p>
                                  <p className="text-gray-600 mb-4">or click to browse</p>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                  />
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    Choose File
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                          <input
                            type="text"
                            placeholder="Enter item name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value, categoryId: showAddItem!})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                          <div className="flex space-x-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="veg"
                                checked={newItem.isVeg}
                                onChange={() => setNewItem({...newItem, isVeg: true})}
                                className="mr-2"
                              />
                              <span className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                                Vegetarian
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="veg"
                                checked={!newItem.isVeg}
                                onChange={() => setNewItem({...newItem, isVeg: false})}
                                className="mr-2"
                              />
                              <span className="flex items-center">
                                <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                                Non-Veg
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <textarea
                          placeholder="Describe your item..."
                          value={newItem.description}
                          onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                          rows={3}
                        />
                      </div>

                      {/* Variants */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Variants & Pricing</label>
                        <div className="space-y-3">
                          {newItem.variants.map((variant, index) => (
                            <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                              <input
                                type="text"
                                placeholder="Variant name"
                                value={variant.name}
                                onChange={(e) => {
                                  const updated = [...newItem.variants];
                                  updated[index].name = e.target.value;
                                  setNewItem({...newItem, variants: updated});
                                }}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <div className="flex items-center">
                                <span className="text-gray-600 mr-2">₹</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={variant.price}
                                  onChange={(e) => {
                                    const updated = [...newItem.variants];
                                    updated[index].price = parseFloat(e.target.value) || 0;
                                    setNewItem({...newItem, variants: updated});
                                  }}
                                  className="w-24 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4 pt-6">
                        <button
                          onClick={() => setShowAddItem(null)}
                          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddItem}
                          className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-200"
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab - Placeholder */}
        {activeTab === 'orders' && (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Orders Management</h2>
              <p className="text-gray-600">Orders management coming soon...</p>
            </div>
          </div>
        )}

        {/* Settings Tab - Placeholder */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Settings</h2>
              <p className="text-gray-600">Settings management coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}