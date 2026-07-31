"use client";

import React, { useEffect, useState, useRef, JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { gsap } from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from '@/lib/toast';
import { ClipboardList, Calendar, Building2, Lock } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Local editable fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // GSAP animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    }
  }, [loading]);

  // Validation functions
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return phone === "" || re.test(phone.replace(/[\s\-\(\)]/g, ""));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Name is required";
    if (phone && !validatePhone(phone)) errors.phone = "Invalid phone number";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Load profile: prefer DB (/api/users/me) but seed immediately from client session for instant UI.
  useEffect(() => {
    // Seed from client session if available (fast)
    if (session?.user) {
      setProfile((p: any) => ({ ...(p || {}), ...session.user }));
    }

    async function loadProfileFromDB() {
      setLoading(true);
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/profile/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          console.log("Fetched profile from DB:", res);
          // Merge DB data over session data (DB is authoritative)
          setProfile((prev: any) => ({ ...(prev || {}), ...data.profile }));
        } else {
          // fallback to session user if available
          if (session?.user) setProfile(session.user);
        }
      } catch (err: any) {
        // network error -> keep session user if present
        if (!profile && session?.user) setProfile(session.user);
      } finally {
        setLoading(false);
      }
    }

    loadProfileFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]); // re-run when session user changes (login/logout)

  // Populate editable fields when profile updates
  useEffect(() => {
    if (!profile) return;
    setName(profile.username ?? "");
    setEmail(session?.user?.email ?? "");
    setPhone(profile.phoneNumber ?? "");
    setLocation(profile.location ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.image ?? profile.avatar ?? null);
  }, [profile, session?.user?.email]);

  const handleAvatarPick = async (file?: File) => {
    if (!file) return;
    setSaving(true);

    try {
      // Server endpoint expected: POST /api/users/me/avatar -> returns { avatarUrl }
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatarUrl ?? data.url ?? null);
        // refresh profile from DB
        const p = await fetch(`${BACKEND_URL}/api/profile/me`, {
          credentials: "include",
        });
        if (p.ok) {
          const data = await p.json();
          setProfile((prev) => ({ ...prev, ...data.profile }));
        }
        showSuccess("Avatar updated successfully!");
      } else {
        // fallback to preview only
        const reader = new FileReader();
        reader.onload = () => setAvatarUrl(String(reader.result));
        reader.readAsDataURL(file);
        showSuccess("Avatar preview updated!");
      }
    } catch (err) {
      showError("Avatar upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    handleAvatarPick(f);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError("Please fix the errors below");
      return;
    }

    setSaving(true);

    const payload: Record<string, any> = {
      userId: session?.user?.id,
      username: name.trim() || undefined,
      phoneNumber: phone.trim() || undefined,
      location: location.trim() || undefined,
      bio: bio.trim() || undefined,
    };

    try {
      // Update DB profile
      const res = await fetch(`${BACKEND_URL}/api/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || "Failed to save profile. Endpoint may not be implemented.");
      }

      // Fetch updated profile
      const profileRes = await fetch(`${BACKEND_URL}/api/profile/me`, {
        credentials: "include",
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile((prev) => ({ ...prev, ...data.profile }));
      }

      setEditMode(false);
      showSuccess("Profile updated successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
       await authClient.signOut();
       localStorage.clear(); // Clear all localStorage on sign out
       // simple full reload to reset state / cookies
       window.location.href = "/home";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d5b263] mx-auto mb-4"></div>
          <p className="text-zinc-500 font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <Card className="w-full max-w-md bg-[#0c0c0e] border border-zinc-900/40 text-white">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold tracking-tight mb-4">Welcome to MyQuro</h2>
            <p className="text-zinc-500 mb-6 font-medium">Please sign in to view your profile</p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full bg-[#d5b263] text-black font-bold hover:bg-[#bfa052] rounded-xl py-3">
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button variant="outline" asChild className="w-full bg-transparent border-zinc-800 hover:bg-zinc-900 hover:text-white rounded-xl py-3">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card ref={cardRef} className="bg-[#0c0c0e] border border-zinc-900/40 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#d5b263]/10 border border-[#d5b263]/20 flex items-center justify-center shadow-lg relative">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="avatar"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-2xl sm:text-4xl font-black text-[#d5b263]">
                      {name ? name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={saving}
                    className="text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl"
                  >
                    {saving ? "Uploading..." : "Change Photo"}
                  </Button>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                  {profile?.username ?? "Unnamed User"}
                </h1>
                <p className="text-zinc-500 font-medium mb-4">{email}</p>
                {profile?.bio && (
                  <p className="text-zinc-400 text-sm max-w-md font-medium">{profile.bio}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setEditMode(!editMode)}
                  className={`w-full sm:w-auto font-bold rounded-xl py-2.5 transition-all ${
                    editMode
                      ? "bg-transparent border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                      : "bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] hover:bg-[#d5b263]/20"
                  }`}
                >
                  {editMode ? "Cancel" : "Edit Profile"}
                </Button>
                <Button
                  onClick={handleSignOut}
                  className="w-full sm:w-auto bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold rounded-xl py-2.5"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Card */}
        <Card className="bg-[#0c0c0e] border border-zinc-900/40 shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight text-white">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-zinc-400">Username *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editMode}
                  placeholder="Enter your username"
                  className={`bg-[#050506] border rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 text-white placeholder:text-zinc-650 transition-all font-medium py-3 px-4 ${
                    fieldErrors.name ? "border-red-500" : "border-zinc-800/60"
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-500 font-bold">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-zinc-400">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  placeholder="Your email address"
                  className="bg-[#050506] border border-zinc-800/40 rounded-xl text-zinc-500 font-medium py-3 px-4"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-bold text-zinc-400">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!editMode}
                  placeholder="Enter your phone number"
                  className="bg-[#050506] border border-zinc-800/60 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 text-white placeholder:text-zinc-650 transition-all font-medium py-3 px-4"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-bold text-[#a1a1aa]">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!editMode}
                  placeholder="Enter your city or location"
                  className="bg-[#050506] border border-zinc-800/60 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 text-white placeholder:text-zinc-650 transition-all font-medium py-3 px-4"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-bold text-zinc-400">About Me</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!editMode}
                placeholder="Tell us about yourself..."
                className="w-full min-h-[100px] px-4 py-3 bg-[#050506] border border-zinc-800/60 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 outline-none transition-all font-medium text-white placeholder:text-zinc-650 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {/* Save Button */}
            {editMode && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="min-w-[140px] bg-[#d5b263] text-black font-black hover:bg-[#bfa052] rounded-xl py-3 shadow-md"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-[#0c0c0e] border border-zinc-900/40 shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" asChild className="h-auto p-5 flex flex-col items-center space-y-3 bg-[#121215]/80 hover:bg-[#16161a] border border-zinc-800/40 hover:border-[#d5b263]/25 text-zinc-400 hover:text-white rounded-2xl transition-all">
                <Link href="/my-orders">
                  <ClipboardList className="w-8 h-8 text-[#d5b263]" strokeWidth={2} />
                  <span className="font-bold tracking-wide">My Orders</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto p-5 flex flex-col items-center space-y-3 bg-[#121215]/80 hover:bg-[#16161a] border border-zinc-800/40 hover:border-[#d5b263]/25 text-zinc-400 hover:text-white rounded-2xl transition-all">
                <Link href="/my-reservations">
                  <Calendar className="w-8 h-8 text-[#d5b263]" strokeWidth={2} />
                  <span className="font-bold tracking-wide">Reservations</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto p-5 flex flex-col items-center space-y-3 bg-[#121215]/80 hover:bg-[#16161a] border border-zinc-800/40 hover:border-[#d5b263]/25 text-zinc-400 hover:text-white rounded-2xl transition-all">
                <Link href="/apply-for-restro">
                  <Building2 className="w-8 h-8 text-[#d5b263]" strokeWidth={2} />
                  <span className="font-bold tracking-wide">Apply as Restaurant</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto p-5 flex flex-col items-center space-y-3 bg-[#121215]/80 hover:bg-[#16161a] border border-zinc-800/40 hover:border-[#d5b263]/25 text-zinc-400 hover:text-white rounded-2xl transition-all">
                <Link href="/change-password">
                  <Lock className="w-8 h-8 text-[#d5b263]" strokeWidth={2} />
                  <span className="font-bold tracking-wide">Change Password</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          aria-label="Upload avatar"
        />
      </div>
    </div>
  );
}