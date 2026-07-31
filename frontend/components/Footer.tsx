"use client";

import Image from "next/image";
import Link from "next/link";
import React, { JSX } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import Logo from "./Logo";

export default function Footer(): JSX.Element {
  const router = useRouter();

  const handleResetAccount = () => {
    const confirmed = window.confirm(
      "🚨 COMPLETE SYSTEM RESET 🚨\n\n" +
      "This will NUKE everything from orbit:\n\n" +
      "• 🔥 ALL COOKIES (every single one)\n" +
      "• 💥 ALL LOCAL STORAGE DATA\n" +
      "• ⚡ ALL SESSION STORAGE DATA\n" +
      "• 🗑️ ALL BROWSER CACHE\n" +
      "• 🔒 ALL AUTHENTICATION DATA\n" +
      "• 📱 ALL APP DATA & SESSIONS\n" +
      "• 🌐 ALL SITE DATA & PERMISSIONS\n\n" +
      "You'll be signed out and redirected to home.\n\n" +
      "⚠️ THIS CANNOT BE UNDONE! ⚠️\n\n" +
      "Type 'NUKE' to confirm:"
    );

    if (!confirmed) return;

    const nukeCode = prompt("Type 'NUKE' to confirm complete data destruction:");
    if (nukeCode !== "NUKE") {
      alert("Reset cancelled. You must type 'NUKE' exactly.");
      return;
    }

    // Nuclear option - clear EVERYTHING with maximum aggression
    const nuclearClear = () => {
      try {
        // Clear all cookies with every possible combination
        const clearAllCookies = () => {
          const cookies = document.cookie.split(";");
          const paths = ["/", "/dashboard", "/api", "/auth", "/order", "/restro", "/session", "/admin"];
          const domains = ["", window.location.hostname, `.${window.location.hostname}`];
          const hostname = window.location.hostname;
          const domainParts = hostname.split('.');

          // Clear existing cookies
          cookies.forEach(cookie => {
            const cookieName = cookie.split("=")[0].trim();
            paths.forEach(path => {
              domains.forEach(domain => {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain};`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; secure;`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; samesite=strict;`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; samesite=lax;`;
                document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain};`;
              });
            });
          });

          // Clear common cookie names aggressively
          const commonCookies = [
            "session-token", "auth-token", "refresh-token", "access-token",
            "better-auth.session-token", "better-auth.callback-url",
            "next-auth.session-token", "next-auth.callback-url", "next-auth.csrf-token",
            "__Secure-next-auth.session-token", "__Secure-next-auth.callback-url",
            "__Host-next-auth.csrf-token", "activeSession", "sessionId", "tableSession",
            "restaurantId", "userRole", "userId", "cart", "cartItems", "orderData",
            "JSESSIONID", "PHPSESSID", "ASP.NET_SessionId", "_ga", "_gid", "_gat",
            "__utma", "__utmb", "__utmc", "__utmz", "_fbp", "_fbc", "fbclid",
            "gclid", "rememberMe", "loginToken", "csrfToken", "xsrf-token", "_csrf", "nonce",
            "app_version", "theme", "preferences", "settings"
          ];

          commonCookies.forEach(cookieName => {
            paths.forEach(path => {
              domains.forEach(domain => {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain};`;
                document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain};`;
              });
            });
          });

          // Clear all subdomain cookies
          for (let i = domainParts.length - 1; i >= 0; i--) {
            const domain = domainParts.slice(i).join('.');
            document.cookie = `dummy=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain};`;
            document.cookie = `dummy=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain};`;
          }
        };

        // Execute cookie annihilation
        clearAllCookies();

        // Clear all storage with extreme prejudice
        localStorage.clear();
        sessionStorage.clear();

        // Clear any IndexedDB databases (async but we'll try)
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then(databases => {
            databases.forEach(db => {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            });
          }).catch(() => { });
        }

        // Clear cache storage if available
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          }).catch(() => { });
        }

        // Clear service worker registrations
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              registration.unregister();
            });
          }).catch(() => { });
        }

        // Clear all permissions
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'notifications' }).then(result => {
            if (result.state === 'granted') {
              // Can't revoke, but we tried
            }
          }).catch(() => { });
        }

        // Clear WebSQL databases (legacy but still exists)
        // This is more of a legacy thing but let's be thorough
        const webSQLDBs = ['myquro_db', 'restaurant_db', 'session_db', 'auth_db'];
        webSQLDBs.forEach(dbName => {
          try {
            // Type assertion for WebSQL API
            const openDatabase = (window as any).openDatabase;
            if (openDatabase) {
              const db = openDatabase(dbName, '1.0', 'MyQuro Database', 2 * 1024 * 1024);
              if (db) {
                db.transaction((tx: any) => {
                  tx.executeSql('DROP TABLE IF EXISTS __WebKitDatabaseInfoTable__');
                });
              }
            }
          } catch (e) { }
        });

        console.log("🔥 NUCLEAR RESET COMPLETE - All data obliterated");

      } catch (error) {
        console.error("Reset error:", error);
      }
    };

    // Execute the nuclear reset
    nuclearClear();

    // Force redirect and reload
    router.push('/');

    // Multiple reload attempts to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 100);

    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  return (
    <footer className="footer-gradient py-12 md:py-16 border-t border-white/10 relative overflow-hidden font-sans">
      <div className="footer-glow" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-10 lg:gap-8 items-start mb-12">

          {/* Brand Col */}
          <div className="md:col-span-4 text-center sm:text-left flex flex-col items-center sm:items-start">
            <Logo size="md" className="mb-4" />
            <p className="text-[#94A3B8] mb-6 leading-relaxed max-w-sm text-sm p-0 m-0 text-left sm:text-left text-center">
              Empowering restaurants worldwide with innovative technology solutions for better customer experiences and business growth.
            </p>
            <div className="flex gap-4">
              <a href="https://www.linkedin.com" aria-label="LinkedIn" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-white hover:-translate-y-1 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zM8 8h4.8v2.2h.1c.7-1.2 2.4-2.2 4.9-2.2 5.2 0 6.2 3.4 6.2 7.8V24h-5V15.6c0-2.1 0-4.8-3-4.8s-3.5 2.3-3.5 4.6V24H8V8z" /></svg>
              </a>
              <a href="https://www.instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-white hover:-translate-y-1 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm12 2c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3h12zM12 7.5A4.5 4.5 0 1 0 12 16.5 4.5 4.5 0 0 0 12 7.5zm6-2.2a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z" /></svg>
              </a>
              <a href="https://x.com" aria-label="X / Twitter" target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-white hover:-translate-y-1 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.6c-.9.4-1.8.6-2.8.8.9-.6 1.6-1.6 2-2.7-.8.5-1.8.9-2.8 1.1-.8-.9-2-1.5-3.2-1.5-2.5 0-4.5 2-4.5 4.4 0 .3 0 .6.1.9C7.7 8.1 4.1 6.1 1.7 3.1c-.4.7-.6 1.6-.6 2.5 0 1.5.8 2.8 1.9 3.6-.7 0-1.4-.2-2-.5v.1c0 2.2 1.5 4.1 3.5 4.5-.4.1-.9.2-1.3.2-.3 0-.6 0-.9-.1.6 1.9 2.4 3.3 4.6 3.3-1.6 1.3-3.6 2.1-5.8 2.1-.4 0-.8 0-1.2-.1C2.1 20.1 5 21 8.2 21c9.8 0 15.2-8.5 15.2-15.9v-.7c1.1-.8 2-1.6 2.7-2.6z" /></svg>
              </a>
            </div>
          </div>

          {/* Quick Links Col */}
          <div className="md:col-span-2 text-center sm:text-left">
            <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/home" className="text-[#94A3B8] hover:text-white text-sm transition-colors">Home</Link></li>
              <li><Link href="/explore" className="text-[#94A3B8] hover:text-white text-sm transition-colors">Explore</Link></li>
              <li><Link href="/order" className="text-[#94A3B8] hover:text-white text-sm transition-colors">Order</Link></li>
              <li><Link href="/reservation" className="text-[#94A3B8] hover:text-white text-sm transition-colors">Reservation</Link></li>
            </ul>
          </div>

          {/* Contact Us Col */}
          <div className="md:col-span-3 text-center sm:text-left flex flex-col items-center sm:items-start">
            <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start">
                <Mail className="w-5 h-5 text-[#94A3B8] shrink-0" />
                <a href="mailto:info.myquro@gmail.com" className="text-[#94A3B8] text-sm hover:text-white transition-colors">info.myquro@gmail.com</a>
              </div>
              <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start">
                <Phone className="w-5 h-5 text-[#94A3B8] shrink-0" />
                <a href="tel:+919472710075" className="text-[#94A3B8] text-sm hover:text-white transition-colors">+91 94727 10075</a>
              </div>
              <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start text-left">
                <MapPin className="w-5 h-5 text-[#94A3B8] shrink-0 mt-0.5" />
                <p className="text-[#94A3B8] text-sm leading-relaxed max-w-[180px]">Bokaro, Jharkhand, <br /> India</p>
              </div>
            </div>
          </div>

          {/* Newsletter Col */}
          <div className="md:col-span-3 text-center sm:text-left">
            <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Newsletter</h3>
            <p className="text-[#94A3B8] text-xs leading-relaxed mb-4 max-w-[250px] mx-auto sm:mx-0">
              Subscribe to our newsletter for daily updates and exclusive offers.
            </p>
            <div className="flex flex-col xl:flex-row gap-2 max-w-xs mx-auto sm:mx-0 w-full">
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-[#1C1C1E] border border-white/10 text-white placeholder-[#8E8E93] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#d5b263] focus:ring-1 focus:ring-[#d5b263] transition-all"
              />
              <button className="bg-[#d5b263] hover:bg-[#bfa052] text-black px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shrink-0 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4">
          <p className="text-[#64748B] text-xs text-center md:text-left font-medium">&copy; 2025 MyQuro. All rights reserved.</p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[#64748B] text-xs font-medium">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Cookie Policy</Link>
            <button
              onClick={handleResetAccount}
              className="px-3 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-200 hover:text-white text-[10px] font-bold rounded transition-colors uppercase border border-red-500/20 shadow-sm ml-2 self-end hidden md:block"
              title="🚨 NUCLEAR RESET - Clear ALL data and sign out"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-gradient {
          background: linear-gradient(180deg, #000000 0%, #0c0c0e 100%);
        }
        .footer-glow {
          position: absolute;
          inset: top auto auto left;
          width: 800px;
          height: 800px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(213, 178, 99, 0.03) 0%, transparent 60%);
          pointer-events: none;
        }
      `}</style>
    </footer>
  );
}