"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useSession } from "../lib/session-context";
import { QrCode, Receipt, Menu, X, Building2, Clock } from "lucide-react";

// Hooks (Defined below or import from hooks folder)
import { useRestaurantRequest } from "../hooks/useRestaurantRequest";
import { useInvitations } from "../hooks/useInvitations";

// Sub-components
import MobileDrawer from "./navbar/MobileDrawer";
import UserMenu from "./navbar/UserMenu";
import RequestStatusModal from "./navbar/RequestStatusModal";
import InvitationModal from "./navbar/InvitationModal";
import NavLink from "./navbar/NavLink";
import Logo from "./Logo";

export default function Navbar() {
  const pathname = usePathname();

  // Prevent auth context usage during static generation
  // Use auth context directly - Component is wrapped in AuthProvider in LayoutContent -> ClientProviders
  // If this throws, it means the provider is missing, which is a critical error we want to catch during dev
  const auth = useAuth();
  const session = useSession();
  const user = auth.user;
  const isAuthenticated = auth.isAuthenticated;
  const activeSession = session.session;

  // State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);

  // Custom Hooks for Data Fetching
  const { requestData, loading: requestLoading, fetchRequestData } = useRestaurantRequest();
  const {
    invitationData,
    loading: inviteLoading,
    hasInvitations,
    fetchInvitations,
    acceptInvitation,
    rejectInvitation
  } = useInvitations(user?.id);

  const isActive = (path: string) => pathname === path;
  const userRole = user?.role;

  // Handlers
  const handleOpenRequestModal = () => {
    fetchRequestData();
    setRequestModalOpen(true);
  };

  const handleOpenInviteModal = () => {
    fetchInvitations();
    setInvitationModalOpen(true);
  };

  console.log('🔍 [Navbar] Render State:', {
    user: user,
    isAuthenticated: isAuthenticated,
    activeSession: activeSession,
    pathname: pathname
  });

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md border-b border-zinc-900 z-50 h-[64px] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">

            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2 group">
              <Logo size="md" className="transition-transform group-hover:scale-105" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Active Session Indicator */}
              {activeSession && (
                <div className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-fade-in">
                  <Receipt size={14} className="text-red-600" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                      Table {activeSession.tableNumber || '--'}
                    </span>
                  </div>
                  <Link
                    href="/my-session"
                    className="ml-1 bg-red-600 text-black text-[10px] font-black px-2 py-0.5 rounded-full hover:bg-red-700 transition"
                  >
                    View
                  </Link>
                </div>
              )}

              {/* Main Links */}
              <div className="flex items-center gap-1">
                <NavLink href="/home" active={isActive("/home")} icon="home">Home</NavLink>
                <NavLink href="/explore" active={isActive("/explore")} icon="compass">Explore</NavLink>
                {isAuthenticated && (
                  <>
                    <NavLink href="/my-reservations" active={isActive("/my-reservations")} icon="calendar">My Reservations</NavLink>
                    <NavLink href="/my-orders" active={isActive("/my-orders")} icon="receipt">My Orders</NavLink>
                  </>
                )}
              </div>

              {/* QR Scan Action */}
              <Link
                href="/qr"
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-full transition-all font-semibold text-sm hover:shadow-sm"
              >
                <QrCode size={18} />
                <span>Scan QR</span>
              </Link>

              {/* Invitations Badge */}
              {hasInvitations && (
                <button
                  onClick={handleOpenInviteModal}
                  className="relative p-2 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-600 rounded-full animate-pulse border border-white"></span>
                  <span className="text-sm font-medium">Invites</span>
                </button>
              )}

              {/* Restaurant Dropdown / Dashboard Link */}
              {isAuthenticated && userRole === 'restaurant' ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 text-black rounded-full text-sm font-bold hover:shadow-md hover:scale-105 transition-all"
                >
                  My Restaurant
                </Link>
              ) : isAuthenticated ? (
                <RestaurantActionsDropdown
                  onRequestStatus={handleOpenRequestModal}
                />
              ) : null}

              {/* User Profile / Auth */}
              <div className="pl-4 border-l border-zinc-800">
                <UserMenu user={user} />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* --- Overlay Components --- */}

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        userRole={userRole}
        activeSession={activeSession}
        isActive={isActive}
        hasInvitations={hasInvitations}
        onOpenInvites={handleOpenInviteModal}
        onOpenRequestStatus={handleOpenRequestModal}
      />

      {requestModalOpen && (
        <RequestStatusModal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          data={requestData}
          loading={requestLoading}
        />
      )}

      {invitationModalOpen && (
        <InvitationModal
          isOpen={invitationModalOpen}
          onClose={() => setInvitationModalOpen(false)}
          invitations={invitationData}
          loading={inviteLoading}
          onAccept={acceptInvitation}
          onReject={rejectInvitation}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS (Can be moved to separate files)
// ----------------------------------------------------------------------

function RestaurantActionsDropdown({ onRequestStatus }: { onRequestStatus: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-[#d5b263] transition-colors"
      >
        Partner
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
          <Link
            href="/apply-for-restro"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] transition-colors rounded-lg mx-1.5 font-medium"
          >
            <Building2 className="w-4 h-4" />
            Apply for Restaurant
          </Link>
          <button
            onClick={() => {
              onRequestStatus();
              setIsOpen(false);
            }}
            className="w-[calc(100%-12px)] flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] transition-colors rounded-lg mx-1.5 font-medium text-left"
          >
            <Clock className="w-4 h-4" />
            Application Status
          </button>
        </div>
      )}
    </div>
  );
}