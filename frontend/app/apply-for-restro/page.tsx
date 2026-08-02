"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { toast } from "react-hot-toast";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Percent,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Utensils,
  Coffee,
  Sandwich,
  UtensilsCrossed,
  Store,
  Truck,
  Pizza,
  ArrowRight,
  ArrowLeft,
  Trash2,
  XCircle,
  CheckCircle2,
  Clock,
  MessageSquare
} from "lucide-react";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

interface FormErrors {
  restaurantName?: string;
  restaurantType?: string;
  restaurantAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  gstNumber?: string;
  fssaiLicenseNumber?: string;
  defaultGstPercentage?: string;
}

interface FormData {
  restaurantName: string;
  restaurantType: string;
  restaurantAddress: string;
  city: string;
  state: string;
  postalCode: string; // Changed to string for 6-box input
  phoneNumber: string;
  email: string;
  description: string;
  gstNumber: string;
  fssaiLicenseNumber: string;
  defaultGstPercentage: number;
}

function ApplyForRestaurantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showRestaurantInfo, setShowRestaurantInfo] = useState(false);
  const [showAddressInfo, setShowAddressInfo] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const postalCodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    restaurantName: "",
    restaurantType: "",
    restaurantAddress: "",
    city: "",
    state: "",
    postalCode: "",
    phoneNumber: "",
    email: "",
    description: "",
    gstNumber: "",
    fssaiLicenseNumber: "",
    defaultGstPercentage: 0
  });

  // Use NEXT_PUBLIC_BACKEND_URL if provided, otherwise default to localhost:3000 (matches backend/API.md)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://myquro.com');

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('[Apply Restaurant Form] Using BACKEND_URL:', BACKEND_URL);
  }

  // Check for existing application
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!session?.user) {
        console.log('[Apply Form] No session user, skipping application check');
        setCheckingExisting(false);
        return;
      }

      console.log('[Apply Form] 🔍 Starting existing application check...');
      console.log('[Apply Form] User ID:', session.user.id);
      console.log('[Apply Form] Backend URL:', BACKEND_URL);

      try {
        const url = `${BACKEND_URL}/api/restaurants/view-request`;
        console.log('[Apply Form] 📡 Fetching:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        console.log('[Apply Form] 📥 Response status:', response.status);
        console.log('[Apply Form] Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const data = await response.json();
          console.log('[Apply Form] ✅ Response data:', JSON.stringify(data, null, 2));
          
          if (data && data.request) {
            console.log('[Apply Form] 🚫 Existing application found!');
            console.log('[Apply Form] Request ID:', data.request.id);
            console.log('[Apply Form] Status:', data.request.requestStatus);
            console.log('[Apply Form] Restaurant ID:', data.request.restaurantId);
            
            const applicationData = {
              status: data.request?.requestStatus?.toLowerCase(),
              restaurantName: data.restaurant?.restaurantName,
              restaurantType: data.restaurant?.restaurantType,
              restaurantAddress: data.restaurant?.restaurantAddress,
              city: data.restaurant?.city,
              state: data.restaurant?.state,
              postalCode: data.restaurant?.postalCode,
              phoneNumber: data.restaurant?.phoneNumber,
              email: data.restaurant?.email,
              adminRemark: data.request?.adminRemark,
              createdAt: data.request?.requestedAt || data.request?.createdAt,
            };
            
            console.log('[Apply Form] 📋 Parsed application data:', applicationData);
            setExistingApplication(applicationData);
            setShowExistingModal(true);
            console.log('[Apply Form] 🔔 Modal triggered');
          } else {
            console.log('[Apply Form] ✅ No existing application found, user can proceed');
          }
        } else {
          const errorText = await response.text();
          console.log('[Apply Form] ❌ API error response:', errorText);
          console.log('[Apply Form] User can proceed with application');
        }
      } catch (error) {
        console.error('[Apply Form] ⚠️ Error checking existing application:', error);
        console.error('[Apply Form] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        console.log('[Apply Form] Allowing user to proceed despite error');
      } finally {
        console.log('[Apply Form] ✓ Check completed, hiding loading state');
        setCheckingExisting(false);
      }
    };

    if (session?.user) {
      checkExistingApplication();
    }
  }, [session?.user, BACKEND_URL]);

  // Load draft from localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem('restaurantApplicationDraft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData(parsedDraft);
        toast.success('Draft loaded from previous session');
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }

    // Get step from URL
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= 4) {
        setCurrentStep(step);
      }
    }
  }, [searchParams]);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    if (formData.restaurantName || formData.restaurantType || formData.restaurantAddress) {
      localStorage.setItem('restaurantApplicationDraft', JSON.stringify(formData));
    }
  }, [formData]);

  // Update URL when step changes
  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', newStep.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Clear draft function
  const clearDraft = () => {
    if (confirm('Are you sure you want to clear the draft? This cannot be undone.')) {
      localStorage.removeItem('restaurantApplicationDraft');
      setFormData({
        restaurantName: "",
        restaurantType: "",
        restaurantAddress: "",
        city: "",
        state: "",
        postalCode: "",
        phoneNumber: "",
        email: "",
        description: "",
        gstNumber: "",
        fssaiLicenseNumber: "",
        defaultGstPercentage: 0
      });
      setTouched({});
      setErrors({});
      updateStep(1);
      toast.success('Draft cleared successfully');
    }
  };

  useEffect(() => {
    if (isPending) return; // Wait for session to load
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] Session check completed', { isPending, hasUser: !!session?.user });
    }
    
    if (!session?.user) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Apply Restaurant Form] No authenticated user, redirecting to signin');
      }
      router.push('/signin');
      return;
    }

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] User authenticated, initializing form animations');
    }

    // GSAP animations
    gsap.utils.toArray('.fade-in-up').forEach((element) => {
      const el = element as HTMLElement;
      gsap.fromTo(el,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "ease-out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [session, isPending, router]);

  const validateForm = (): boolean => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] Starting form validation');
    }

    const newErrors: FormErrors = {};

    // Restaurant Name
    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = "Restaurant name is required";
    } else if (formData.restaurantName.length < 2) {
      newErrors.restaurantName = "Restaurant name must be at least 2 characters";
    } else if (formData.restaurantName.length > 100) {
      newErrors.restaurantName = "Restaurant name must be less than 100 characters";
    }

    // Restaurant Type
    if (!formData.restaurantType) {
      newErrors.restaurantType = "Please select a restaurant type";
    }

    // Address
    if (!formData.restaurantAddress.trim()) {
      newErrors.restaurantAddress = "Restaurant address is required";
    } else if (formData.restaurantAddress.length < 10) {
      newErrors.restaurantAddress = "Please provide a complete address (minimum 10 characters)";
    }

    // City
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    // State
    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    // Postal Code
    if (!formData.postalCode || formData.postalCode.length === 0) {
      newErrors.postalCode = "Postal code is required";
    } else if (formData.postalCode.length !== 6) {
      newErrors.postalCode = "Postal code must be exactly 6 digits";
    } else if (!/^\d{6}$/.test(formData.postalCode)) {
      newErrors.postalCode = "Postal code must contain only numbers";
    }

    // Phone Number
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits";
    } else if (!['6', '7', '8', '9'].includes(formData.phoneNumber[0])) {
      newErrors.phoneNumber = "Phone number must start with 6, 7, 8, or 9";
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Description
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    } else if (formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    // GST Number
    if (!formData.gstNumber.trim()) {
      newErrors.gstNumber = "GST number is required";
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber.toUpperCase())) {
      newErrors.gstNumber = "Invalid GST format (e.g., 22AAAAA0000A1Z5)";
    }

    // FSSAI License
    if (!formData.fssaiLicenseNumber.trim()) {
      newErrors.fssaiLicenseNumber = "FSSAI license number is required";
    } else if (!/^\d{14}$/.test(formData.fssaiLicenseNumber)) {
      newErrors.fssaiLicenseNumber = "FSSAI license must be exactly 14 digits";
    }

    // GST Percentage
    if (!formData.defaultGstPercentage || formData.defaultGstPercentage <= 0) {
      newErrors.defaultGstPercentage = "GST percentage must be greater than 0";
    } else if (formData.defaultGstPercentage > 100) {
      newErrors.defaultGstPercentage = "GST percentage cannot exceed 100%";
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] Validation result:', { isValid, errorCount: Object.keys(newErrors).length, errors: newErrors });
    }

    return isValid;
  };

  const validateField = (name: string, value: any) => {
    let error = '';

    switch (name) {
      case 'restaurantName':
        if (!value.trim()) error = "Restaurant name is required";
        else if (value.length < 2) error = "Must be at least 2 characters";
        else if (value.length > 100) error = "Must be less than 100 characters";
        break;
      case 'restaurantType':
        if (!value) error = "Please select a restaurant type";
        break;
      case 'restaurantAddress':
        if (!value.trim()) error = "Address is required";
        else if (value.length < 10) error = "Please provide a complete address";
        break;
      case 'city':
        if (!value.trim()) error = "City is required";
        break;
      case 'state':
        if (!value.trim()) error = "State is required";
        break;
      case 'postalCode':
        if (!value) error = "Postal code is required";
        else if (value.length !== 6) error = "Must be 6 digits";
        else if (!/^\d{6}$/.test(value)) error = "Must contain only numbers";
        break;
      case 'phoneNumber':
        if (!value.trim()) error = "Phone number is required";
        else if (!/^\d{10}$/.test(value)) error = "Must be 10 digits";
        else if (!['6', '7', '8', '9'].includes(value[0])) error = "Must start with 6, 7, 8, or 9";
        break;
      case 'email':
        if (!value.trim()) error = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format";
        break;
      case 'description':
        if (!value.trim()) error = "Description is required";
        else if (value.length < 20) error = "Must be at least 20 characters";
        else if (value.length > 500) error = "Must be less than 500 characters";
        break;
      case 'gstNumber':
        if (!value.trim()) error = "GST number is required";
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(value)) error = "Invalid GST format";
        break;
      case 'fssaiLicenseNumber':
        if (!value.trim()) error = "FSSAI license is required";
        else if (!/^\d{14}$/.test(value)) error = "Must be 14 digits";
        break;
      case 'defaultGstPercentage':
        if (!value || value <= 0) error = "Must be greater than 0";
        else if (value > 100) error = "Cannot exceed 100%";
        break;
    }

    return error;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;

    // Convert defaultGstPercentage to number
    if (name === 'defaultGstPercentage') {
      processedValue = parseFloat(value) || 0;
    }
    
    // Auto-uppercase GST number
    if (name === 'gstNumber') {
      processedValue = value.toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));

    // Real-time validation
    const error = validateField(name, processedValue);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  // Postal Code 6-box input handler
  const handlePostalCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const currentPostalCode = formData.postalCode.split('');
    
    if (value) {
      currentPostalCode[index] = value;
      const newPostalCode = currentPostalCode.join('');
      
      setFormData(prev => ({ ...prev, postalCode: newPostalCode }));
      setTouched(prev => ({ ...prev, postalCode: true }));
      
      // Auto-focus next box
      if (index < 5 && postalCodeRefs.current[index + 1]) {
        postalCodeRefs.current[index + 1]?.focus();
      }
    } else {
      currentPostalCode[index] = '';
      setFormData(prev => ({ ...prev, postalCode: currentPostalCode.join('') }));
    }

    // Validate
    const error = validateField('postalCode', currentPostalCode.join(''));
    setErrors(prev => ({ ...prev, postalCode: error || undefined }));
  };

  const handlePostalCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const currentPostalCode = formData.postalCode.split('');
      
      if (!currentPostalCode[index] && index > 0) {
        // If current box is empty and backspace is pressed, move to previous box
        postalCodeRefs.current[index - 1]?.focus();
        currentPostalCode[index - 1] = '';
      } else {
        currentPostalCode[index] = '';
      }
      
      setFormData(prev => ({ ...prev, postalCode: currentPostalCode.join('') }));
      
      const error = validateField('postalCode', currentPostalCode.join(''));
      setErrors(prev => ({ ...prev, postalCode: error || undefined }));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      postalCodeRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      postalCodeRefs.current[index + 1]?.focus();
    }
  };

  const handlePostalCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pasteData) {
      setFormData(prev => ({ ...prev, postalCode: pasteData }));
      setTouched(prev => ({ ...prev, postalCode: true }));
      
      const error = validateField('postalCode', pasteData);
      setErrors(prev => ({ ...prev, postalCode: error || undefined }));
      
      // Focus last filled box or first empty box
      const nextIndex = Math.min(pasteData.length, 5);
      postalCodeRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] Form submission started', { formData });
    }
    
    if (!validateForm()) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Apply Restaurant Form] Form validation failed', { errors });
      }
      toast.error('Please fix all errors before submitting');
      
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element?.focus();
      }
      return;
    }

    setLoading(true);
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Apply Restaurant Form] Validation passed, sending request to backend');
    }

    try {
      const url = `${BACKEND_URL}/api/restaurants/apply`;

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Apply Restaurant Form] Sending request to', url);
      }

      // Convert postalCode to number for backend
      const submitData = {
        ...formData,
        postalCode: parseInt(formData.postalCode, 10)
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData)
      });

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Apply Restaurant Form] API response received', { status: response.status, statusText: response.statusText });
      }

      let data: any = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          console.error('[Apply Restaurant Form] Failed to parse JSON response:', e);
        }
      }

      if (response.ok) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('[Apply Restaurant Form] Application submitted successfully', data);
        }
        
        // Clear draft from localStorage on successful submission
        localStorage.removeItem('restaurantApplicationDraft');
        
        toast.success(data?.message || '🎉 Restaurant application submitted successfully!');
        
        // Wait a moment before redirect
        setTimeout(() => {
          router.push('/home');
        }, 1500);
      } else {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.error('[Apply Restaurant Form] API returned error', { status: response.status, data });
        }

        // Handle field-specific errors from backend
        if (data && data.errors && typeof data.errors === 'object') {
          setErrors(prev => ({ ...prev, ...data.errors }));
          toast.error('Please fix the highlighted errors');
        } else {
          const errorMessage = data?.message || `Failed to submit application (${response.status})`;
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[Apply Restaurant Form] Network error occurred', error);
      }
      console.error('Error submitting application:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Apply Restaurant Form] Form submission completed');
      }
    }
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    
    if (step === 1) {
      if (!formData.restaurantName.trim()) newErrors.restaurantName = "Restaurant name is required";
      else if (formData.restaurantName.length < 2) newErrors.restaurantName = "Must be at least 2 characters";
      if (!formData.restaurantType) newErrors.restaurantType = "Please select a restaurant type";
      if (!formData.description.trim()) newErrors.description = "Description is required";
      else if (formData.description.length < 20) newErrors.description = "Must be at least 20 characters";
    } else if (step === 2) {
      if (!formData.restaurantAddress.trim()) newErrors.restaurantAddress = "Address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State is required";
      if (!formData.postalCode || formData.postalCode.length !== 6) newErrors.postalCode = "Valid 6-digit postal code required";
    } else if (step === 3) {
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
      else if (!/^\d{10}$/.test(formData.phoneNumber)) newErrors.phoneNumber = "Must be 10 digits";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    } else if (step === 4) {
      if (!formData.gstNumber.trim()) newErrors.gstNumber = "GST number is required";
      if (!formData.fssaiLicenseNumber.trim()) newErrors.fssaiLicenseNumber = "FSSAI license is required";
      if (!formData.defaultGstPercentage || formData.defaultGstPercentage <= 0) newErrors.defaultGstPercentage = "GST percentage required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        updateStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      toast.error('Please fix all errors before continuing');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isPending || checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#d5b263]/10 rounded-full animate-ping"></div>
            <Loader2 className="w-8 h-8 text-[#d5b263] animate-spin relative z-10" />
          </div>
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2 animate-pulse">
            {isPending ? 'Loading Profile...' : 'Checking Application Status...'}
          </p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d5b263]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#d5b263]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-2xl mb-4 sm:mb-6 shadow-inner">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#d5b263] drop-shadow-[0_0_8px_rgba(213,178,99,0.4)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 px-4 uppercase tracking-tight">
            Apply for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d5b263] to-amber-500 drop-shadow-[0_2px_10px_rgba(213,178,99,0.15)]">Restaurant</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto px-4 font-bold tracking-widest uppercase">
            Join MyQuro and start your culinary journey
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div className="bg-[#0c0c0e]/80 backdrop-blur-xl rounded-[24px] border border-white/5 p-6 mb-6 shadow-2xl fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Application Progress</h3>
            <span className="text-xs font-black text-zinc-500">Step {currentStep} of 4</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${
                  step <= currentStep ? 'bg-[#d5b263]' : 'bg-zinc-850'
                }`} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { number: 1, title: 'Restaurant', icon: Building2 },
              { number: 2, title: 'Address', icon: MapPin },
              { number: 3, title: 'Contact', icon: Phone },
              { number: 4, title: 'Legal', icon: FileText }
            ].map(({ number, title, icon: Icon }) => (
              <div key={number} className={`text-center ${
                number === currentStep ? 'text-[#d5b263] font-black' : 'text-zinc-500'
              }`}>
                <Icon className={`w-4 h-4 mx-auto mb-1.5 ${
                  number <= currentStep ? 'text-[#d5b263] drop-shadow-[0_0_6px_rgba(213,178,99,0.2)]' : 'text-zinc-600'
                }`} />
                <p className="text-[10px] font-black uppercase tracking-wider">{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Draft Notification */}
        {(formData.restaurantName || formData.phoneNumber || formData.email) && (
          <div className="bg-[#d5b263]/5 border border-[#d5b263]/15 rounded-2xl p-4 mb-6 fade-in-up flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[#d5b263] flex-shrink-0" />
              <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                Your progress is automatically saved as a draft. You can continue later.
              </p>
            </div>
            <button
              type="button"
              onClick={clearDraft}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl transition-all font-black uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Draft</span>
            </button>
          </div>
        )}

        {/* Application Form */}
        <div className="bg-[#0c0c0e]/80 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white/5 p-5 sm:p-8 md:p-12 fade-in-up relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Step 1: Restaurant Details */}
            {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#d5b263] flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  Restaurant Details
                </h2>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setShowRestaurantInfo(!showRestaurantInfo)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#d5b263]/10 hover:bg-[#d5b263]/25 text-[#d5b263] flex items-center justify-center transition-all focus:ring-1 focus:ring-[#d5b263]/40 border border-[#d5b263]/20"
                    aria-label="Restaurant details information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showRestaurantInfo && (
                    <>
                      {/* Mobile overlay backdrop */}
                      <div 
                        className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                        onClick={() => setShowRestaurantInfo(false)}
                      />
                      <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:translate-y-0 sm:mt-2 w-auto sm:w-80 bg-[#0c0c0e] border border-[#d5b263]/20 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-[#d5b263]/10 rounded-xl flex items-center justify-center border border-[#d5b263]/20">
                            <Building2 className="w-5 h-5 text-[#d5b263]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-white mb-2.5 text-xs uppercase tracking-wider">
                              Restaurant Information
                            </h3>
                            <ul className="space-y-2 text-[11px] text-zinc-400">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Choose a clear and memorable name for your restaurant</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Select the type that best describes your dining experience</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Write a compelling description highlighting your cuisine, ambiance, and unique features</span>
                              </li>
                            </ul>
                            <p className="mt-3 text-[10px] text-zinc-500 italic">
                              This information will be displayed to customers on your restaurant profile.
                            </p>
                            <button
                              onClick={() => setShowRestaurantInfo(false)}
                              className="mt-3.5 w-full sm:w-auto px-4 py-2 bg-[#d5b263] text-black text-[11px] font-black rounded-xl transition-all hover:bg-[#c4a152] uppercase tracking-wider"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="restaurantName" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Restaurant Name <span className="text-[#d5b263]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="restaurantName"
                      name="restaurantName"
                      required
                      value={formData.restaurantName}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('restaurantName')}
                      className={`w-full pl-4 pr-10 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white ${
                        touched.restaurantName && errors.restaurantName ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                      }`}
                      placeholder="Enter restaurant name"
                    />
                    {formData.restaurantName && !errors.restaurantName && touched.restaurantName && (
                      <CheckCircle className="absolute right-3 top-3 w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  {touched.restaurantName && errors.restaurantName && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.restaurantName}</span>
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
                    Restaurant Type <span className="text-[#d5b263]">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { value: 'fine-dining', label: 'Fine Dining', icon: UtensilsCrossed },
                      { value: 'casual', label: 'Casual', icon: Utensils },
                      { value: 'fast-food', label: 'Fast Food', icon: Pizza },
                      { value: 'cafe', label: 'Cafe', icon: Coffee },
                      { value: 'buffet', label: 'Buffet', icon: Sandwich },
                      { value: 'food-truck', label: 'Food Truck', icon: Truck },
                      { value: 'other', label: 'Other', icon: Store }
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.restaurantType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, restaurantType: type.value }));
                            setTouched(prev => ({ ...prev, restaurantType: true }));
                            const error = validateField('restaurantType', type.value);
                            setErrors(prev => ({ ...prev, restaurantType: error || undefined }));
                          }}
                          onBlur={() => handleBlur('restaurantType')}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[100px] ${
                            isSelected
                              ? 'border-[#d5b263]/40 bg-[#d5b263]/5 shadow-lg shadow-[#d5b263]/5 transform scale-[1.02]'
                              : 'border-zinc-900 bg-[#050506]/40 hover:border-zinc-800 hover:bg-zinc-900/30'
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`Select ${type.label}`}
                        >
                          {isSelected && (
                            <CheckCircle className="absolute top-2.5 right-2.5 w-4 h-4 text-[#d5b263]" />
                          )}
                          <Icon className={`w-8 h-8 ${
                            isSelected ? 'text-[#d5b263] drop-shadow-[0_0_8px_rgba(213,178,99,0.3)]' : 'text-zinc-650'
                          }`} />
                          <span className={`text-xs font-black uppercase tracking-wider text-center ${
                            isSelected ? 'text-[#d5b263]' : 'text-zinc-400'
                          }`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {touched.restaurantType && errors.restaurantType && (
                    <p className="mt-2 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.restaurantType}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Description / About your restaurant <span className="text-[#d5b263]">*</span>
                  <span className="text-[10px] text-zinc-500 ml-2 font-bold normal-case">
                    ({formData.description.length}/500 characters)
                  </span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('description')}
                  className={`w-full px-4 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white resize-none ${
                    touched.description && errors.description ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                  }`}
                  placeholder="Describe your restaurant, cuisine type, specialties, etc."
                  maxLength={500}
                />
                {touched.description && errors.description && (
                  <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <span>{errors.description}</span>
                  </p>
                )}
              </div>
            </div>
            )}

            {/* Step 2: Address Details */}
            {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-[#d5b263] flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  Address Details
                </h2>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setShowAddressInfo(!showAddressInfo)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#d5b263]/10 hover:bg-[#d5b263]/25 text-[#d5b263] flex items-center justify-center transition-all focus:ring-1 focus:ring-[#d5b263]/40 border border-[#d5b263]/20"
                    aria-label="Address details information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showAddressInfo && (
                    <>
                      {/* Mobile overlay backdrop */}
                      <div 
                        className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                        onClick={() => setShowAddressInfo(false)}
                      />
                      <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:translate-y-0 sm:mt-2 w-auto sm:w-80 bg-[#0c0c0e] border border-[#d5b263]/20 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-[#d5b263]/10 rounded-xl flex items-center justify-center border border-[#d5b263]/20">
                            <MapPin className="w-5 h-5 text-[#d5b263]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-white mb-2.5 text-xs uppercase tracking-wider">
                              Why we need your address
                            </h3>
                            <ul className="space-y-2 text-[11px] text-zinc-400">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Helps customers find your restaurant location</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Required for delivery zone setup and logistics</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span>Used for local search and map integration</span>
                              </li>
                            </ul>
                            <p className="mt-3 text-[10px] text-zinc-500 italic">
                              Provide the complete address where customers can visit your restaurant.
                            </p>
                            <button
                              onClick={() => setShowAddressInfo(false)}
                              className="mt-3.5 w-full sm:w-auto px-4 py-2 bg-[#d5b263] text-black text-[11px] font-black rounded-xl transition-all hover:bg-[#c4a152] uppercase tracking-wider"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="restaurantAddress" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Restaurant Address <span className="text-[#d5b263]">*</span>
                </label>
                <input
                  type="text"
                  id="restaurantAddress"
                  name="restaurantAddress"
                  required
                  value={formData.restaurantAddress}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('restaurantAddress')}
                  className={`w-full px-4 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white ${
                    touched.restaurantAddress && errors.restaurantAddress ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                  }`}
                  placeholder="Street address, building name, etc."
                />
                {touched.restaurantAddress && errors.restaurantAddress && (
                  <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <span>{errors.restaurantAddress}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="city" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    City <span className="text-[#d5b263]">*</span>
                  </label>
                  <select
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('city')}
                    className={`w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white bg-[#050506] ${
                      touched.city && errors.city ? 'border-rose-500/50 bg-rose-950/10 text-rose-300' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                  >
                    <option value="">Select city</option>
                    <option value="Bokaro">Bokaro</option>
                    <option value="Ranchi">Ranchi</option>
                    <option value="Dhanbad">Dhanbad</option>
                    <option value="Jamshedpur">Jamshedpur</option>
                  </select>
                  {touched.city && errors.city && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.city}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    State <span className="text-[#d5b263]">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('state')}
                    className={`w-full px-4 py-2.5 sm:py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white bg-[#050506] ${
                      touched.state && errors.state ? 'border-rose-500/50 bg-rose-950/10 text-rose-300' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                  >
                    <option value="">Select state</option>
                    <option value="Jharkhand">Jharkhand</option>
                  </select>
                  {touched.state && errors.state && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.state}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Postal Code <span className="text-[#d5b263]">*</span>
                </label>
                <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start max-w-md">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => { postalCodeRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={formData.postalCode[index] || ''}
                      onChange={(e) => handlePostalCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handlePostalCodeKeyDown(index, e)}
                      onPaste={index === 0 ? handlePostalCodePaste : undefined}
                      onBlur={() => handleBlur('postalCode')}
                      className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-black bg-black/45 border-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-white ${
                        touched.postalCode && errors.postalCode ? 'border-rose-500/50 bg-rose-950/10' : 'border-zinc-850 hover:border-zinc-800'
                      }`}
                      aria-label={`Postal code digit ${index + 1}`}
                    />
                  ))}
                </div>
                {touched.postalCode && errors.postalCode && (
                  <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <span>{errors.postalCode}</span>
                  </p>
                )}
                <p className="mt-2.5 text-[10px] text-zinc-500 flex items-start gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600" />
                  <span>Enter 6-digit postal code. You can paste the full code in the first box.</span>
                </p>
              </div>
            </div>
            )}

            {/* Step 3: Contact Details */}
            {currentStep === 3 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-[#d5b263] flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  Contact Details
                </h2>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    onBlur={() => setTimeout(() => setShowContactInfo(false), 200)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#d5b263]/10 hover:bg-[#d5b263]/25 text-[#d5b263] flex items-center justify-center transition-all focus:ring-1 focus:ring-[#d5b263]/40 border border-[#d5b263]/20"
                    aria-label="Contact information help"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showContactInfo && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-[#0c0c0e] border border-[#d5b263]/20 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#d5b263]/10 rounded-xl flex items-center justify-center border border-[#d5b263]/20">
                          <Info className="w-5 h-5 text-[#d5b263]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-white mb-2.5 text-xs uppercase tracking-wider">
                            Why we need contact details
                          </h3>
                          <ul className="space-y-2 text-[11px] text-zinc-400">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>To communicate important updates about your application</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>For customer inquiries and support</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Phone className="w-3.5 h-3.5 text-[#d5b263] flex-shrink-0 mt-0.5" />
                              <span className="font-bold text-zinc-350">A verification call will be made to confirm your phone number and verify restaurant details</span>
                            </li>
                          </ul>
                          <p className="mt-3 text-[10px] text-zinc-500 italic">
                            Your contact information is kept secure and never shared with third parties.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="phoneNumber" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Phone Number <span className="text-[#d5b263]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      <Image
                        src="/india.svg"
                        alt="India"
                        width={20}
                        height={14}
                        className="object-cover rounded-[2px] opacity-90"
                      />
                      <span className="text-zinc-400 font-bold text-sm">+91</span>
                      <span className="text-zinc-800">|</span>
                    </div>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('phoneNumber')}
                      className={`w-full pl-24 pr-10 py-2.5 sm:py-3 bg-black/40 border-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white font-black ${
                        touched.phoneNumber && errors.phoneNumber ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                  {touched.phoneNumber && errors.phoneNumber && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.phoneNumber}</span>
                    </p>
                  )}
                  {formData.phoneNumber && !errors.phoneNumber && touched.phoneNumber && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Valid phone number</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Email Address <span className="text-[#d5b263]">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('email')}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white ${
                      touched.email && errors.email ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                    placeholder="contact@restaurant.com"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                  {formData.email && !errors.email && touched.email && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Valid email address</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Step 4: Legal Details */}
            {currentStep === 4 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#d5b263] flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  Legal & Compliance
                </h2>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setShowLegalInfo(!showLegalInfo)}
                    onBlur={() => setTimeout(() => setShowLegalInfo(false), 200)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#d5b263]/10 hover:bg-[#d5b263]/25 text-[#d5b263] flex items-center justify-center transition-all focus:ring-1 focus:ring-[#d5b263]/40 border border-[#d5b263]/20"
                    aria-label="Legal compliance information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showLegalInfo && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-[#0c0c0e] border border-[#d5b263]/20 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#d5b263]/10 rounded-xl flex items-center justify-center border border-[#d5b263]/20">
                          <FileText className="w-5 h-5 text-[#d5b263]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-white mb-2.5 text-xs uppercase tracking-wider">
                            Legal Requirements
                          </h3>
                          <ul className="space-y-2 text-[11px] text-zinc-400">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span><strong>GST Number:</strong> Required for tax compliance and invoice generation</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span><strong>FSSAI License:</strong> Mandatory food safety certification for all food businesses in India</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span><strong>GST Rate:</strong> Default tax percentage applied to menu items</span>
                            </li>
                          </ul>
                          <p className="mt-3 text-[10px] text-zinc-500 italic">
                            These documents will be verified during the approval process.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="gstNumber" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    GST Number <span className="text-[#d5b263]">*</span>
                  </label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    required
                    maxLength={15}
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('gstNumber')}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white uppercase ${
                      touched.gstNumber && errors.gstNumber ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  {touched.gstNumber && errors.gstNumber && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.gstNumber}</span>
                    </p>
                  )}
                  {formData.gstNumber && !errors.gstNumber && touched.gstNumber && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Valid GST number</span>
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Format: 22AAAAA0000A1Z5</p>
                </div>

                <div>
                  <label htmlFor="fssaiLicenseNumber" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    FSSAI License <span className="text-[#d5b263]">*</span>
                  </label>
                  <input
                    type="text"
                    id="fssaiLicenseNumber"
                    name="fssaiLicenseNumber"
                    required
                    inputMode="numeric"
                    maxLength={14}
                    value={formData.fssaiLicenseNumber}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('fssaiLicenseNumber')}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white ${
                      touched.fssaiLicenseNumber && errors.fssaiLicenseNumber ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                    placeholder="12345678901234"
                  />
                  {touched.fssaiLicenseNumber && errors.fssaiLicenseNumber && (
                    <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{errors.fssaiLicenseNumber}</span>
                    </p>
                  )}
                  {formData.fssaiLicenseNumber && !errors.fssaiLicenseNumber && touched.fssaiLicenseNumber && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Valid FSSAI license</span>
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">14-digit license number</p>
                </div>
              </div>

              <div>
                <label htmlFor="defaultGstPercentage" className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Default GST Percentage <span className="text-[#d5b263]">*</span>
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    id="defaultGstPercentage"
                    name="defaultGstPercentage"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.defaultGstPercentage}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('defaultGstPercentage')}
                    className={`w-full pl-4 pr-12 py-2.5 sm:py-3 bg-black/40 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 transition-all text-base text-white ${
                      touched.defaultGstPercentage && errors.defaultGstPercentage ? 'border-rose-500/50 bg-rose-950/10 text-rose-300 focus:ring-rose-500/40 focus:border-rose-500/40' : 'border-zinc-850 hover:border-zinc-800'
                    }`}
                    placeholder="18.00"
                  />
                  <Percent className="absolute right-3 top-3 w-5 h-5 text-zinc-400" />
                </div>
                {touched.defaultGstPercentage && errors.defaultGstPercentage && (
                  <p className="mt-1.5 text-xs text-rose-450 flex items-start gap-1 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <span>{errors.defaultGstPercentage}</span>
                  </p>
                )}
                <p className="mt-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Standard GST rates: 5%, 12%, 18%, or 28%</p>
              </div>
            </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3.5 bg-[#d5b263] text-black hover:bg-[#c4a152] rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#d5b263]/10 active:scale-95 transition-all ml-auto"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 min-w-[200px] px-8 py-3.5 bg-[#d5b263] text-black hover:bg-[#c4a152] rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#d5b263]/10 active:scale-95 transition-all disabled:opacity-50 ml-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {currentStep === 4 && (
              <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
                By submitting, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs text-[#d5b263] underline hover:text-[#c4a152] font-semibold">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-[#d5b263] underline hover:text-[#c4a152] font-semibold">Privacy Policy</a> of Myquro Pvt Ltd.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Existing Application Modal */}
      {showExistingModal && existingApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Existing Restaurant Application</h3>
              <button
                onClick={() => router.push('/home')}
                className="p-1.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Alert Banner */}
              <div className="bg-[#d5b263]/5 border border-[#d5b263]/15 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#d5b263] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-black uppercase tracking-wider text-xs mb-1">Application Already Submitted</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                      You have already submitted a restaurant application. You cannot submit another application while your current request is being processed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Current Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest ${
                    existingApplication.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : existingApplication.status === 'rejected'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
                  }`}
                >
                  {existingApplication.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {existingApplication.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {existingApplication.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                  {existingApplication.status?.toUpperCase()}
                </span>
              </div>

              {/* Restaurant Details */}
              <div className="grid md:grid-cols-2 gap-6 bg-[#050506]/65 border border-white/5 rounded-2xl p-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Restaurant Name</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.restaurantName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Restaurant Type</label>
                    <p className="text-white font-bold mt-1 text-sm capitalize">{existingApplication.restaurantType}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Phone Number</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Email</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Address</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.restaurantAddress}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">City</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.city}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">State</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.state}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Postal Code</label>
                    <p className="text-white font-bold mt-1 text-sm">{existingApplication.postalCode}</p>
                  </div>
                </div>
              </div>

              {/* Admin Remark */}
              {existingApplication.adminRemark && (
                <div className="bg-[#121215]/60 rounded-xl p-4 border border-white/5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#d5b263]" />
                    Admin Remark
                  </label>
                  <p className="text-zinc-300 text-xs font-medium whitespace-pre-wrap">{existingApplication.adminRemark}</p>
                </div>
              )}

              {/* Applied Date */}
              {existingApplication.createdAt && (
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Applied on: {new Date(existingApplication.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/5">
                {existingApplication.status === 'approved' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 bg-[#d5b263] text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#c4a152] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#d5b263]/10"
                  >
                    <Building2 className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                )}
                {existingApplication.status === 'pending' && (
                  <div className="flex-1 bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center">
                    Your application is under review
                  </div>
                )}
                {existingApplication.status === 'rejected' && (
                  <div className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center">
                    Application was rejected. Please contact support.
                  </div>
                )}
                <button
                  onClick={() => router.push('/home')}
                  className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ApplyForRestaurantPage />
    </Suspense>
  );
}