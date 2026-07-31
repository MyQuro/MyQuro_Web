"use client";
import React, { JSX, useState } from "react";
import Image from "next/image";
import Footer from "../../components/Footer";
import Link from "next/link";

type Notifications = {
  orderUpdates: boolean;
  reservations: boolean;
  promotions: boolean;
  newsletter?: boolean;
};

type SettingsState = {
  email: Notifications;
  sms: Notifications;
  push: {
    orderUpdates: boolean;
    reservations: boolean;
    promotions: boolean;
  };
  privacy: {
    showProfile: boolean;
    showReviews: boolean;
    showOrderHistory: boolean;
  };
};

const defaultSettings: SettingsState = {
  email: {
    orderUpdates: true,
    reservations: true,
    promotions: false,
    newsletter: true,
  },
  sms: {
    orderUpdates: false,
    reservations: false,
    promotions: false,
  },
  push: {
    orderUpdates: true,
    reservations: true,
    promotions: false,
  },
  privacy: {
    showProfile: false,
    showReviews: true,
    showOrderHistory: false,
  },
};

export default function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function toggle(path: string) {
    setSettings((prev) => {
      const out = JSON.parse(JSON.stringify(prev)) as SettingsState;
      const keys = path.split(".");
      let cur: any = out;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = !cur[keys[keys.length - 1]];
      return out;
    });
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setShowDeleteModal(true);
  }

  async function confirmDeleteAccount() {
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      setShowDeleteModal(false);
    } catch {}
  }

  return (
    <>
      <main className="min-h-screen bg-black relative bg-hexagons text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 pb-24">
          <h1 className="text-3xl font-black text-white tracking-tight mb-8" style={{ fontFamily: "Poppins, sans-serif" }}>
            Settings
          </h1>

          {/* Notifications + channels card */}
          <section className="card-notifications bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 mb-6 overflow-hidden">
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0" aria-hidden>
                  {/* mingcute:notification-line style icon */}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z" fill="#d5b263"/>
                    <path d="M18 16v-5c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-1.7 1.7A1 1 0 0 0 5 20h14a1 1 0 0 0 .7-1.7L18 16z" stroke="#d5b263" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1 font-medium">Manage how you receive alerts — email, SMS or push.</p>
                </div>
              </div>

              {/* Email section */}
              <div className="channel-block border-t border-zinc-900/60 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xl" aria-hidden>
                      {/* mail icon */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 8.5v7A2.5 2.5 0 0 0 5.5 18h13A2.5 2.5 0 0 0 21 15.5v-7" stroke="#d5b263" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 7l-9 6-9-6" stroke="#d5b263" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Email Notifications</h3>
                      <p className="text-sm text-zinc-500 font-medium">Delivered to your inbox</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="row setting-row">
                    <span className="setting-text">Order updates</span>
                    <input type="checkbox" checked={settings.email.orderUpdates} onChange={() => toggle("email.orderUpdates")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Reservation confirmations</span>
                    <input type="checkbox" checked={settings.email.reservations} onChange={() => toggle("email.reservations")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Promotions and offers</span>
                    <input type="checkbox" checked={settings.email.promotions} onChange={() => toggle("email.promotions")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Newsletter</span>
                    <input type="checkbox" checked={!!settings.email.newsletter} onChange={() => toggle("email.newsletter")} />
                  </label>
                </div>
              </div>

              {/* SMS section */}
              <div className="channel-block border-t border-zinc-900/60 pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xl" aria-hidden>
                      {/* sms / chat icon */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H8l-5 3V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9z" stroke="#d5b263" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>SMS Notifications</h3>
                      <p className="text-sm text-zinc-500 font-medium">Short text messages to your phone</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="row setting-row">
                    <span className="setting-text">Order updates</span>
                    <input type="checkbox" checked={settings.sms.orderUpdates} onChange={() => toggle("sms.orderUpdates")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Reservation confirmations</span>
                    <input type="checkbox" checked={settings.sms.reservations} onChange={() => toggle("sms.reservations")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Promotions and offers</span>
                    <input type="checkbox" checked={settings.sms.promotions} onChange={() => toggle("sms.promotions")} />
                  </label>
                </div>
              </div>

              {/* Push section */}
              <div className="channel-block border-t border-zinc-900/60 pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xl" aria-hidden>
                      {/* push / bell icon */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z" fill="#d5b263"/><path d="M18 16v-5c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-1.7 1.7A1 1 0 0 0 5 20h14a1 1 0 0 0 .7-1.7L18 16z" stroke="#d5b263" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Push Notifications</h3>
                      <p className="text-sm text-zinc-500 font-medium">App push notifications (instant)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="row setting-row">
                    <span className="setting-text">Order status changes</span>
                    <input type="checkbox" checked={settings.push.orderUpdates} onChange={() => toggle("push.orderUpdates")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Reservation updates</span>
                    <input type="checkbox" checked={settings.push.reservations} onChange={() => toggle("push.reservations")} />
                  </label>

                  <label className="row setting-row">
                    <span className="setting-text">Special offers</span>
                    <input type="checkbox" checked={settings.push.promotions} onChange={() => toggle("push.promotions")} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy card (separate card) */}
          <section className="card-privacy bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 mb-6 overflow-hidden">
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0" aria-hidden>
                  {/* lock icon */}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="9" rx="2" stroke="#d5b263" strokeWidth="1.4" fill="none"/><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#d5b263" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Privacy Settings
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1 font-medium">Control what information is visible to others.</p>
                </div>
              </div>              <div className="space-y-4 mt-2">
                <label className="privacy-row flex items-center justify-between">
                  <div>
                    <div className="privacy-title font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Show profile publicly</div>
                    <div className="privacy-sub text-sm text-zinc-500 font-medium">Others can see your profile information</div>
                  </div>
                  <input type="checkbox" checked={settings.privacy.showProfile} onChange={() => toggle("privacy.showProfile")} />
                </label>

                <label className="privacy-row flex items-center justify-between">
                  <div>
                    <div className="privacy-title font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Show reviews</div>
                    <div className="privacy-sub text-sm text-zinc-500 font-medium">Display your reviews publicly</div>
                  </div>
                  <input type="checkbox" checked={settings.privacy.showReviews} onChange={() => toggle("privacy.showReviews")} />
                </label>

                <label className="privacy-row flex items-center justify-between">
                  <div>
                    <div className="privacy-title font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Show order history</div>
                    <div className="privacy-sub text-sm text-zinc-500 font-medium">Make your order history visible</div>
                  </div>
                  <input type="checkbox" checked={settings.privacy.showOrderHistory} onChange={() => toggle("privacy.showOrderHistory")} />
                </label>
              </div>
            </div>
          </section>          {/* Action buttons */}
          <div className="space-y-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full save-btn flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#d5b263] hover:bg-[#bfa052] text-black font-black transition-all shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l7 7v9a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>

            <div className="mb-4 mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm font-medium text-amber-300">
                  <span className="font-bold block text-white mb-1">Permanent Account Deletion</span>
                  Warning: Deleting your account is permanent and cannot be undone. All your data will be lost.
                </div>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="w-full mt-4 delete-btn flex items-center justify-center gap-2 py-3.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold rounded-2xl transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Save Button */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0c0c0e]/95 border-t border-zinc-900/60 p-4 shadow-2xl z-50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto md:px-8 py-3 rounded-xl bg-[#d5b263] hover:bg-[#bfa052] text-black font-black flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l7 7v9a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-[#0c0c0e] rounded-[2rem] border border-zinc-900 p-8 max-w-md w-full mx-4 shadow-2xl text-white">
            <div className="text-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 920.30414 515.08657" className="mx-auto mb-4 opacity-80">
                <path d="M333.52692,705.58229h-140.6s-2.85-41.8,14.012-42.275,14.962,18.525,36.1-7.6,46.787-24.7,50.112-9.262-6.412,27.787,11.4,23.987S348.01392,676.60726,333.52692,705.58229Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
                <path d="M260.85394,705.5923l-.475-.019c1.107-27.52,6.87-45.2,11.511-55.19,5.038-10.844,9.893-15.234,9.942-15.277l.316.355c-.048.043-4.846,4.389-9.844,15.16C267.68893,660.56526,261.95694,678.1753,260.85394,705.5923Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <path d="M311.73993,705.6483l-.456-.133a73.682,73.682,0,0,1,18.551-30.863l.319.352A73.183,73.183,0,0,0,311.73993,705.6483Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <path d="M215.07292,705.61531l-.471-.065a51.73206,51.73206,0,0,0-4.653-30.238,41.63309,41.63309,0,0,0-7.34-10.71606l.329-.343a42.15523,42.15523,0,0,1,7.441,10.848A52.20594,52.20594,0,0,1,215.07292,705.61531Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <path d="M352.60792,706.21727h-174.845l-.04-.592c-.1-1.473-2.331-36.228,8.93-48.629a12.33392,12.33392,0,0,1,9.013-4.325c7.34-.209,11.953,2.541,15.674,4.747,7.013,4.16,11.645,6.909,28.49-13.91,18.247-22.553,37.936-27.406,49.254-24.708,7.313,1.744,12.353,6.671,13.828,13.52,1.4,6.485.952,12.578.594,17.475-.383,5.239-.685,9.376,1.467,11.252,1.8,1.565,5.381,1.707,11.281.448,12-2.56,28.748-.37,37.153,10.491,4.522,5.843,8.085,16.463-.623,33.88Zm-173.652-1.271h172.865c6.489-13.165,6.692-24.287.581-32.182-7.711-9.963-23.888-12.585-35.883-10.026-6.411,1.368-10.23,1.142-12.381-.732-2.631-2.292-2.308-6.71-1.9-12.3.352-4.815.789-10.808-.569-17.115-1.368-6.351-6.063-10.926-12.881-12.551-10.957-2.614-30.1,2.177-47.971,24.27-17.534,21.672-22.817,18.54-30.126,14.2-3.767-2.234-8.043-4.767-14.99-4.57a11.10885,11.10885,0,0,0-8.108,3.909c-10.118,11.146-8.884,42.398-8.636,47.097Z" transform="translate(-139.84793 -192.45672)" fill="#d5b263"/>
                <path d="M923.90791,706.92328h-172.216l-.033-.965-8.223-235.18h188.727Zm-170.284-2h168.352l8.117-232.145h-184.587Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <rect x="639.82597" y="321.89657" width="13.099" height="162.097" fill="#3f3f46"/>
                <rect x="691.40202" y="321.89657" width="13.099" height="162.097" fill="#3f3f46"/>
                <rect x="742.97801" y="321.89657" width="13.099" height="162.097" fill="#3f3f46"/>
                <path d="M1041.59738,539.83884l-.8457-.53418L826.83762,404.12156l18.55566-29.36182.84571.53418,213.91308,135.18262Zm-212-136.33935,211.377,133.57959,16.418-25.97949-211.376-133.58106Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <path d="M989.9499,393.22629a38.459,38.459,0,0,0-58.62,38.07l10.2,6.446a30.344,30.344,0,1,1,28.98,18.321l10.2,6.446a38.459,38.459,0,0,0,9.249-69.283Z" transform="translate(-139.84793 -192.45672)" fill="#3f3f46"/>
                <rect y="513.08657" width="909" height="2" fill="#3f3f46"/>
                <path d="M536.88489,691.89628h-14.564l-6.932-56.174h21.5Z" transform="translate(-139.84793 -192.45672)" fill="#e0a3a3"/>
                <path d="M494.23393,705.41828h45.771v-17.684h-28.332a17.439,17.439,0,0,0-17.439,17.439h0Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
                <path d="M531.766,604.85129l10.046,10.545,45.452-33.727-14.826-15.563Z" transform="translate(-139.84793 -192.45672)" fill="#e0a3a3"/>
                <path d="M552.16123,620.2275l-19.54908-20.51237-12.80321,12.202,31.582,33.1382.17738-.169a17.4414,17.4414,0,0,0,.59292-24.65874Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
                <path d="M430.39593,450.95329a11.94591,11.94591,0,0,1,5.715-17.4l57.179-145.727,22.288,13.345-63.518,139.8a12.01,12.01,0,0,1-21.664,9.982Z" transform="translate(-139.84793 -192.45672)" fill="#e0a3a3"/>
                <path d="M647.42792,461.3983a11.94507,11.94507,0,0,1-10.727-14.85l-84.354-131.869,23.891-10.2,75.836,133.523a12.01,12.01,0,0,1-4.646,23.4Z" transform="translate(-139.84793 -192.45672)" fill="#e0a3a3"/>
                <path d="M493.8529,436.36129l14.931,221.913,35.682-3.148,7.34595-163.722,19.94,70.314,43.028,3.148-17.031-139Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
                <path d="M578.04889,551.2243l-6.3,10.495-44.073,30.434,31.484,16.792s60.869-33.583,55.622-44.078Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
                <circle cx="423.432" cy="41.59257" r="29.889" fill="#e0a3a3"/>
                <path d="M567.757,220.64529l23.208.93c2.92-.009,6.108-.112,8.332-2,3.35-2.849,2.789-8.225.995-12.241-5-11.182-16.153-15.188-28.4-14.859s-25.08,4.48-31.675,14.8-8.377,23.352-5.893,35.344a38.534,38.534,0,0,1,31.508-21.97Z" transform="translate(-139.84793 -192.45672)" fill="#1f1f23"/>
              </svg>
              <h2 className="text-xl font-bold text-white mb-2">Delete Account</h2>
              <p className="text-zinc-400 mb-6 font-medium">
                Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-850 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* put hexagons.png as a background layer on the page */
        .bg-hexagons {
          background-color: #000000;
          background-image: url('/hexagons.png');
          background-repeat: no-repeat;
          background-position: top center;
          background-size: 1400px auto;
        }
        :global(body) { background: #000000; }

        /* card base — improved aesthetics and shadow */
        .card-notifications, .card-privacy {
          border: 1px solid rgba(63, 63, 70, 0.25);
          background: linear-gradient(180deg, #0c0c0e, #050506);
          border-radius: 24px;
          transition: transform 160ms ease, border-color 160ms ease;
        }
        .card-notifications:hover,
        .card-privacy:hover {
          transform: translateY(-2px);
          border-color: rgba(213, 178, 99, 0.25);
        }

        /* decorative icon circle */
        .flex-shrink-0 svg {
          display: block;
          background: rgba(213, 178, 99, 0.1);
          padding: 8px;
          border-radius: 12px;
          border: 1px solid rgba(213, 178, 99, 0.2);
        }

        /* layout */
        .channel-block { padding-bottom: 0; }
        .setting-row, .privacy-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .setting-text {
          font-family: "Poppins", sans-serif;
          font-size: 16px;
          color: #a1a1aa;
          font-weight: 500;
        }

        /* checkbox square style */
        input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          background: #121215;
          border: 1.5px solid #3f3f46;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        input[type="checkbox"]:checked {
          background: #d5b263;
          border-color: #d5b263;
        }
        input[type="checkbox"]:checked::after{
          content: "";
          position: absolute;
          left: 6px;
          top: 2px;
          width: 6px;
          height: 11px;
          border: solid black;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
        }

        /* headings strong black Poppins */
        h2, h3, .privacy-title {
          font-family: "Poppins", sans-serif;
          color: #ffffff;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .setting-text { font-size: 15px; }
          input[type="checkbox"] { width: 20px; height: 20px; }
        }
      `}</style>
    </>
  );
}