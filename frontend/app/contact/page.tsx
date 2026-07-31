"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { Store, User, Phone, Mail, Globe, MessageSquare, Check, Send, Loader2, UtensilsCrossed } from 'lucide-react';
import { Toaster, toast } from 'sonner';

gsap.registerPlugin(ScrollTrigger);

export default function ContactPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [restaurantForm, setRestaurantForm] = useState({
    restaurant: '',
    owner: '',
    phone: '',
    email: '',
    social: '',
    website: '',
    message: ''
  });
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [hasWebsite, setHasWebsite] = useState(false);
  const [websiteInfo, setWebsiteInfo] = useState('');
  const [websitePreview, setWebsitePreview] = useState<any>(null);
  const [websiteFetchCount, setWebsiteFetchCount] = useState(0);
  const [confirmedWebsiteData, setConfirmedWebsiteData] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    // Smooth scroll
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const selectType = (type: string) => {
    setSelectedType(type);
    setTimeout(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRestaurantForm({ ...restaurantForm, [e.target.name]: e.target.value });
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerForm({ ...customerForm, [e.target.name]: e.target.value });
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setRestaurantForm({ ...restaurantForm, website: url });
    if (url) {
      if (/^https?:\/\/.+/.test(url)) {
        setWebsiteInfo(`Website: ${url}`);
      } else {
        setWebsiteInfo('Please enter a valid URL starting with http:// or https://');
      }
    } else {
      setWebsiteInfo('');
    }
  };

  const fetchWebsiteData = async (url: string) => {
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`);
      const data = await response.json();
      if (data.status === 'success') {
        setWebsiteFetchCount(prev => prev + 1);
        setConfirmedWebsiteData(data.data);
        setWebsitePreview(data.data);
      } else {
        throw new Error('Failed to fetch website data');
      }
    } catch (error) {
      console.error('Error fetching website data:', error);
      setWebsitePreview({ error: 'Failed to fetch website information. Please check the URL and try again.' });
    }
  };

  const getSocialMediaType = (url: string) => {
    if (!url) return 'None';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    // Add other types as needed
    return 'Other';
  };

  const getSocialIcon = (type: string) => {
    switch (type) {
      case 'Instagram':
        return <Globe className="input-icon w-5 h-5" />; // Using Globe as fallback for now
      default:
        return <Globe className="input-icon w-5 h-5" />;
    }
  };

  const validateField = (name: string, value: string, isRestaurant: boolean) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'restaurant':
        if (!value) newErrors.restaurant = 'Restaurant name is required.';
        else delete newErrors.restaurant;
        break;
      case 'owner':
        if (!value) newErrors.owner = 'Owner name is required.';
        else delete newErrors.owner;
        break;
      case 'phone':
        if (!value) newErrors.phone = 'Phone number is required.';
        else if (!/^[6-9]\d{9}$/.test(value)) newErrors.phone = 'Please enter a valid 10-digit Indian mobile number starting with 6-9.';
        else delete newErrors.phone;
        break;
      case 'email':
        if (!value) newErrors.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = 'Please enter a valid email address.';
        else delete newErrors.email;
        break;
      case 'social':
        if (value && !/^https?:\/\/.+/.test(value)) newErrors.social = 'Please enter a valid URL.';
        else delete newErrors.social;
        break;
      case 'website':
        if (value && !/^https?:\/\/.+/.test(value)) newErrors.website = 'Please enter a valid URL.';
        else delete newErrors.website;
        break;
      case 'message':
        if (!value) newErrors.message = 'Message is required.';
        else delete newErrors.message;
        break;
      case 'name':
        if (!value) newErrors.name = 'Name is required.';
        else delete newErrors.name;
        break;
    }
    setErrors(newErrors);
  };

  const validateForm = (form: any, isRestaurant: boolean) => {
    const newErrors: any = {};
    if (isRestaurant) {
      if (!form.restaurant) newErrors.restaurant = 'Restaurant name is required.';
      if (!form.owner) newErrors.owner = 'Owner name is required.';
      if (!form.phone) newErrors.phone = 'Phone number is required.';
      else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = 'Please enter a valid 10-digit Indian mobile number starting with 6-9.';
      if (!form.email) newErrors.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Please enter a valid email address.';
      if (form.social && !/^https?:\/\/.+/.test(form.social)) newErrors.social = 'Please enter a valid URL.';
      if (form.website && !/^https?:\/\/.+/.test(form.website)) newErrors.website = 'Please enter a valid website URL.';
      if (!form.message) newErrors.message = 'Message is required.';
    } else {
      if (!form.name) newErrors.name = 'Full name is required.';
      if (!form.phone) newErrors.phone = 'Phone number is required.';
      else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = 'Please enter a valid 10-digit Indian mobile number starting with 6-9.';
      if (!form.email) newErrors.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Please enter a valid email address.';
      if (!form.message) newErrors.message = 'Message is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(restaurantForm, true)) return;
    setLoading(true);
    const socialType = getSocialMediaType(restaurantForm.social);
    const content = `**PARTNER REQUEST**\n**Restaurant:** ${restaurantForm.restaurant}\n**Owner:** ${restaurantForm.owner}\n**Phone:** ${restaurantForm.phone}\n**Email:** ${restaurantForm.email}\n**Social Platform:** ${socialType}\n**Social Link:** ${restaurantForm.social || 'Not provided'}\n**Website:** ${restaurantForm.website || 'Not provided'}\n**Website Fetch Count:** ${websiteFetchCount}\n**Website Data:** ${confirmedWebsiteData ? `Title: ${confirmedWebsiteData.title || 'N/A'}, Description: ${confirmedWebsiteData.description || 'N/A'}, URL: ${confirmedWebsiteData.url || 'N/A'}` : 'Not provided'}\n**Message:** ${restaurantForm.message}`;
    try {
      const response = await fetch('https://discord.com/api/webhooks/1444308256213172367/D5KV2Zgj6QHWLu-mw1dimYpSzDSLP9WZUZjJj-afIZqMtEWpig7HPETiU19yXXUxvaqb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (response.ok) {
        toast.success('Thank you! Our team has received your partner application and will contact you shortly.');
        // Reset form
        setRestaurantForm({
          restaurant: '',
          owner: '',
          phone: '',
          email: '',
          social: '',
          website: '',
          message: ''
        });
        setHasWebsite(false);
        setWebsitePreview(null);
        setConfirmedWebsiteData(null);
        setSelectedType(null);
      } else {
        toast.error('There was an error sending your application. Please try again later.');
      }
    } catch {
      toast.error('There was an error sending your application. Please try again later.');
    }
    setLoading(false);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(customerForm, false)) return;
    setLoading(true);
    const content = `**USER REQUEST**\n**Name:** ${customerForm.name}\n**Phone:** ${customerForm.phone}\n**Email:** ${customerForm.email}\n**Message:** ${customerForm.message}`;
    try {
      const response = await fetch('https://discord.com/api/webhooks/1444309280252497991/_LP-I_MPslgiVAAWxIhs0QepZgUoeYKU_VDHN6J3adfd2OHTeY-9HaOdew8wtr_pZChr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (response.ok) {
        toast.success('Thank you! Our team has received your message and will contact you shortly.');
        // Reset form
        setCustomerForm({
          name: '',
          phone: '',
          email: '',
          message: ''
        });
        setSelectedType(null);
      } else {
        toast.error('There was an error sending your message. Please try again later.');
      }
    } catch {
      toast.error('There was an error sending your message. Please try again later.');
    }
    setLoading(false);
  };

  const openLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
    setLightboxImage('');
  };

  return (
    <>
      {/* Splash Screen */}
      <div className="page-overlay">
        <div className="splash-text-container">
          <div className="splash-ring"></div>
          <div className="splash-title">
            <span className="splash-char">C</span>
            <span className="splash-char">o</span>
            <span className="splash-char">n</span>
            <span className="splash-char">t</span>
            <span className="splash-char">a</span>
            <span className="splash-char">c</span>
            <span className="splash-char">t</span>
            <span className="splash-char">&nbsp;</span>
            <span className="splash-char">U</span>
            <span className="splash-char">s</span>
          </div>
          <p className="splash-tagline">Initializing Contact Environment...</p>
        </div>
      </div>


      {/* Main Content */}
      <div className="pt-32 pb-20 min-h-screen flex flex-col justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 fade-in-up">
            <p className="text-[#D32F2F] font-bold tracking-wide uppercase text-sm mb-3">Get in Touch</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1F1F1F] mb-6">How can we help you?</h1>
            <p className="text-gray-600 text-lg">Select your role below so we can direct your inquiry to the right team.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12 fade-in-up">
            <div className={`type-card bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-sm relative group ${selectedType === 'restaurant' ? 'selected' : ''}`} onClick={() => selectType('restaurant')}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#D32F2F] text-xl group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <div className="check-circle w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center transition-colors">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Partner</h3>
              <p className="text-gray-500 text-sm">I own or manage a restaurant and want to join MyQuro.</p>
            </div>

            <div className={`type-card bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-sm relative group ${selectedType === 'customer' ? 'selected' : ''}`} onClick={() => selectType('customer')}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="check-circle w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center transition-colors">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer</h3>
              <p className="text-gray-500 text-sm">I have a general question, feedback, or support issue.</p>
            </div>
          </div>

          <div ref={formContainerRef} className={`max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden ${selectedType ? 'visible-form' : 'hidden-form'}`}>
            {selectedType === 'restaurant' && (
              <form className="p-8 md:p-12" onSubmit={handleRestaurantSubmit}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Partner Application</h2>
                  <p className="text-gray-500 text-sm mt-1">Fill in your restaurant details below.</p>
                </div>

                <div className="input-group">
                  <input type="text" className="form-input" placeholder="Restaurant Name" name="restaurant" value={restaurantForm.restaurant} onChange={handleRestaurantChange} onBlur={(e) => validateField('restaurant', e.target.value, true)} required />
                  <UtensilsCrossed className="input-icon w-5 h-5" />
                </div>
                <div className={`error-message ${errors.restaurant ? 'visible' : ''}`}>{errors.restaurant}</div>

                <div className="input-group">
                  <input type="text" className="form-input" placeholder="Owner / User Full Name" name="owner" value={restaurantForm.owner} onChange={handleRestaurantChange} onBlur={(e) => validateField('owner', e.target.value, true)} required />
                  <User className="input-icon w-5 h-5" />
                </div>
                <div className={`error-message ${errors.owner ? 'visible' : ''}`}>{errors.owner}</div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="input-group">
                    <input type="tel" className="form-input" placeholder="Contact Number" name="phone" value={restaurantForm.phone} onChange={handleRestaurantChange} onBlur={(e) => validateField('phone', e.target.value, true)} pattern="^[6-9]\d{9}$" title="Enter a valid 10-digit Indian mobile number starting with 6-9" required />
                    <Phone className="input-icon w-5 h-5" />
                  </div>
                  <div className={`error-message ${errors.phone ? 'visible' : ''}`}>{errors.phone}</div>
                  <div className="input-group">
                    <input type="email" className="form-input" placeholder="Email Address" name="email" value={restaurantForm.email} onChange={handleRestaurantChange} onBlur={(e) => validateField('email', e.target.value, true)} required />
                    <Mail className="input-icon w-5 h-5" />
                  </div>
                  <div className={`error-message ${errors.email ? 'visible' : ''}`}>{errors.email}</div>
                </div>

                <div className="input-group">
                  <input type="url" className="form-input" placeholder="Social Media Link (Optional)" name="social" value={restaurantForm.social} onChange={handleRestaurantChange} onBlur={(e) => validateField('social', e.target.value, true)} />
                  {getSocialIcon(getSocialMediaType(restaurantForm.social))}
                </div>
                <div className={`error-message ${errors.social ? 'visible' : ''}`}>{errors.social}</div>

                <div className="flex items-center mb-4">
                  <input type="checkbox" id="hasWebsite" checked={hasWebsite} onChange={(e) => setHasWebsite(e.target.checked)} className="mr-2 w-4 h-4 text-[#D32F2F] bg-gray-100 border-gray-300 rounded focus:ring-[#D32F2F] focus:ring-2" />
                  <label htmlFor="hasWebsite" className="text-sm text-gray-600">Do you have a website?</label>
                </div>

                {hasWebsite && (
                  <>
                    <div className="input-group">
                      <input type="url" className="form-input" placeholder="Website URL" name="website" value={restaurantForm.website} onChange={handleWebsiteChange} onBlur={(e) => validateField('website', e.target.value, true)} />
                      <Globe className="input-icon w-5 h-5" />
                    </div>
                    <div className={`error-message ${errors.website ? 'visible' : ''}`}>{errors.website}</div>
                    {websiteInfo && <div className="text-sm text-gray-500 mt-1">{websiteInfo}</div>}
                    <button type="button" onClick={() => fetchWebsiteData(restaurantForm.website)} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mt-2 mb-4">Confirm Website</button>
                    {websitePreview && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {websitePreview.error ? (
                          <p className="text-red-600">{websitePreview.error}</p>
                        ) : (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200 shadow-lg">
                            <div className="flex items-start gap-4 mb-4">
                              {websitePreview.logo?.url ? <img src={websitePreview.logo.url} alt={websitePreview.publisher || 'Logo'} className="w-12 h-12 rounded-lg object-cover border border-gray-300" /> : <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center"><Globe className="w-6 h-6 text-gray-600" /></div>}
                              <div className="flex-1">
                                <h4 className="font-bold text-xl text-gray-900 mb-2">{websitePreview.title || 'No Title'}</h4>
                                <p className="text-gray-700 text-sm leading-relaxed">{websitePreview.description || 'No description available.'}</p>
                              </div>
                            </div>
                            {websitePreview.screenshot?.url && (
                              <div className="relative mb-4 group">
                                <img src={websitePreview.screenshot.url} alt="Website Screenshot" className="w-full h-64 object-cover rounded-lg cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-300" onClick={() => openLightbox(websitePreview.screenshot.url)} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="input-group">
                  <textarea className="form-input h-32 pt-4 textarea-message" placeholder="Tell us about your request..." name="message" value={restaurantForm.message} onChange={handleRestaurantChange} onBlur={(e) => validateField('message', e.target.value, true)} required></textarea>
                  <MessageSquare className="input-icon input-icon-message w-5 h-5" />
                </div>
                <div className={`error-message ${errors.message ? 'visible' : ''}`}>{errors.message}</div>

                <button type="submit" disabled={loading} className="w-full bg-[#D32F2F] text-white font-bold py-4 rounded-xl hover:bg-[#B71C1C] transition-all transform hover:-translate-y-1 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
                  <span>{loading ? 'Sending...' : 'Submit Application'}</span>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            )}

            {selectedType === 'customer' && (
              <form className="p-8 md:p-12" onSubmit={handleCustomerSubmit}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Customer Support</h2>
                  <p className="text-gray-500 text-sm mt-1">How can we help you today?</p>
                </div>

                <div className="input-group">
                  <input type="text" className="form-input" placeholder="Full Name" name="name" value={customerForm.name} onChange={handleCustomerChange} onBlur={(e) => validateField('name', e.target.value, false)} required />
                  <User className="input-icon w-5 h-5" />
                </div>
                <div className={`error-message ${errors.name ? 'visible' : ''}`}>{errors.name}</div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="input-group">
                    <input type="tel" className="form-input" placeholder="Contact Number" name="phone" value={customerForm.phone} onChange={handleCustomerChange} onBlur={(e) => validateField('phone', e.target.value, false)} pattern="^[6-9]\d{9}$" title="Enter a valid 10-digit Indian mobile number starting with 6-9" required />
                    <Phone className="input-icon w-5 h-5" />
                  </div>
                  <div className={`error-message ${errors.phone ? 'visible' : ''}`}>{errors.phone}</div>
                  <div className="input-group">
                    <input type="email" className="form-input" placeholder="Email Address" name="email" value={customerForm.email} onChange={handleCustomerChange} onBlur={(e) => validateField('email', e.target.value, false)} required />
                    <Mail className="input-icon w-5 h-5" />
                  </div>
                  <div className={`error-message ${errors.email ? 'visible' : ''}`}>{errors.email}</div>
                </div>

                <div className="input-group">
                  <textarea className="form-input h-32 pt-4 textarea-message" placeholder="Type your message or inquiry here..." name="message" value={customerForm.message} onChange={handleCustomerChange} onBlur={(e) => validateField('message', e.target.value, false)} required></textarea>
                  <MessageSquare className="input-icon input-icon-message w-5 h-5" />
                </div>
                <div className={`error-message ${errors.message ? 'visible' : ''}`}>{errors.message}</div>

                <button type="submit" disabled={loading} className="w-full bg-[#1F1F1F] text-white font-bold py-4 rounded-xl hover:bg-black transition-all transform hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2">
                  <span>{loading ? 'Sending...' : 'Submit Query'}</span>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-gray-50 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">&copy; 2025 MyQuro. All rights reserved.</p>
        </div>
        <div className="flex gap-2 container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <a href="/terms" className="absolute bottom-4 right-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">Terms of Service</a>
        <a href="/privacy" className="absolute bottom-4 right-34 text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy Policy</a>
        <a href="/contact" className="absolute bottom-4 right-58 text-sm text-gray-400 hover:text-gray-600 transition-colors">Contact Us</a>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[110] bg-black bg-opacity-75 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full p-4">
            <img src={lightboxImage} alt="Website Screenshot" className="max-w-full max-h-full object-contain" />
            <button onClick={closeLightbox} className="absolute top-2 right-2 text-white text-2xl hover:text-gray-300">&times;</button>
          </div>
        </div>
      )}
      <Toaster />
    </>
  );
}