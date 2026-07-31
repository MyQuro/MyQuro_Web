"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { gsap } from "gsap";
import { showSuccess, showError } from '@/lib/toast';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';
import { Label } from "@/components/ui/label";
import { AuthGuard } from "@/components/AuthGuard";
import Logo from "@/components/Logo";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/home';

  // Animate card on mount
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    }
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSignUp = async () => {
    if (!name.trim()) {
      showError("Please enter your name.");
      return;
    }

    if (!validateEmail(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      showError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup(name, email, password);

      if (result.success) {
        showSuccess("Account created successfully!");
        // Redirect to the intended URL
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1000);
      } else {
        showError(result.error || "Signup failed");
      }
    } catch (err) {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      showError("Google sign in failed");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSignUp();
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d5b263]/8 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#d5b263]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d5b263]/3 rounded-full blur-[160px]" />
      </div>

      <div
        ref={cardRef}
        className="w-full max-w-md relative z-10 my-6"
      >
        {/* Glass card */}
        <div className="bg-[#0c0c0e]/90 backdrop-blur-xl rounded-3xl border border-[#d5b263]/15 shadow-[0_0_80px_rgba(213,178,99,0.06)] overflow-hidden">
          {/* Top accent bar */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#d5b263]/60 to-transparent" />

          <div className="p-7 sm:p-9">
            {/* Logo mark */}
            <div className="flex justify-center mb-7">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-[#d5b263]/10 blur-xl" />
                <Logo size="lg" className="relative z-10" />
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-[28px] font-bold text-white mb-2 tracking-tight">
                Create Account
              </h1>
              <p className="text-[#8e8e93] text-sm sm:text-[15px]">
                Sign up to get started with MyQuro
              </p>
            </div>

            {/* Name Input */}
            <div className="mb-4">
              <Label htmlFor="name" className="block text-[#d1d1d6] text-xs font-semibold mb-2 uppercase tracking-wider">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                aria-required="true"
                className="w-full px-4 py-3 bg-[#1c1c1e] border border-[#2c2c2e] text-white placeholder:text-[#636366] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d5b263]/50 focus:border-[#d5b263]/50 transition-all min-h-[50px] text-[15px]"
              />
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <Label htmlFor="email" className="block text-[#d1d1d6] text-xs font-semibold mb-2 uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                aria-required="true"
                className="w-full px-4 py-3 bg-[#1c1c1e] border border-[#2c2c2e] text-white placeholder:text-[#636366] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d5b263]/50 focus:border-[#d5b263]/50 transition-all min-h-[50px] text-[15px]"
              />
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <Label htmlFor="password" className="block text-[#d1d1d6] text-xs font-semibold mb-2 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  aria-required="true"
                  className="w-full px-4 py-3 pr-12 bg-[#1c1c1e] border border-[#2c2c2e] text-white placeholder:text-[#636366] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d5b263]/50 focus:border-[#d5b263]/50 transition-all min-h-[50px] text-[15px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#636366] hover:text-[#d5b263] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign Up Button */}
            <Button
              onClick={handleSignUp}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#d5b263] to-[#bfa052] hover:from-[#e0bf70] hover:to-[#d5b263] text-black font-bold py-3 px-6 rounded-xl transition-all mb-4 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(213,178,99,0.3)] hover:shadow-[0_4px_32px_rgba(213,178,99,0.45)] min-h-[52px] text-[15px] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : "Sign Up"}
            </Button>

            {/* Divider */}
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-[#2c2c2e]"></div>
              <span className="px-4 text-[#636366] text-xs font-medium uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-[#2c2c2e]"></div>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-[#2c2c2e] hover:border-[#3c3c3e] text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3 min-h-[52px] text-[14px] disabled:opacity-40 active:scale-[0.98]"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Continue with Google
            </button>

            {/* Sign In Link */}
            <p className="text-center text-[#636366] text-sm mt-6">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-[#d5b263] font-semibold hover:text-[#e0bf70] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>

          {/* Bottom accent bar */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#d5b263]/30 to-transparent" />
        </div>

        {/* Subtle card glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#d5b263]/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard requireAuth={false}>
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#d5b263]/30 border-t-[#d5b263] rounded-full animate-spin" /></div>}>
        <SignUpForm />
      </Suspense>
    </AuthGuard>
  );
}
