"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, X, Check, AlertCircle, ShoppingBag, Calendar, DollarSign, Info } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useDashboard } from '@/lib/dashboard-context';
import { getRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'order-update';
  createdAt: string;
  restaurantId: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
  const icons = {
    'info': <Info className="w-5 h-5 text-blue-600" />,
    'warning': <AlertCircle className="w-5 h-5 text-yellow-600" />,
    'error': <X className="w-5 h-5 text-red-600" />,
    'order-update': <ShoppingBag className="w-5 h-5 text-green-600" />,
  };
  return icons[type as keyof typeof icons] || icons.info;
};

const NotificationBell = () => {
  const { restaurant } = useDashboard();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousNotificationCount = useRef(0);

  useEffect(() => {
    if (restaurant?.id) {
      loadNotifications();
      // Reduce polling frequency to save server costs - poll every 60 seconds instead of 15
      const interval = setInterval(loadNotifications, 60000); // Poll every 60s
      return () => clearInterval(interval);
    }
  }, [restaurant?.id]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0; // Maximum volume
      audio.preload = 'auto';
      audio.play().catch(error => {
        console.error('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.error('Error creating audio:', error);
    }
  };

  const loadNotifications = async () => {
    if (!restaurant?.id) return;
    try {
      const data: any = await apiClient.getNotifications(restaurant.id, 20);
      const newNotifications = data.notifications || [];
      setNotifications(newNotifications);
    } catch (error) {
      // Silently fail for polling
      console.error('Failed to load notifications:');
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification cleared');
    } catch (error) {
      toast.error('Failed to clear notification');
    }
  };

  const handleClearAll = async () => {
    if (!restaurant?.id) return;
    if (!confirm('Clear all notifications?')) return;

    setLoading(true);
    try {
      await apiClient.clearAllNotifications(restaurant.id);
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-14 w-96 max-h-[32rem] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
              <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[26rem] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {notifications.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <NotificationIcon type={notification.type} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getRelativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Mark Read Button */}
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded-lg"
                        title="Mark as read"
                      >
                        <Check size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
