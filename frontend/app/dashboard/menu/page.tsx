"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  Plus, Edit2, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  AlertCircle, Search, Layers, Utensils, IndianRupee,
  Move, Upload, Leaf, Beef, Eye, Menu, Trash2, Settings, RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, rupeesToPaise, paiseToRupees, capitalize } from '@/lib/utils';
import { getRestaurantPermissions } from '@/lib/permissions';
import toast from 'react-hot-toast';

// --- Image Upload Helper ---
const uploadImageToImgbb = async (file: File): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('IMGBB API key not configured');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.data.url;
};

// --- Types ---
interface MenuCategory {
  id: string;
  category: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  isActive: boolean;
  isVeg: boolean;
  imageURL?: string;
  variants: MenuItemVariant[];
}

interface MenuItemVariant {
  id: string;
  variantName: string;
  price: number;
  isActive: boolean;
  foodType: string;
  portionSize: string;
}

// --- Components ---

// 1. Status Toggle Switch
const StatusToggle = ({ isActive, onClick, isLoading }: { isActive: boolean; onClick: () => void; isLoading?: boolean }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={isLoading}
    aria-label={`Toggle status: currently ${isActive ? 'active' : 'inactive'}`}
    title={`Toggle status: currently ${isActive ? 'active' : 'inactive'}`}
    className={`
      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-300 ease-in-out active:scale-95
      ${isActive ? 'bg-[#d5b263]' : 'bg-slate-200'}
      ${isLoading ? 'opacity-40 cursor-not-allowed' : ''}
    `}
  >
    <span className={`
      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md shadow-black/15
      transition-transform duration-300 ease-in-out
      ${isActive ? 'translate-x-5' : 'translate-x-0'}
    `} />
  </button>
);

