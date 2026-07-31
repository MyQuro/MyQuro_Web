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
      ${isActive ? 'bg-green-500' : 'bg-gray-200'}
      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <span className={`
      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
      ${isActive ? 'translate-x-5' : 'translate-x-0'}
    `} />
  </button>
);

// 2. Veg/Non-Veg Icon
const FoodTypeIcon = ({ type }: { type?: string }) => {
  if (!type) return null;
  const t = type.toLowerCase();
  const isVeg = t === 'veg' || t === 'vegan' || t === 'vegetarian';
  const color = isVeg ? 'border-green-600' : 'border-red-600';
  const dotColor = isVeg ? 'bg-green-600' : 'bg-red-600';

  return (
    <div className={`w-4 h-4 border ${color} flex items-center justify-center rounded-sm flex-shrink-0`} title={type}>
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
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
    <div className="space-y-6 pb-20">

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-8 rounded-[1.5rem] border border-gray-100 shadow-[0_2px_20px_-3px_rgba(0,0,0,0.04)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Menu Management</h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1.5 font-medium">Create categories, items, and manage pricing.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={refreshMenu}
            disabled={loading}
            className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-[#1c1c1e] border border-[#2c2c2e] text-white/70 rounded-xl font-bold hover:bg-[#2c2c2e] hover:text-white disabled:bg-[#1a1a1a] transition-all shadow-sm active:scale-95 text-sm sm:text-base"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setCurrentCategoryIndex(0);
              setPreviewModalOpen(true);
            }}
            className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-[#1c1c1e] border border-[#3c3c3e] text-white rounded-xl font-bold hover:bg-[#2c2c2e] transition-all shadow-sm active:scale-95 text-sm sm:text-base"
          >
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2" strokeWidth={2} />
            Preview Menu
          </button>
          <button
            onClick={() => openModal('category', 'create')}
            className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black rounded-xl font-bold hover:from-[#e0bf70] hover:to-[#d5b263] transition-all shadow-lg shadow-[#d5b263]/20 active:scale-[0.98] text-sm sm:text-base border-none"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" strokeWidth={2.5} />
            Add Category
          </button>
        </div>
      </div>

      {/* 2. Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base outline-none shadow-sm"
          />
        </div>
        <div className="relative">
          <select
            value={dietaryFilter}
            onChange={(e) => setDietaryFilter(e.target.value as 'all' | 'veg' | 'non-veg')}
            aria-label="Filter menu items by dietary type"
            className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none pr-10 text-sm sm:text-base outline-none shadow-sm"
          >
            <option value="all">All Items</option>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" strokeWidth={1.5} />
        </div>
      </div>

      {/* 3. Menu Hierarchy */}
      <div className="flex flex-col sm:flex-row gap-6">
        {filteredCategories.length === 0 ? (
          <div className="w-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium">No categories found</p>
          </div>
        ) : (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden sm:block w-72 flex-shrink-0">
              <div className="sticky top-6 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
                <h3 className="font-bold text-gray-900 mb-4 px-2">Categories</h3>
                <div className="space-y-1">
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`w-full text-left px-3 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-between group ${activeCategoryId === category.id ? 'bg-[#d5b263]/10 text-[#d5b263] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="truncate pr-2">{category.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategoryId === category.id ? 'bg-[#d5b263]/15 text-[#d5b263]' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>{category.items.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Category Pills */}
            <div className="sm:hidden -mx-4 px-4 sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {filteredCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${activeCategoryId === category.id ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 shadow-sm'}`}
                  >
                    {category.category} ({category.items.length})
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-8 pb-32">
              {filteredCategories.map(category => (
                <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-24 space-y-4">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-200 pb-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        {category.category}
                        {!category.isActive && <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">INACTIVE</span>}
                      </h2>
                      {category.description && <p className="text-sm text-gray-500 mt-1">{category.description}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusToggle isActive={category.isActive} onClick={() => handleToggleStatus('category', category.id, !category.isActive)} isLoading={loadingStatuses[`category-${category.id}`]} />
                      <button onClick={() => openModal('category', 'edit', undefined, category)} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-md border border-gray-100 shadow-sm" title="Edit Category"><Edit2 size={16} strokeWidth={1.5} /></button>
                      <button onClick={() => handleDeleteCategory(category.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-md border border-gray-100 shadow-sm" title="Delete Category"><Trash2 size={16} strokeWidth={1.5} /></button>
                      <button onClick={() => openModal('item', 'create', category.id)} className="flex items-center text-sm font-bold bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black px-3 py-1.5 rounded-lg hover:from-[#e0bf70] hover:to-[#d5b263] transition-all shadow-sm shadow-[#d5b263]/20 gap-1 ml-auto sm:ml-0"><Plus size={14} strokeWidth={2} /> Add Item</button>
                    </div>
                  </div>

                  {/* Items Grid */}
                  {category.items.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm italic bg-white rounded-2xl border border-gray-100 shadow-sm">No items in this category.</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                      {category.items.map(item => (
                        <div key={item.id} className={`bg-white rounded-2xl border ${!item.isActive ? 'border-gray-200 bg-gray-50/50 opacity-80' : 'border-gray-100 hover:border-red-200'} shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col`}>
                          {/* Top Content */}
                          <div className="p-4 flex gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <FoodTypeIcon type={item.isVeg ? 'veg' : 'non-veg'} />
                                {item.variants.length > 0 && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded tracking-wide uppercase">{item.variants.length} Variants</span>}
                              </div>
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight mb-1 truncate">{item.name}</h3>

                              {/* Simplified displaying of first normal variant price if available */}
                              <div className="font-bold text-gray-900 mb-2">
                                {item.variants.length > 0 ? formatPrice(item.variants[0].price) : 'No Price'}
                              </div>

                              {item.description && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>}
                            </div>

                            {/* Right Image */}
                            <div className="relative flex-shrink-0">
                              {item.imageURL ? (
                                <div className="relative group/image">
                                  <img src={item.imageURL} alt={item.name} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-[1rem] shadow-sm border border-gray-100/50" />
                                  {!item.isActive && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-[1rem]"></div>}
                                </div>
                              ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-50/80 rounded-[1rem] border border-dashed border-gray-200 flex items-center justify-center">
                                  <Utensils className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Variants List (Inline) */}
                          {item.variants.length > 0 && (
                            <div className="px-4 pb-3">
                              <div className="space-y-1.5 border-t border-gray-50 pt-3">
                                {item.variants.map(variant => (
                                  <div key={variant.id} className="flex items-center justify-between text-sm group/variant py-0.5">
                                    <div className="flex items-center gap-2 text-gray-700 min-w-0">
                                      <span className="font-medium truncate">{variant.variantName}</span>
                                      {variant.portionSize && <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{variant.portionSize}</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-semibold text-gray-900 flex-shrink-0">{formatPrice(variant.price)}</span>
                                      <div className="flex items-center sm:opacity-0 sm:group-hover/variant:opacity-100 transition-opacity gap-1">
                                        <button onClick={() => openModal('variant', 'edit', item.id, variant)} className="p-1 text-gray-400 hover:text-gray-900"><Edit2 size={14} strokeWidth={1.5} /></button>
                                        <button onClick={() => handleDeleteVariant(variant.id, item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} strokeWidth={1.5} /></button>
                                        <StatusToggle isActive={variant.isActive} onClick={() => handleToggleStatus('variant', variant.id, !variant.isActive, item.id)} isLoading={loadingStatuses[`variant-${variant.id}`]} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Footer */}
                          <div className="mt-auto border-t border-gray-100 bg-gray-50/50 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusToggle isActive={item.isActive} onClick={() => handleToggleStatus('item', item.id, !item.isActive)} isLoading={loadingStatuses[`item-${item.id}`]} />
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button onClick={() => openModal('item', 'edit', category.id, item)} className="px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all flex items-center gap-1"><Edit2 size={14} strokeWidth={1.5} /> <span className="hidden sm:inline">Edit</span></button>
                              <button onClick={() => openModal('variant', 'create', item.id)} className="px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all"><Plus size={14} strokeWidth={1.5} className="inline sm:mr-1" /><span className="hidden sm:inline">Variant</span></button>
                              <button onClick={() => openAssignmentModal('item', item.id, item.name)} className="px-2.5 py-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-purple-200 transition-all"><Settings size={14} strokeWidth={1.5} className="inline sm:mr-1" /><span className="hidden sm:inline">Extras</span></button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} strokeWidth={1.5} /></button>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Extras Management</h2>
              <p className="text-gray-500 text-sm sm:text-base mt-1 font-medium">Manage additional items that can be added to orders.</p>
            </div>
            <button
              onClick={() => openModal('extra', 'create')}
              className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black rounded-xl font-bold hover:from-[#e0bf70] hover:to-[#d5b263] transition-all shadow-lg shadow-[#d5b263]/20 active:scale-[0.98] text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" strokeWidth={2.5} />
              Add Extra
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {extras.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-500 font-medium">No extras found</p>
              <p className="text-gray-400 text-sm mt-1">Create your first extra to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {extras.map((extra) => (
                <div key={extra.id} className={`bg-white rounded-2xl border ${!extra.isActive ? 'border-gray-200 bg-gray-50/50 opacity-80' : 'border-gray-100 hover:border-red-200'} p-4 sm:p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1 pr-3">
                      <h3 className={`font-bold text-base sm:text-lg leading-tight mb-2 truncate ${!extra.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                        {extra.name}
                      </h3>
                      {extra.description && (
                        <p className={`text-sm line-clamp-2 leading-relaxed ${!extra.isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                          {extra.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <StatusToggle
                        isActive={extra.isActive}
                        onClick={() => handleToggleStatus('extra', extra.id, !extra.isActive)}
                        isLoading={loadingStatuses[`extra-${extra.id}`]}
                      />
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className={`font-bold text-lg ${!extra.isActive ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatPrice(extra.price)}
                    </span>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button onClick={() => openModal('extra', 'edit', undefined, extra)} className="px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                      <button onClick={() => handleDeleteExtra(extra.id)} disabled={loadingStatuses[`extra-${extra.id}`]} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"><Trash2 size={14} /></button>
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                {modalConfig.mode === 'create' ? 'Create' : 'Edit'} {capitalize(modalConfig.type)}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close modal" title="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

                {/* Name Field (All Types) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder={modalConfig.type === 'variant' ? "e.g., Small, Regular, Large" : modalConfig.type === 'item' ? "e.g., Chicken Biryani" : modalConfig.type === 'extra' ? "e.g., Extra Cheese, Spicy Sauce" : "Category Name"}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Description (Category & Item) */}
                {modalConfig.type !== 'variant' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                    <textarea
                      rows={3}
                      placeholder={modalConfig.type === 'item' ? "e.g., Aromatic basmati rice with tender chicken and spices" : "Brief category description"}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                )}

                {/* Veg/Non-Veg Selection (Item only) */}
                {modalConfig.type === 'item' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dietary Type</label>
                      <AlertCircle className="w-4 h-4 text-amber-500" aria-label="Critical: This affects customer filtering and ordering" />
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      ⚠️ Please select the correct type - this is critical for customer filtering and compliance
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isVeg: true })}
                        className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-2 ${formData.isVeg
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-md'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                      >
                        <Leaf className={`w-6 h-6 ${formData.isVeg ? 'text-green-600' : 'text-gray-400'}`} />
                        <span>Vegetarian</span>
                        <span className="text-xs opacity-75">No meat products</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isVeg: false })}
                        className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-2 ${!formData.isVeg
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-md'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                      >
                        <Beef className={`w-6 h-6 ${!formData.isVeg ? 'text-red-600' : 'text-gray-400'}`} />
                        <span>Non-Vegetarian</span>
                        <span className="text-xs opacity-75">Contains meat</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Create Similar Item Checkbox (Item create only) */}
                {modalConfig.type === 'item' && modalConfig.mode === 'create' && existingSimilarItem && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={createSimilarItem}
                        onChange={(e) => setCreateSimilarItem(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">
                        Copy variants from existing {existingSimilarItem.isVeg ? 'vegetarian' : 'non-vegetarian'} version
                      </span>
                    </label>
                  </div>
                )}

                {/* Image Upload (Item only) */}
                {modalConfig.type === 'item' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image</label>
                    <div
                      className="flex items-center gap-3"
                      onDrop={handleItemImageDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {isUploading ? (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <span className="text-xs font-medium">UPLOADING...</span>
                        </div>
                      ) : formData.imageURL ? (
                        <div className="relative">
                          <img
                            src={formData.imageURL}
                            alt="Item"
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageURL: '' })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-red-300 transition-colors">
                          <Upload size={20} strokeWidth={1.5} />
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
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Variant Specific Fields */}
                {modalConfig.type === 'variant' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Price (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Portion</label>
                        <input
                          type="text"
                          placeholder="e.g. 250g"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Price (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#d5b263] to-[#bfa052] hover:from-[#e0bf70] hover:to-[#d5b263] text-black rounded-xl font-bold shadow-lg shadow-[#d5b263]/20 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-none"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {submitting ? 'Saving...' : (modalConfig.mode === 'create' ? 'Create' : 'Save Changes')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="sm:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open category menu"
                  title="Open category menu"
                >
                  <Menu size={20} />
                </button>
                <h3 className="font-bold text-lg sm:text-xl text-gray-900">Menu Preview</h3>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close preview" title="Close">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
              {/* Category Navigation - Desktop Sidebar */}
              <div className="hidden sm:block w-64 border-r border-gray-200 bg-gray-50 p-4 flex-shrink-0">
                <h4 className="font-semibold text-gray-800 mb-4">Categories</h4>
                <div className="space-y-2">
                  {categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive)).map((category, index) => (
                    <button
                      key={category.id}
                      onClick={() => setCurrentCategoryIndex(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${index === currentCategoryIndex
                        ? 'bg-red-100 text-red-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className="truncate block">{category.category}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({category.items.filter(item => item.isActive).length} items)
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {(() => {
                  const activeCategories = categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive));
                  const currentCategory = activeCategories[currentCategoryIndex];

                  if (!currentCategory) {
                    return (
                      <div className="text-center py-16">
                        <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No active menu items found</p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Category Header */}
                      <div className="mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{currentCategory.category}</h2>
                        {currentCategory.description && (
                          <p className="text-gray-600 text-base sm:text-lg">{currentCategory.description}</p>
                        )}
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        {currentCategory.items.filter(item => item.isActive).map(item => (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              {item.imageURL && (
                                <img
                                  src={item.imageURL}
                                  alt={item.name}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{item.name}</h3>
                                  <FoodTypeIcon type={item.isVeg ? 'veg' : 'non-veg'} />
                                </div>
                                {item.description && (
                                  <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">{item.description}</p>
                                )}

                                {/* Variants */}
                                <div className="space-y-2">
                                  {item.variants.filter(variant => variant.isActive).map(variant => (
                                    <div key={variant.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="font-medium text-gray-800 truncate text-sm sm:text-base">{variant.variantName}</span>
                                        {variant.portionSize && (
                                          <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                            {variant.portionSize}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-bold text-red-600 text-base sm:text-lg flex-shrink-0">{formatPrice(variant.price)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Navigation */}
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 gap-4">
                        <button
                          onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))}
                          disabled={currentCategoryIndex === 0}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={20} />
                          Previous
                        </button>
                        <span className="text-gray-500 text-sm sm:text-base">
                          {currentCategoryIndex + 1} of {activeCategories.length}
                        </span>
                        <button
                          onClick={() => setCurrentCategoryIndex(Math.min(activeCategories.length - 1, currentCategoryIndex + 1))}
                          disabled={currentCategoryIndex === activeCategories.length - 1}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ChevronRight size={20} />
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex sm:hidden">
          <div className="w-80 max-w-[90vw] bg-white h-full shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">Categories</h4>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close category menu" title="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {categories.filter(cat => cat.isActive && cat.items.some(item => item.isActive)).map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setCurrentCategoryIndex(index);
                    setDrawerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${index === currentCategoryIndex
                    ? 'bg-red-100 text-red-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <span className="block font-medium">{category.category}</span>
                  <span className="text-xs text-gray-400">
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
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg sm:text-xl text-gray-900">
                Manage Extras for {assignmentTarget.type === 'category' ? 'Category' : assignmentTarget.type === 'item' ? 'Item' : 'Variant'}
              </h3>
              <button onClick={() => setAssignmentModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close modal" title="Close">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select which extras should be available for this {assignmentTarget.type}.
                </p>

                {extras.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No extras available. Create some extras first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                        <div key={extra.id} className={`flex items-center justify-between p-3 rounded-lg ${isInherited ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
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
                              className={`w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2 ${isInherited ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{extra.name}</p>
                                {isInherited && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    Inherited
                                  </span>
                                )}
                              </div>
                              {extra.description && <p className="text-sm text-gray-500">{extra.description}</p>}
                              <p className="text-sm text-gray-600">₹{(extra.price / 100).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${extra.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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

            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setAssignmentModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {savingAssignments ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