// 2. Veg/Non-Veg Icon
const FoodTypeIcon = ({ type }: { type?: string }) => {
  if (!type) return null;
  const t = type.toLowerCase();
  const isVeg = t === 'veg' || t === 'vegan' || t === 'vegetarian';

  return (
    <div 
      className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border select-none ${
        isVeg 
          ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-700' 
          : 'bg-rose-50/70 border-rose-200/60 text-rose-700'
      }`} 
      title={type}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
      {isVeg ? 'Veg' : 'Non-Veg'}
    </div>
  );
};

export default function MenuManagementPage() {
  const { restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [extras, setExtras] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    isAvailable: boolean;
    isActive: boolean;
  }>>([]);
  const [assignments, setAssignments] = useState<Array<{
    id: string;
    extraId: string;
    extraName: string;
    extraPrice: number;
    categoryId: string | null;
    categoryName: string | null;
    menuItemId: string | null;
    menuItemName: string | null;
    variantId: string | null;
    variantName: string | null;
    isGlobal: boolean;
    isActive: boolean;
  }>>([]);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<{
    type: 'category' | 'item' | 'variant' | 'global';
    id: string;
    name: string;
  } | null>(null);
  const [selectedAssignmentExtras, setSelectedAssignmentExtras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Accordion State
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'category' | 'item' | 'variant' | 'extra';
    mode: 'create' | 'edit';
    parentId?: string; // categoryId for items, itemId for variants
    data?: MenuCategory | MenuItem | MenuItemVariant | any; // Pre-filled data for editing
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    foodType: 'veg',
    portionSize: '',
    imageURL: '',
    isVeg: true
  });
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState<{ [key: string]: boolean }>({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createSimilarItem, setCreateSimilarItem] = useState(false);
  const [existingSimilarItem, setExistingSimilarItem] = useState<MenuItem | null>(null);

  // Permission check
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;

  // Use ref to track loading state to prevent race conditions
  const loadingRef = useRef(false);

  // --- Data Fetching ---
  const loadMenu = useCallback(async () => {
    console.log('🔄 MENU: loadMenu called');
    if (!restaurant) {
      console.log('❌ MENU: No restaurant found');
      return;
    }

    if (loadingRef.current) {
      console.log('⏳ MENU: Already loading (ref check), skipping');
      return;
    }

    console.log('📡 MENU: Starting menu fetch for restaurant:', restaurant.id);
    loadingRef.current = true;
    setLoading(true);

    try {
      console.log('🔍 MENU: Calling API getManagementMenu, getExtras, getExtraAssignments in parallel');

      const [menuData, extrasData, assignmentsData] = await Promise.all([
        apiClient.getManagementMenu(restaurant.id).catch(err => {
          console.error('❌ MENU: Failed to load menu data:', err);
          throw err; // Menu is critical
        }),
        apiClient.getExtras(restaurant.id).catch(err => {
          console.error('❌ MENU: Failed to load extras:', err);
          return { extras: [] }; // Non-critical
        }),
        apiClient.getExtraAssignments(restaurant.id).catch(err => {
          console.error('❌ MENU: Failed to load assignments:', err);
          return { assignments: [] }; // Non-critical
        })
      ]);

      // Process Menu Data
      console.log('✅ MENU: Menu data received, categories count:', (menuData as any).categories?.length || 0);
      const sortedCats = ((menuData as any).categories || []).sort((a: MenuCategory, b: MenuCategory) => a.displayOrder - b.displayOrder);
      setCategories(sortedCats);

      // Process Extras Data
      console.log('✅ MENU: Extras loaded, count:', (extrasData as any).extras?.length || 0);
      setExtras((extrasData as any).extras || []);

      // Process Assignments Data
      console.log('✅ MENU: Assignments loaded, count:', (assignmentsData as any).assignments?.length || 0);
      setAssignments((assignmentsData as any).assignments || []);

    } catch (error) {
      console.error('❌ MENU: Failed to load menu:', error);
      toast.error('Failed to load menu');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      console.log('🏁 MENU: Load menu completed');
    }
  }, [restaurant]);

  // Manual refresh function
  const refreshMenu = useCallback(async () => {
    console.log('🔄 MENU: Manual refresh triggered');
    if (restaurant && !loadingRef.current) {
      await loadMenu();
    }
  }, [restaurant]); // Remove loadMenu from dependencies

  useEffect(() => {
    console.log('🔄 MENU: useEffect triggered, restaurant:', restaurant?.id);
    if (restaurant && !loadingRef.current) {
      console.log('📡 MENU: Restaurant available, calling loadMenu');
      loadMenu();
    } else {
      console.log('❌ MENU: No restaurant available or already loading');
    }
  }, [restaurant]); // Remove loadMenu from dependencies to prevent infinite loop

  useEffect(() => {
    const savedLayout = localStorage.getItem('menuLayout') as 'list' | 'grid';
    if (savedLayout) setLayout(savedLayout);
  }, []);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered categories with optimized memoization
  const filteredCategories = useMemo(() => {
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          (dietaryFilter === 'all' || (dietaryFilter === 'veg' ? item.isVeg : !item.isVeg)) &&
          (debouncedSearchQuery === '' || item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
        )
      }))
      .filter(cat => cat.items.length > 0 || (debouncedSearchQuery === '' && cat.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())));
  }, [categories, debouncedSearchQuery, dietaryFilter]);

  // Scroll Spy logic
  useEffect(() => {
    if (filteredCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(filteredCategories[0].id);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveCategoryId(entry.target.id.replace('cat-', ''));
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    filteredCategories.forEach(cat => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredCategories]);

  if (loading) return <MenuSkeleton />;

  // --- Handlers ---

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategoryId) return;

    const draggedIndex = categories.findIndex(c => c.id === draggedCategory);
    const targetIndex = categories.findIndex(c => c.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder categories locally
    const newCategories = [...categories];
    const [draggedItem] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    // Update displayOrder
    const updatedCategories = newCategories.map((cat, index) => ({
      ...cat,
      displayOrder: index
    }));

    setCategories(updatedCategories);

    // Save to backend
    setReordering(true);
    try {
      const orderedIds = updatedCategories.map(cat => cat.id);
      await apiClient.reorderCategories(restaurant!.id, orderedIds);
      toast.success('Categories reordered');
    } catch (error) {
      toast.error('Failed to save order');
      // Revert on error
      loadMenu();
    } finally {
      setReordering(false);
    }

    setDraggedCategory(null);
    setDragOverCategory(null);
  };

  // 1. Open Modal Helper
  const openModal = (type: 'category' | 'item' | 'variant' | 'extra', mode: 'create' | 'edit', parentId?: string, data?: any) => {
    setModalConfig({ type, mode, parentId, data });
    setFormData({
      name: data?.variantName || data?.category || data?.name || '',
      description: data?.description || '',
      price: data?.price ? paiseToRupees(data.price).toString() : '',
      foodType: data?.foodType || 'veg',
      portionSize: data?.portionSize || '',
      imageURL: data?.imageURL || '',
      isVeg: data?.isVeg !== undefined ? data.isVeg : true
    });
    setIsUploading(false);
    setCreateSimilarItem(false);

    // Check for existing similar item
    if (type === 'item' && mode === 'create') {
      const similarItem = categories.flatMap(cat => cat.items).find(item =>
        item.name.toLowerCase() === (data?.name || '').toLowerCase() && item.isVeg !== (data?.isVeg ?? true)
      );
      setExistingSimilarItem(similarItem || null);
    } else {
      setExistingSimilarItem(null);
    }

    setModalOpen(true);
  };

  // 2. Submit Logic (Create & Edit) with optimistic updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !modalConfig || submitting) return;

    setSubmitting(true);
    setModalOpen(false); // Close modal instantly

    try {
      const { type, mode, parentId, data } = modalConfig;

      // --- CATEGORY ---
      if (type === 'category') {
        if (mode === 'create') {
          // Optimistic update for category creation
          const tempId = `temp-${Date.now()}`;
          const newCategory: MenuCategory = {
            id: tempId,
            category: formData.name,
            description: formData.description,
            displayOrder: categories.length,
            isActive: true,
            items: []
          };
          setCategories(prev => [...prev, newCategory]);

          try {
            const result = await apiClient.createCategory(restaurant.id, {
              name: formData.name,
              description: formData.description,
              display_order: categories.length + 1
            });

            // Replace temp category with real one
            setCategories(prev => prev.map(cat =>
              cat.id === tempId ? { ...cat, id: (result as any).category?.id || (result as any).id || tempId } : cat
            ));

            toast.success('Category created');
          } catch (error) {
            // Remove temp category on error
            setCategories(prev => prev.filter(cat => cat.id !== tempId));
            throw error;
          }
        } else if (mode === 'edit' && data?.id) {
          // Optimistic update for category edit
          const originalCategory = categories.find(cat => cat.id === data.id);
          setCategories(prev => prev.map(cat =>
            cat.id === data.id ? { ...cat, category: formData.name, description: formData.description } : cat
          ));

          try {
            await apiClient.updateCategory(restaurant.id, data.id, {
              name: formData.name,
              description: formData.description
            });
            toast.success('Category updated');
          } catch (error) {
            // Revert on error
            setCategories(prev => prev.map(cat =>
              cat.id === data.id ? originalCategory! : cat
            ));
            throw error;
          }
        }
      }

      // --- MENU ITEM ---
      else if (type === 'item' && parentId) {
        if (mode === 'create') {
          // Optimistic update for item creation
          const tempId = `temp-${Date.now()}`;
          const newItem: MenuItem = {
            id: tempId,
            name: formData.name,
            description: formData.description,
            categoryId: parentId,
            isActive: true,
            isVeg: formData.isVeg,
            imageURL: formData.imageURL,
            variants: []
          };

          setCategories(prev => prev.map(cat =>
            cat.id === parentId ? { ...cat, items: [...cat.items, newItem] } : cat
          ));
          setExpandedCats(prev => new Set(prev).add(parentId));

          try {
            const result: any = await apiClient.createMenuItem(restaurant.id, {
              name: formData.name,
              description: formData.description,
              categoryId: parentId,
              isVeg: formData.isVeg,
              imageURL: formData.imageURL
            });

            // Replace temp ID with real ID without full reload
            const realId = result?.item?.id || result?.id || tempId;
            setCategories(prev => prev.map(cat =>
              cat.id === parentId
                ? { ...cat, items: cat.items.map(item => item.id === tempId ? { ...item, id: realId } : item) }
                : cat
            ));

            toast.success('Item created');

            // Copy variants from existing similar item if requested
            if (createSimilarItem && existingSimilarItem) {
              // Find the newly created item
              const newItem = categories.flatMap(cat => cat.items).find(item =>
                item.name === formData.name && item.isVeg === formData.isVeg && item.categoryId === parentId
              );
              if (newItem) {
                for (const variant of existingSimilarItem.variants) {
                  try {
                    await apiClient.createItemVariant(restaurant.id, newItem.id, {
                      name: variant.variantName,
                      variantName: variant.variantName,
                      price: variant.price,
                      additionalInfo: {
                        foodType: formData.isVeg ? 'veg' : 'non-veg',
                        portionSize: variant.portionSize
                      }
                    });
                  } catch (error) {
                    console.error('Failed to copy variant:', error);
                  }
                }
                await loadMenu(); // Reload again to get the variants
                toast.success('Variants copied from similar item');
              }
            }
          } catch (error) {
            // Remove temp item on error
            setCategories(prev => prev.map(cat =>
              cat.id === parentId ? { ...cat, items: cat.items.filter(item => item.id !== tempId) } : cat
            ));
            throw error;
          }
        } else if (mode === 'edit' && data?.id) {
          // Optimistic update for item edit
          const originalItem = categories.flatMap(cat => cat.items).find(item => item.id === data.id);
          setCategories(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(item =>
              item.id === data.id ? {
                ...item,
                name: formData.name,
                description: formData.description,
                isVeg: formData.isVeg,
                imageURL: formData.imageURL
              } : item
            )
          })));

          try {
            await apiClient.updateMenuItem(restaurant.id, data.id, {
              name: formData.name,
              description: formData.description,
              isVeg: formData.isVeg,
              imageURL: formData.imageURL
            });
            toast.success('Item updated');
          } catch (error) {
            // Revert on error
            setCategories(prev => prev.map(cat => ({
              ...cat,
              items: cat.items.map(item =>
                item.id === data.id ? originalItem! : item
              )
            })));
            throw error;
          }
        }
      }

      // --- VARIANT ---
      else if (type === 'variant' && parentId) {
        // Find the item to get isVeg
        let itemIsVeg = true; // default
        for (const cat of categories) {
          const item = cat.items.find(i => i.id === parentId);
          if (item) {
            itemIsVeg = item.isVeg;
            break;
          }
        }
        const payload = {
          name: formData.name,
          variantName: formData.name,
          price: rupeesToPaise(Number(formData.price)),
          additionalInfo: {
            foodType: itemIsVeg ? 'veg' : 'non-veg',
            portionSize: formData.portionSize
          }
        };

        if (mode === 'create') {
          // Optimistic update for variant creation
          const tempId = `temp-${Date.now()}`;
          const newVariant: MenuItemVariant = {
            id: tempId,
            variantName: formData.name,
            price: rupeesToPaise(Number(formData.price)),
            isActive: true,
            foodType: itemIsVeg ? 'veg' : 'non-veg',
            portionSize: formData.portionSize
          };

          setCategories(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(item =>
              item.id === parentId ? { ...item, variants: [...item.variants, newVariant] } : item
            )
          })));
          setExpandedItems(prev => new Set(prev).add(parentId));

          try {
            const result: any = await apiClient.createItemVariant(restaurant.id, parentId, payload);

            // Replace temp ID with real ID without full reload
            const realId = result?.variant?.id || result?.id || tempId;
            setCategories(prev => prev.map(cat => ({
              ...cat,
              items: cat.items.map(item =>
                item.id === parentId ? {
                  ...item,
                  variants: item.variants.map(v => v.id === tempId ? { ...v, id: realId } : v)
                } : item
              )
            })));

            toast.success('Variant created');
          } catch (error) {
            // Remove temp variant on error
            setCategories(prev => prev.map(cat => ({
              ...cat,
              items: cat.items.map(item =>
                item.id === parentId ? { ...item, variants: item.variants.filter(v => v.id !== tempId) } : item
              )
            })));
            throw error;
          }
        } else if (mode === 'edit' && data?.id) {
          // Optimistic update for variant edit
          const originalVariant = categories.flatMap(cat => cat.items).flatMap(item => item.variants).find(v => v.id === data.id);
          setCategories(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(item => ({
              ...item,
              variants: item.variants.map(variant =>
                variant.id === data.id ? {
                  ...variant,
                  variantName: formData.name,
                  price: rupeesToPaise(Number(formData.price)),
                  portionSize: formData.portionSize
                } : variant
              )
            }))
          })));

          try {
            await apiClient.updateItemVariant(restaurant.id, parentId, data.id, payload);
            toast.success('Variant updated');
          } catch (error) {
            // Revert on error
            setCategories(prev => prev.map(cat => ({
              ...cat,
              items: cat.items.map(item => ({
                ...item,
                variants: item.variants.map(variant =>
                  variant.id === data.id ? originalVariant! : variant
                )
              }))
            })));
            throw error;
          }
        }
      }

      // --- EXTRA ---
      else if (type === 'extra') {
        if (mode === 'create') {
          // Optimistic update for extra creation
          const tempId = `temp-${Date.now()}`;
          const newExtra = {
            id: tempId,
            name: formData.name,
            description: formData.description,
            price: rupeesToPaise(Number(formData.price)),
            isAvailable: true,
            isActive: true
          };
          setExtras(prev => [...prev, newExtra]);

          try {
            const result = await apiClient.createExtra(restaurant.id, {
              name: formData.name,
              description: formData.description || undefined,
              price: rupeesToPaise(Number(formData.price))
            });

            // Replace temp extra with real one
            setExtras(prev => prev.map(extra =>
              extra.id === tempId ? { ...extra, id: result.extra.id } : extra
            ));

            toast.success('Extra created');
          } catch (error) {
            // Remove temp extra on error
            setExtras(prev => prev.filter(extra => extra.id !== tempId));
            throw error;
          }
        } else if (mode === 'edit' && data?.id) {
          // Optimistic update for extra edit
          const originalExtra = extras.find(extra => extra.id === data.id);
          setExtras(prev => prev.map(extra =>
            extra.id === data.id ? {
              ...extra,
              name: formData.name,
              description: formData.description,
              price: rupeesToPaise(Number(formData.price))
            } : extra
          ));

          try {
            await apiClient.updateExtra(data.id, {
              name: formData.name,
              description: formData.description,
              price: rupeesToPaise(Number(formData.price))
            });
            toast.success('Extra updated');
          } catch (error) {
            // Revert on error
            setExtras(prev => prev.map(extra =>
              extra.id === data.id ? originalExtra! : extra
            ));
            throw error;
          }
        }
      }
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Toggle Status (instant API calls)
  const handleToggleStatus = async (type: 'category' | 'item' | 'variant' | 'extra', id: string, newStatus: boolean, parentId?: string) => {
    if (!restaurant) return;

    // Set loading state
    setLoadingStatuses(prev => ({ ...prev, [`${type}-${id}`]: true }));

    try {
      // Immediate API call
      if (type === 'category') {
        if (newStatus) {
          await apiClient.activateCategory(restaurant.id, id);
        } else {
          await apiClient.deactivateCategory(restaurant.id, id);
        }
        setCategories(prev => prev.map(cat =>
          cat.id === id ? { ...cat, isActive: newStatus } : cat
        ));
      } else if (type === 'item') {
        if (newStatus) {
          await apiClient.activateMenuItem(restaurant.id, id);
        } else {
          await apiClient.deactivateMenuItem(restaurant.id, id);
        }
        setCategories(prev => prev.map(cat => ({
          ...cat,
          items: cat.items.map(item =>
            item.id === id ? { ...item, isActive: newStatus } : item
          )
        })));
      } else if (type === 'variant' && parentId) {
        if (newStatus) {
          await apiClient.activateItemVariant(restaurant.id, parentId, id);
        } else {
          await apiClient.deactivateItemVariant(restaurant.id, parentId, id);
        }
        setCategories(prev => prev.map(cat => ({
          ...cat,
          items: cat.items.map(item => ({
            ...item,
            variants: item.variants.map(variant =>
              variant.id === id ? { ...variant, isActive: newStatus } : variant
            )
          }))
        })));
      } else if (type === 'extra') {
        // Toggle only the DIRECT assignments for this extra — NOT the global extra definition.
        // Calling updateExtra({ isActive }) would enable/disable it for ALL items globally,
        // regardless of whether those items specifically have the extra assigned.
        const directAssignments = assignments.filter(a => a.extraId === id);

        if (directAssignments.length > 0) {
          await Promise.all(directAssignments.map(a =>
            apiClient.toggleExtraAssignment(a.id, newStatus)
          ));
        } else {
          // No assignments yet — fall back to global extra toggle (mark as available/unavailable)
          await apiClient.updateExtra(id, { isAvailable: newStatus });
        }

        // Update local assignment state
        setAssignments(prev => prev.map(a =>
          a.extraId === id ? { ...a, isActive: newStatus } : a
        ));
        // Reflect on the extra card toggle
        setExtras(prev => prev.map(extra =>
          extra.id === id ? { ...extra, isActive: newStatus } : extra
        ));
      }

      toast.success(`${capitalize(type)} ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${newStatus ? 'activate' : 'deactivate'} ${type}`);
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [`${type}-${id}`]: false }));
    }
  };

  // 4. Delete handlers
  const handleDeleteCategory = async (categoryId: string) => {
    if (!restaurant || !confirm('Are you sure you want to delete this category and all its items? This action cannot be undone.')) return;

    setLoadingStatuses(prev => ({ ...prev, [`category-${categoryId}`]: true }));

    try {
      await apiClient.deleteCategory(restaurant.id, categoryId);
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [`category-${categoryId}`]: false }));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!restaurant || !confirm('Are you sure you want to delete this menu item and all its variants? This action cannot be undone.')) return;

    setLoadingStatuses(prev => ({ ...prev, [`item-${itemId}`]: true }));

    try {
      await apiClient.deleteMenuItem(restaurant.id, itemId);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.id !== itemId)
      })));
      toast.success('Menu item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete menu item');
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [`item-${itemId}`]: false }));
    }
  };

  const handleDeleteVariant = async (variantId: string, itemId: string) => {
    if (!restaurant || !confirm('Are you sure you want to delete this variant? This action cannot be undone.')) return;

    setLoadingStatuses(prev => ({ ...prev, [`variant-${variantId}`]: true }));

    try {
      await apiClient.deleteItemVariant(restaurant.id, itemId, variantId);
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({
          ...item,
          variants: item.variants.filter(variant => variant.id !== variantId)
        }))
      })));
      toast.success('Variant deleted successfully');
    } catch (error) {
      toast.error('Failed to delete variant');
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [`variant-${variantId}`]: false }));
    }
  };

  const handleDeleteExtra = async (extraId: string) => {
    if (!restaurant || !confirm('Are you sure you want to delete this extra? This action cannot be undone.')) return;

    setLoadingStatuses(prev => ({ ...prev, [`extra-${extraId}`]: true }));

    try {
      await apiClient.deleteExtra(extraId);
      setExtras(prev => prev.filter(extra => extra.id !== extraId));
      toast.success('Extra deleted successfully');
    } catch (error) {
      toast.error('Failed to delete extra');
    } finally {
      setLoadingStatuses(prev => ({ ...prev, [`extra-${extraId}`]: false }));
    }
  };

  const openAssignmentModal = (type: 'category' | 'item' | 'variant' | 'global', id: string, name: string) => {
    setAssignmentTarget({ type, id, name });

    // Get current assignments for this target and all inherited ones
    let allApplicableAssignments = assignments.filter(assignment => {
      if (assignment.isGlobal) return true;

      if (type === 'category') {
        // For category: show global + category assignments
        return assignment.isGlobal || assignment.categoryId === id;
      }

      if (type === 'item') {
        // For item: show global + category + item assignments
        const category = categories.find(c => c.items.some(i => i.id === id));
        return assignment.isGlobal ||
          (assignment.categoryId === category?.id) ||
          assignment.menuItemId === id;
      }

      if (type === 'variant') {
        // For variant: show global + category + item + variant assignments
        const category = categories.find(c =>
          c.items.some(i => i.variants.some(v => v.id === id))
        );
        const item = category?.items.find(i => i.variants.some(v => v.id === id));
        return assignment.isGlobal ||
          (assignment.categoryId === category?.id) ||
          (assignment.menuItemId === item?.id) ||
          assignment.variantId === id;
      }

      return false;
    });

    // Remove duplicates
    const uniqueAssignments = allApplicableAssignments.filter((assignment, index, self) =>
      index === self.findIndex(a => a.extraId === assignment.extraId)
    );

    setSelectedAssignmentExtras(uniqueAssignments.map(a => a.extraId));
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!restaurant || !assignmentTarget) return;

    setSubmitting(true);

    try {
      // Get current assignments for this target
      const currentAssignments = assignments.filter(assignment => {
        if (assignmentTarget.type === 'global') return assignment.isGlobal;
        if (assignmentTarget.type === 'category') return assignment.categoryId === assignmentTarget.id;
        if (assignmentTarget.type === 'item') return assignment.menuItemId === assignmentTarget.id;
        if (assignmentTarget.type === 'variant') return assignment.variantId === assignmentTarget.id;
        return false;
      });

      const currentExtraIds = currentAssignments.map(a => a.extraId);

      // Extras to add
      const extrasToAdd = selectedAssignmentExtras.filter(id => !currentExtraIds.includes(id));

      // Extras to remove
      const extrasToRemove = currentAssignments.filter(a => !selectedAssignmentExtras.includes(a.extraId));

      // Add new assignments with cascading
      for (const extraId of extrasToAdd) {
        const assignmentData: any = {
          extraId,
          isGlobal: assignmentTarget.type === 'global'
        };

        if (assignmentTarget.type === 'category') {
          assignmentData.categoryId = assignmentTarget.id;

          // Cascade to all items in this category
          const category = categories.find(c => c.id === assignmentTarget.id);
          if (category) {
            for (const item of category.items) {
              await apiClient.createExtraAssignment(restaurant.id, {
                extraId,
                menuItemId: item.id
              });

              // Cascade to all variants of this item
              for (const variant of item.variants) {
                await apiClient.createExtraAssignment(restaurant.id, {
                  extraId,
                  variantId: variant.id
                });
              }
            }
          }
        } else if (assignmentTarget.type === 'item') {
          assignmentData.menuItemId = assignmentTarget.id;

          // Cascade to all variants of this item
          const category = categories.find(c => c.items.some(i => i.id === assignmentTarget.id));
          const item = category?.items.find(i => i.id === assignmentTarget.id);
          if (item) {
            for (const variant of item.variants) {
              await apiClient.createExtraAssignment(restaurant.id, {
                extraId,
                variantId: variant.id
              });
            }
          }
        } else if (assignmentTarget.type === 'variant') {
          assignmentData.variantId = assignmentTarget.id;
        }

        await apiClient.createExtraAssignment(restaurant.id, assignmentData);
      }

      // Remove old assignments (only direct assignments, not cascaded ones)
      for (const assignment of extrasToRemove) {
        // Only remove assignments that are at the same level as the target
        const shouldRemove = (
          (assignmentTarget.type === 'global' && assignment.isGlobal) ||
          (assignmentTarget.type === 'category' && assignment.categoryId === assignmentTarget.id && !assignment.menuItemId && !assignment.variantId) ||
          (assignmentTarget.type === 'item' && assignment.menuItemId === assignmentTarget.id && !assignment.variantId) ||
          (assignmentTarget.type === 'variant' && assignment.variantId === assignmentTarget.id)
        );

        if (shouldRemove) {
          await apiClient.deleteExtraAssignment(assignment.id);
        }
      }

      // Reload assignments
      const assignmentsData = await apiClient.getExtraAssignments(restaurant.id);
      setAssignments(assignmentsData.assignments || []);

      toast.success('Assignments updated successfully');
      setAssignmentModalOpen(false);
      setAssignmentTarget(null);
      setSelectedAssignmentExtras([]);

    } catch (error) {
      toast.error('Failed to update assignments');
    } finally {
      setSubmitting(false);
    }
  };
  if (process.env.NODE_ENV === 'development') {
  };

  // Variant Image Upload Handlers
  const handleVariantImageUpload = async (variantId: string, itemId: string, file: File) => {
    try {
      const imageURL = await uploadImageToImgbb(file);
      await apiClient.updateItemVariant(restaurant!.id, itemId, variantId, { imageURL });
      toast.success('Image uploaded successfully');
      loadMenu();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    }
  };

  const handleVariantDrop = (e: React.DragEvent, variantId: string, itemId: string) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleVariantImageUpload(variantId, itemId, imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  };

  const handleVariantDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Item Image Upload Handlers
  const handleItemImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const imageURL = await uploadImageToImgbb(file);
      setFormData({ ...formData, imageURL });
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLayoutChange = (newLayout: 'list' | 'grid') => {
    setLayout(newLayout);
    localStorage.setItem('menuLayout', newLayout);
  };

  // --- Render Helpers ---
  const toggleSet = (set: Set<string>, id: string, setter: any) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };



  function handleItemImageDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleItemImageUpload(imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  }

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-5 pb-12">

      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0c0c0e]/80 p-5 sm:p-6 rounded-3xl border border-white/5 border-l-[6px] border-l-[#d5b263] transition-all duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Menu Management</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-medium">Create categories, items, variants, and configure prices dynamically.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={refreshMenu}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2.5 bg-white/5 border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setCurrentCategoryIndex(0);
              setPreviewModalOpen(true);
            }}
            className="flex items-center justify-center px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-150 rounded-xl font-bold border border-zinc-800 transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Eye className="w-3.5 h-3.5 mr-2 text-[#d5b263]" strokeWidth={2.5} />
            Preview Menu
          </button>
          <button
            onClick={() => openModal('category', 'create')}
            className="flex items-center justify-center px-4 py-2.5 bg-[#d5b263] text-black rounded-xl font-black hover:bg-[#c4a152] transition-all shadow-md active:scale-95 text-xs sm:text-sm border-none"
          >
            <Plus className="w-3.5 h-3.5 mr-2" strokeWidth={3} />
            Add Category
          </button>
        </div>
      </div>

      {/* 2. Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 transition-colors group-focus-within:text-[#d5b263]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263] transition-all text-xs sm:text-sm outline-none shadow-sm placeholder-zinc-500 font-medium text-zinc-100"
          />
        </div>
        <div className="relative">
          <select
            value={dietaryFilter}
            onChange={(e) => setDietaryFilter(e.target.value as 'all' | 'veg' | 'non-veg')}
            aria-label="Filter menu items by dietary type"
            className="w-full sm:w-48 pl-4 pr-10 py-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263] transition-all appearance-none text-xs sm:text-sm outline-none shadow-sm font-semibold text-zinc-300 cursor-pointer"
          >
            <option value="all" className="bg-[#0c0c0e] text-zinc-100">All Dietary Types</option>
            <option value="veg" className="bg-[#0c0c0e] text-zinc-100">Vegetarian Only</option>
            <option value="non-veg" className="bg-[#0c0c0e] text-zinc-100">Non-Vegetarian Only</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 pointer-events-none" strokeWidth={2} />
        </div>
      </div>

      {/* 3. Menu Hierarchy */}
      <div className="flex flex-col sm:flex-row gap-4">
        {filteredCategories.length === 0 ? (
          <div className="w-full text-center py-12 bg-[#0c0c0e]/80 rounded-2xl border border-dashed border-white/5">
            <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-zinc-400 font-semibold text-sm">No categories found</p>
          </div>
        ) : (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden sm:block w-64 flex-shrink-0">
              <div className="sticky top-6 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-3 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
                <h3 className="font-black text-zinc-400 text-xs tracking-widest uppercase mb-3 px-2">Categories</h3>
                <div className="space-y-1">
                  {filteredCategories.map(category => {
                    const isActive = activeCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className={`w-full text-left pl-3 pr-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-between group relative ${
                          isActive 
                            ? 'bg-gradient-to-r from-[#d5b263]/10 to-[#d5b263]/5 text-[#bfa052]' 
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-[20%] bottom-[20%] w-1 bg-[#d5b263] rounded-r-md" />
                        )}
                        <span className="truncate pr-2">{category.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                          isActive 
                            ? 'bg-[#d5b263]/25 text-[#bfa052]' 
                            : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-zinc-200'
                        }`}>
                          {category.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Category Pills */}
            <div className="sm:hidden -mx-4 px-4 sticky top-0 z-10 bg-[#0c0c0e]/95 backdrop-blur-md py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {filteredCategories.map(category => {
                  const isActive = activeCategoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        isActive 
                          ? 'bg-[#d5b263]/10 border-[#d5b263]/40 text-[#bfa052] shadow-sm' 
                          : 'bg-[#0c0c0e] border-white/5 text-zinc-400 shadow-sm'
                      }`}
                    >
                      {category.category} <span className="opacity-60 ml-0.5">({category.items.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-8 pb-20">
              {filteredCategories.map(category => (
                <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-24 space-y-4">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                        {category.category}
                        {!category.isActive ? (
                          <span className="text-[9px] font-bold bg-zinc-850 text-zinc-400 px-2 py-0.5 rounded-md tracking-wider uppercase border border-zinc-800/80 select-none">INACTIVE</span>
                        ) : (
                          <span className="text-[9px] font-bold bg-[#d5b263]/10 text-[#bfa052] px-2 py-0.5 rounded-md tracking-wider uppercase border border-[#d5b263]/20 select-none">{category.items.length} Items</span>
                        )}
                      </h2>
                      {category.description && <p className="text-xs text-zinc-400 font-medium mt-0.5">{category.description}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-[#141416]/40 border border-zinc-850 px-2.5 py-1 rounded-xl">
                        <span className="text-[10px] font-bold text-zinc-455 select-none">Status</span>
                        <StatusToggle isActive={category.isActive} onClick={() => handleToggleStatus('category', category.id, !category.isActive)} isLoading={loadingStatuses[`category-${category.id}`]} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openModal('category', 'edit', undefined, category)} className="p-1.5 text-zinc-400 hover:text-[#bfa052] hover:bg-white/5 transition-all rounded-lg border border-zinc-800/80 active:scale-90" title="Edit Category"><Edit2 size={13} strokeWidth={2.5} /></button>
                        <button onClick={() => handleDeleteCategory(category.id)} className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all rounded-lg border border-zinc-800/80 active:scale-90" title="Delete Category"><Trash2 size={13} strokeWidth={2.5} /></button>
                      </div>
                      <button onClick={() => openModal('item', 'create', category.id)} className="flex items-center text-xs font-black bg-zinc-800 hover:bg-zinc-750 text-zinc-100 px-3 py-2 rounded-xl transition-all shadow-md active:scale-95 gap-1 border border-zinc-700"><Plus size={13} strokeWidth={3} /> Add Item</button>
                    </div>
                  </div>

                  {/* Items Grid */}
                  {category.items.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs font-medium italic bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/60">No items available in this category.</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {category.items.map(item => (
                        <div key={item.id} className={`group bg-[#0c0c0e]/40 rounded-2xl border transition-all duration-300 ease-out flex flex-col overflow-hidden ${
                          !item.isActive 
                            ? 'border-zinc-800 bg-zinc-950/20 opacity-70 shadow-none' 
                            : 'border-white/5 hover:border-[#d5b263]/30 hover:bg-[#0c0c0e]/80 shadow-md hover:-translate-y-0.5'
                        }`}>
                          {/* Top Content */}
                          <div className="p-4 flex gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                <FoodTypeIcon type={item.isVeg ? 'veg' : 'non-veg'} />
                                {item.variants.length > 0 && (
                                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full tracking-wider uppercase border border-zinc-850 select-none">{item.variants.length} Variants</span>
                                )}
                              </div>
                              <h3 className="font-black text-base text-white leading-snug mb-1 truncate group-hover:text-[#bfa052] transition-colors">{item.name}</h3>

                              {/* Price Indicator */}
                              <div className="font-extrabold text-[#bfa052] text-xs mb-1.5 flex items-center gap-1">
                                <span className="text-zinc-500 text-[10px] font-semibold">Starts at</span>
                                <span className="text-sm font-black text-white">{item.variants.length > 0 ? formatPrice(item.variants[0].price) : 'No Price'}</span>
                              </div>

                              {item.description && <p className="text-xs text-zinc-400 font-medium line-clamp-2 leading-relaxed">{item.description}</p>}
                            </div>

                            {/* Right Image Container */}
                            <div className="relative flex-shrink-0 select-none">
                              {item.imageURL ? (
                                <div className="w-18 h-18 sm:w-20 sm:h-20 overflow-hidden rounded-2xl border border-zinc-850 shadow-sm">
                                  <img 
                                    src={item.imageURL} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                  />
                                  {!item.isActive && <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />}
                                </div>
                              ) : (
                                <div className="w-18 h-18 sm:w-20 sm:h-20 bg-zinc-900/60 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-650">
                                  <Utensils className="w-6 h-6 opacity-60" strokeWidth={1.5} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Variants List (Inline) */}
                          {item.variants.length > 0 && (
                            <div className="px-4 pb-3">
                              <div className="space-y-1 border-t border-zinc-900 pt-3">
                                {item.variants.map(variant => (
                                  <div key={variant.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl hover:bg-zinc-900/60 transition-colors">
                                    <div className="flex items-center gap-2 text-zinc-200 min-w-0 font-medium">
                                      <span className="font-semibold truncate">{variant.variantName}</span>
                                      {variant.portionSize && (
                                        <span className="text-[9px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded-full border border-zinc-800 font-bold select-none">{variant.portionSize}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-black text-zinc-150 flex-shrink-0">{formatPrice(variant.price)}</span>
                                      <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-2.5">
                                        <button onClick={() => openModal('variant', 'edit', item.id, variant)} className="p-0.5 text-zinc-500 hover:text-white transition-colors" title="Edit Variant"><Edit2 size={12} strokeWidth={2.5} /></button>
                                        <button onClick={() => handleDeleteVariant(variant.id, item.id)} className="p-0.5 text-zinc-600 hover:text-rose-450 transition-colors" title="Delete Variant"><Trash2 size={12} strokeWidth={2.5} /></button>
                                        <StatusToggle isActive={variant.isActive} onClick={() => handleToggleStatus('variant', variant.id, !variant.isActive, item.id)} isLoading={loadingStatuses[`variant-${variant.id}`]} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Footer */}
                          <div className="mt-auto border-t border-zinc-900 bg-zinc-950/40 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-0.5 rounded-xl border border-zinc-850">
                              <span className="text-[9px] font-bold text-zinc-450 select-none">Active</span>
                              <StatusToggle isActive={item.isActive} onClick={() => handleToggleStatus('item', item.id, !item.isActive)} isLoading={loadingStatuses[`item-${item.id}`]} />
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <button onClick={() => openModal('item', 'edit', category.id, item)} className="px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1"><Edit2 size={11} strokeWidth={2.5} /> <span className="hidden sm:inline">Edit</span></button>
                              <button onClick={() => openModal('variant', 'create', item.id)} className="px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1"><Plus size={11} strokeWidth={2.5} /> <span className="hidden sm:inline">Add Variant</span></button>
                              <button onClick={() => openAssignmentModal('item', item.id, item.name)} className="px-2 py-1 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-purple-900/60 transition-all flex items-center gap-1"><Settings size={11} strokeWidth={2.5} /> <span className="hidden sm:inline">Extras</span></button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-zinc-550 hover:text-rose-450 rounded-lg hover:bg-rose-950/10 transition-colors"><Trash2 size={13} strokeWidth={2} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. Extras Management */}
      <div className="bg-[#0c0c0e]/80 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/5 bg-[#141416]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Extras Management
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 font-medium">Configure global modifiers like extra cheese, sauces, toppings, or custom prep items.</p>
          </div>
          <button
            onClick={() => openModal('extra', 'create')}
            className="flex items-center justify-center px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 rounded-xl font-bold transition-all shadow-md active:scale-95 text-xs sm:text-sm border border-zinc-700 self-start sm:self-center"
          >
            <Plus className="w-4 h-4 mr-1.5 text-[#d5b263]" strokeWidth={2.5} />
            Add Option
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {extras.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/10">
              <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-4 h-4 text-zinc-500" strokeWidth={2} />
              </div>
              <p className="text-zinc-400 font-bold text-xs sm:text-sm">No extras created yet</p>
              <p className="text-zinc-500 text-xs mt-0.5">Create addons that customers can optionally attach to menu selections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {extras.map((extra) => (
                <div key={extra.id} className={`group bg-[#0c0c0e]/40 rounded-xl border transition-all duration-300 flex flex-col h-full ${
                  !extra.isActive 
                    ? 'border-zinc-800 bg-zinc-950/20 opacity-70 shadow-none' 
                    : 'border-white/5 hover:border-[#d5b263]/30 hover:bg-[#0c0c0e]/80 shadow-md'
                } p-4`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-black text-sm sm:text-base leading-tight mb-0.5 truncate transition-colors group-hover:text-[#bfa052] ${
                        !extra.isActive ? 'text-zinc-500' : 'text-white'
                      }`}>
                        {extra.name}
                      </h3>
                      {extra.description && (
                        <p className={`text-xs line-clamp-2 leading-relaxed ${
                          !extra.isActive ? 'text-zinc-650' : 'text-zinc-400 font-medium'
                        }`}>
                          {extra.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-lg">
                      <span className="text-[9px] font-bold text-zinc-450 uppercase select-none">Active</span>
                      <StatusToggle
                        isActive={extra.isActive}
                        onClick={() => handleToggleStatus('extra', extra.id, !extra.isActive)}
                        isLoading={loadingStatuses[`extra-${extra.id}`]}
                      />
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-zinc-900 flex items-center justify-between">
                    <span className={`font-black text-sm sm:text-base ${!extra.isActive ? 'text-zinc-500' : 'text-white'}`}>
                      {formatPrice(extra.price)}
                    </span>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <button onClick={() => openModal('extra', 'edit', undefined, extra)} className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1"><Edit2 size={11} strokeWidth={2.5} /> Edit</button>
                      <button onClick={() => handleDeleteExtra(extra.id)} disabled={loadingStatuses[`extra-${extra.id}`]} className="p-1.5 text-zinc-550 hover:text-rose-450 hover:bg-rose-950/10 rounded-lg transition-colors disabled:opacity-50"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- UNIFIED MODAL --- */}
      {modalOpen && modalConfig && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-900 flex justify-between items-center bg-[#141416]/20">
              <h3 className="font-black text-base sm:text-lg text-white">
                {modalConfig.mode === 'create' ? 'Create New' : 'Edit'} {capitalize(modalConfig.type)}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-450 hover:text-white hover:bg-white/5 p-1 rounded-full animate-in duration-200" aria-label="Close modal" title="Close">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="max-h-[calc(85vh-80px)] overflow-y-auto scrollbar-hide">
              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* Name Field (All Types) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder={modalConfig.type === 'variant' ? "e.g., Small, Regular, Large" : modalConfig.type === 'item' ? "e.g., Chicken Biryani" : modalConfig.type === 'extra' ? "e.g., Extra Cheese, Spicy Sauce" : "Category Name"}
                    className="w-full px-3 py-2.5 bg-zinc-900/40 border border-zinc-800 focus:ring-2 focus:ring-[#d5b263]/25 focus:border-[#d5b263] outline-none transition-all text-xs sm:text-sm font-medium text-white placeholder-zinc-500 rounded-xl"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Description (Category & Item) */}
                {modalConfig.type !== 'variant' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description</label>
                    <textarea
                      rows={2.5}
                      placeholder={modalConfig.type === 'item' ? "e.g., Aromatic basmati rice with tender chicken and spices" : "Brief category description"}
                      className="w-full px-3 py-2.5 bg-zinc-900/40 border border-zinc-800 focus:ring-2 focus:ring-[#d5b263]/25 focus:border-[#d5b263] outline-none transition-all text-xs sm:text-sm font-medium text-white placeholder-zinc-500 rounded-xl"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                )}

                {/* Veg/Non-Veg Selection (Item only) */}
                {modalConfig.type === 'item' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Dietary Type</label>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" aria-label="Critical: This affects customer filtering and ordering" />
                    </div>
                    <p className="text-[10px] text-amber-400 bg-amber-950/20 p-2 rounded-lg border border-amber-900/30 leading-relaxed font-medium">
                      ⚠️ Correct dietary tag assignment is critical for client-side filtering and compliance.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isVeg: true })}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${formData.isVeg
                          ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400'
                          : 'border-zinc-800 text-zinc-450 hover:bg-white/5'
                          }`}
                      >
                        <Leaf className={`w-4 h-4 ${formData.isVeg ? 'text-emerald-500' : 'text-zinc-650'}`} />
                        <span>Vegetarian</span>
                        <span className="text-[9px] opacity-60 font-normal">Pure vegetarian prep</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isVeg: false })}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${!formData.isVeg
                          ? 'bg-rose-950/20 border-rose-500 text-rose-400'
                          : 'border-zinc-800 text-zinc-450 hover:bg-white/5'
                          }`}
                      >
                        <Beef className={`w-4 h-4 ${!formData.isVeg ? 'text-rose-500' : 'text-zinc-650'}`} />
                        <span>Non-Vegetarian</span>
                        <span className="text-[9px] opacity-60 font-normal">Contains meat/poultry</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Create Similar Item Checkbox (Item create only) */}
                {modalConfig.type === 'item' && modalConfig.mode === 'create' && existingSimilarItem && (
                  <div className="bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createSimilarItem}
                        onChange={(e) => setCreateSimilarItem(e.target.checked)}
                        className="w-4 h-4 text-[#d5b263] bg-zinc-950 border-zinc-800 rounded focus:ring-[#d5b263] focus:ring-offset-0"
                      />
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Copy variants from existing {existingSimilarItem.isVeg ? 'vegetarian' : 'non-vegetarian'} version
                      </span>
                    </label>
                  </div>
                )}

                {/* Image Upload (Item only) */}
                {modalConfig.type === 'item' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Image</label>
                    <div
                      className="flex items-center gap-3"
                      onDrop={handleItemImageDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {isUploading ? (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-550 select-none">
                          <span className="text-[9px] font-black animate-pulse">UPLOADING...</span>
                        </div>
                      ) : formData.imageURL ? (
                        <div className="relative group">
                          <img
                            src={formData.imageURL}
                            alt="Item"
                            className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageURL: '' })}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-700 transition-colors shadow-md"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-zinc-800 hover:border-[#d5b263]/50 bg-zinc-900/40 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer select-none">
                          <Upload size={18} strokeWidth={2} />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          aria-label="Upload item image"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleItemImageUpload(file);
                            }
                          }}
                          className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-[#d5b263] file:text-black hover:file:bg-[#c4a152] file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Variant Specific Fields */}
                {modalConfig.type === 'variant' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Price (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={2.5} />
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2.5 bg-zinc-900/40 border border-zinc-800 focus:ring-2 focus:ring-[#d5b263]/25 focus:border-[#d5b263] outline-none text-xs sm:text-sm font-medium text-white placeholder-zinc-500 rounded-xl"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Portion</label>
                        <input
                          type="text"
                          placeholder="e.g. 250g"
                          className="w-full px-3 py-2.5 bg-zinc-900/40 border border-zinc-800 focus:ring-2 focus:ring-[#d5b263]/25 focus:border-[#d5b263] outline-none text-xs sm:text-sm font-medium text-white placeholder-zinc-500 rounded-xl"
                          value={formData.portionSize}
                          onChange={e => setFormData({ ...formData, portionSize: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Extra Specific Fields */}
                {modalConfig.type === 'extra' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Price (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={2.5} />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2.5 bg-zinc-900/40 border border-zinc-800 focus:ring-2 focus:ring-[#d5b263]/25 focus:border-[#d5b263] outline-none text-xs sm:text-sm font-medium text-white placeholder-zinc-500 rounded-xl"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#d5b263] text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#c4a152] transition-all active:scale-[0.98] mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border-none"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                  {submitting ? 'Saving changes...' : (modalConfig.mode === 'create' ? 'Create Option' : 'Save Changes')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
             {/* --- PREVIEW MODAL --- */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-900 flex justify-between items-center bg-[#141416]/20">
              <div>
                <h3 className="font-black text-base sm:text-lg text-white">Live Customer Menu Simulator</h3>
                <p className="text-zinc-400 text-xs font-semibold">Real-time mobile visualization of your digital menu.</p>
              </div>
              <button 
                onClick={() => setPreviewModalOpen(false)} 
                className="text-zinc-450 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors animate-in duration-200" 
                aria-label="Close preview" 
                title="Close"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-zinc-950/10">
              {/* Simulator Info / Category Select Sidebar */}
              <div className="w-full md:w-72 border-r border-zinc-900 bg-[#0c0c0e]/50 p-4 flex flex-col justify-between flex-shrink-0">
                <div className="space-y-4">
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
                    <h4 className="text-[10px] font-black text-amber-450 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Settings className="w-3 h-3" /> Simulation Mode
                    </h4>
                    <p className="text-[11px] text-amber-500/90 leading-normal font-semibold">
                      This shows the exact interface customers see when scanning your table QR codes. Try clicking categories to filter.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-zinc-500 tracking-wider uppercase mb-2">Filter Categories</h4>
                    <div className="space-y-1 max-h-[35vh] overflow-y-auto scrollbar-hide pr-1">
                      {categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive)).map((category, index) => {
                        const isActive = index === currentCategoryIndex;
                        return (
                          <button
                            key={category.id}
                            onClick={() => setCurrentCategoryIndex(index)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                              isActive
                                ? 'bg-[#d5b263]/10 text-[#bfa052]'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{category.category}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-[#d5b263]/20 text-[#bfa052]' : 'bg-zinc-900 border border-zinc-850 text-zinc-450'
                            }`}>
                              {category.items.filter(item => item.isActive).length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex justify-between items-center pt-4 border-t border-zinc-900 text-[10px] font-bold text-zinc-550">
                  <span>MyQuro Emulator v1.0</span>
                </div>
              </div>

              {/* Mobile Phone Mock Emulator container */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-zinc-950/60">
                {(() => {
                  const activeCategories = categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive));
                  const currentCategory = activeCategories[currentCategoryIndex];

                  return (
                    <div className="relative">
                      {/* Physical Mobile Device Frame */}
                      <div className="relative mx-auto border-[10px] border-slate-900 bg-slate-950 rounded-[3rem] h-[600px] w-[310px] shadow-2xl flex flex-col overflow-hidden select-none">
                        
                        {/* Speaker / Notch Overlay */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-40 flex items-center justify-center">
                          {/* Inner camera lens dot */}
                          <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800/50 absolute left-3 top-1" />
                          {/* Speaker bar */}
                          <div className="w-12 h-1 bg-slate-800 rounded-full absolute top-1.5" />
                        </div>

                        {/* Top Mobile Status Bar (Simulated) */}
                        <div className="absolute top-0 left-0 right-0 h-9 bg-white z-30 px-6 flex items-center justify-between text-[10px] font-bold text-slate-900 select-none">
                          <span>12:30</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-slate-900 rounded-[2px]" title="WiFi simulated" />
                            <span className="w-4 h-2 bg-slate-900 rounded-[2px]" title="Battery simulated" />
                          </div>
                        </div>

                        {/* Screen Content Wrapper */}
                        <div className="flex-1 bg-slate-50/50 overflow-y-auto pt-9 pb-4 flex flex-col relative scrollbar-hide">
                          
                          {/* Simulated Digital Menu Header */}
                          <div className="bg-white px-4 pb-4 pt-4 border-b border-slate-100 flex flex-col gap-1.5">
                            <span className="text-[9px] font-extrabold text-[#bfa052] tracking-wider uppercase">Table QR Menu</span>
                            <h4 className="font-black text-slate-950 text-base leading-tight">{restaurant?.restaurantName || 'MyQuro Bistro'}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Scan code at your table to order instantly.</p>
                            
                            {/* Dummy search bar */}
                            <div className="bg-slate-100 rounded-xl py-2 px-3 flex items-center gap-2 mt-1">
                              <Search className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[11px] text-slate-400 font-medium">Search food...</span>
                            </div>
                          </div>

                          {/* Horizontal Categories slider in phone screen */}
                          <div className="bg-white sticky top-0 z-10 px-4 py-2.5 border-b border-slate-100 overflow-x-auto flex gap-1.5 scrollbar-hide">
                            {activeCategories.map((cat, index) => {
                              const isActive = index === currentCategoryIndex;
                              return (
                                <button
                                  key={cat.id}
                                  onClick={(e) => { e.preventDefault(); setCurrentCategoryIndex(index); }}
                                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap transition-colors border ${
                                    isActive
                                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}
                                >
                                  {cat.category}
                                </button>
                              );
                            })}
                          </div>

                          {/* Menu Items List inside Phone Screen */}
                          <div className="flex-1 p-3 space-y-3">
                            {!currentCategory ? (
                              <div className="text-center py-16">
                                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-bold">No active dishes</p>
                              </div>
                            ) : (
                              <>
                                <div className="px-1 py-1">
                                  <h5 className="text-xs font-black text-slate-950">{currentCategory.category}</h5>
                                  {currentCategory.description && (
                                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{currentCategory.description}</p>
                                  )}
                                </div>

                                {currentCategory.items.filter(item => item.isActive).map(item => (
                                  <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-2">
                                    <div className="flex gap-2">
                                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                          <FoodTypeIcon type={item.isVeg ? 'veg' : 'non-veg'} />
                                        </div>
                                        <h6 className="font-extrabold text-[13px] text-slate-950 truncate leading-snug">{item.name}</h6>
                                        {item.description && (
                                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                                        )}
                                      </div>

                                      {item.imageURL && (
                                        <img
                                          src={item.imageURL}
                                          alt={item.name}
                                          className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                                        />
                                      )}
                                    </div>

                                    {/* Variants inside simulated phone */}
                                    <div className="space-y-1 pt-1.5 border-t border-slate-50">
                                      {item.variants.filter(v => v.isActive).map(variant => (
                                        <div key={variant.id} className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                                          <span className="truncate pr-1">{variant.variantName} {variant.portionSize && `(${variant.portionSize})`}</span>
                                          <span className="font-black text-slate-950 flex-shrink-0">{formatPrice(variant.price)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Phone Bar line indicator */}
                        <div className="h-[12px] bg-slate-950 flex justify-center items-center relative z-25">
                          <div className="w-24 h-1 bg-slate-800 rounded-full" />
                        </div>
                      </div>

                      {/* Navigation slide indicators underneath phone emulator */}
                      <div className="flex justify-center items-center gap-4 mt-4 select-none">
                        <button
                          onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))}
                          disabled={currentCategoryIndex === 0}
                          className="p-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                          title="Previous simulated category"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-extrabold text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                          {currentCategoryIndex + 1} / {activeCategories.length || 1} Categories
                        </span>
                        <button
                          onClick={() => setCurrentCategoryIndex(Math.min(activeCategories.length - 1, currentCategoryIndex + 1))}
                          disabled={currentCategoryIndex === activeCategories.length - 1 || activeCategories.length === 0}
                          className="p-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                          title="Next simulated category"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer for Categories */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex sm:hidden">
          <div className="w-72 max-w-[85vw] bg-[#0c0c0e]/95 border-r border-white/5 h-full shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-white">Categories</h4>
              <button onClick={() => setDrawerOpen(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-white/5 rounded-full" aria-label="Close category menu" title="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive)).map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setCurrentCategoryIndex(index);
                    setDrawerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all ${index === currentCategoryIndex
                    ? 'bg-[#d5b263]/10 text-[#bfa052] font-extrabold'
                    : 'text-zinc-400 hover:bg-white/5'
                    }`}
                >
                  <span className="block text-xs font-bold">{category.category}</span>
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    ({category.items.filter(item => item.isActive).length} items)
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Overlay to close drawer */}
          <div className="flex-1" onClick={() => setDrawerOpen(false)}></div>
        </div>
      )}

      {/* --- ASSIGNMENT MODAL --- */}
      {assignmentModalOpen && assignmentTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e]/95 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-900 flex justify-between items-center bg-[#141416]/20">
              <h3 className="font-black text-base sm:text-lg text-white">
                Manage Extras for {assignmentTarget.type === 'category' ? 'Category' : assignmentTarget.type === 'item' ? 'Item' : 'Variant'}
              </h3>
              <button onClick={() => setAssignmentModalOpen(false)} className="text-zinc-450 hover:text-white hover:bg-white/5 p-1 rounded-full" aria-label="Close modal" title="Close">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-zinc-400">
                  Select which extras should be available for this {assignmentTarget.type}.
                </p>

                {extras.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-semibold">No extras available. Create some extras first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extras.map(extra => {
                      const isAssigned = selectedAssignmentExtras.includes(extra.id);

                      // Check if this extra is directly assigned at this level
                      const directAssignment = assignments.find(assignment => {
                        const matchesLevel = (
                          (assignmentTarget.type === 'global' && assignment.isGlobal) ||
                          (assignmentTarget.type === 'category' && assignment.categoryId === assignmentTarget.id) ||
                          (assignmentTarget.type === 'item' && assignment.menuItemId === assignmentTarget.id) ||
                          (assignmentTarget.type === 'variant' && assignment.variantId === assignmentTarget.id)
                        );
                        return matchesLevel && assignment.extraId === extra.id;
                      });

                      const isDirectlyAssigned = !!directAssignment;
                      const isInherited = isAssigned && !isDirectlyAssigned;

                      return (
                        <div key={extra.id} className={`flex items-center justify-between p-3 rounded-xl border ${isInherited ? 'bg-blue-950/15 border-blue-900/30' : 'bg-zinc-900/40 border-zinc-850'}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              disabled={isInherited}
                              onChange={(e) => {
                                if (isInherited) return; // Don't allow unchecking inherited assignments
                                if (e.target.checked) {
                                  setSelectedAssignmentExtras(prev => [...prev, extra.id]);
                                } else {
                                  setSelectedAssignmentExtras(prev => prev.filter(id => id !== extra.id));
                                }
                              }}
                              className={`w-4 h-4 text-[#d5b263] bg-zinc-950 border-zinc-800 rounded focus:ring-[#d5b263] focus:ring-offset-0 ${isInherited ? 'opacity-40 cursor-not-allowed' : ''}`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-extrabold text-sm text-white">{extra.name}</p>
                                {isInherited && (
                                  <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                    Inherited
                                  </span>
                                )}
                              </div>
                              {extra.description && <p className="text-xs text-zinc-450 mt-0.5">{extra.description}</p>}
                              <p className="text-xs text-zinc-400 font-bold mt-1">{(extra.price / 100).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${extra.isActive ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' : 'bg-zinc-900 text-zinc-500 border-zinc-850'}`}>
                              {extra.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-zinc-900 bg-zinc-950/40 flex justify-end gap-2.5">
              <button
                onClick={() => setAssignmentModalOpen(false)}
                className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-colors font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="px-5 py-2 bg-[#d5b263] text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#c4a152] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {savingAssignments ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Minimal Helpers ---
function MenuSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-xl w-full mb-8"></div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl w-full"></div>)}
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
      <p className="text-gray-500 mt-2">You don&apos;t have permission to manage the menu.</p>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Menu...</p>
    </div>
  )
}
