import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Bell, Check, Menu } from 'lucide-react';
import type { Notification } from '@/types';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

// Shared audio references to preserve AudioContext state across renders and unlock audio playback
let sharedAudioContext: AudioContext | null = null;
let sharedGainNode: GainNode | null = null;
let sharedAudio: HTMLAudioElement | null = null;

const initAudio = () => {
  if (sharedAudio) return;
  try {
    sharedAudio = new Audio('/notification.mp3');
    sharedAudio.volume = 1.0;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
      const source = sharedAudioContext.createMediaElementSource(sharedAudio);
      sharedGainNode = sharedAudioContext.createGain();
      sharedGainNode.gain.setValueAtTime(3.5, sharedAudioContext.currentTime); // Loud volume boost (3.5x)
      source.connect(sharedGainNode);
      sharedGainNode.connect(sharedAudioContext.destination);
    }
  } catch (e) {
    console.error('Audio initialization error:', e);
  }
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<number | null>(null);
  const [activeToast, setActiveToast] = useState<{ id: number; title: string; message: string } | null>(null);

  // Auto-dismiss the active notification toast after 3 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Unlock AudioContext and Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      initAudio();
      if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch((err) => console.warn('Failed to resume AudioContext:', err));
      }
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const playChimeAndSpeak = () => {
    try {
      initAudio();
      
      // Explicitly resume context if suspended (crucial for background playback)
      if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume();
      }

      if (sharedAudio) {
        sharedAudio.currentTime = 0;
        sharedAudio.play().catch((err) => {
          console.warn('Audio Context playback failed, trying fallback:', err);
          // Fallback playback directly if context routing fails
          const fallbackAudio = new Audio('/notification.mp3');
          fallbackAudio.volume = 1.0;
          fallbackAudio.play().catch((fallbackErr) => {
            console.warn('All audio playback attempts failed:', fallbackErr);
          });
        });
      }
      
      // 2. Speak "رونق!" using Speech Synthesis
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance('طلب جديد في رونق');
          utterance.lang = 'ar-SA';
          utterance.rate = 0.9;
          utterance.pitch = 1.15;
          window.speechSynthesis.speak(utterance);
        }, 500);
      }
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiRequest<{ notifications: Notification[]; unreadCount: number }>(
        '/system/notifications?limit=5'
      );
      if (response.success) {
        const fetched = response.data.notifications;
        setNotifications(fetched);
        setUnreadCount(response.data.unreadCount);

        if (fetched.length > 0) {
          const maxId = Math.max(...fetched.map((n) => n.id));
          if (lastNotificationId === null) {
            setLastNotificationId(maxId);
          } else if (maxId > lastNotificationId) {
            const hasNewOrder = fetched.some(
              (n) => n.id > lastNotificationId && n.type === 'order_update'
            );
            if (hasNewOrder) {
              playChimeAndSpeak();
              const newOrderNotif = fetched.find(
                (n) => n.id > lastNotificationId && n.type === 'order_update'
              );
              if (newOrderNotif) {
                setActiveToast({
                  id: newOrderNotif.id,
                  title: 'طلب جديد في رونق',
                  message: newOrderNotif.message,
                });
              }
            }
            setLastNotificationId(maxId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds for faster updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, lastNotificationId]);

  const handleMarkAllRead = async () => {
    try {
      const response = await apiRequest('/system/notifications/read-all', {
        method: 'POST',
      });
      if (response.success) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const response = await apiRequest(`/system/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (response.success) {
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      }
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-brand-50/45 backdrop-blur-md border-b border-brand-400/10 fixed top-0 left-0 right-0 z-30 flex items-center justify-between mr-0 lg:mr-sidebar">
      {/* Menu icon and Greeting */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-50 transition-colors text-on-surface-variant hover:text-on-surface"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-body-md text-on-surface-variant hidden xs:inline">مرحباً بك،</span>
          <span className="text-body-md font-semibold text-brand-400">{user?.name || 'مستخدم رونق'}</span>
        </div>
      </div>

      {/* Notification Bell with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 rounded-full hover:bg-neutral-50 transition-colors text-on-surface-variant hover:text-on-surface"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg border border-neutral-200 shadow-modal z-50 animate-fade-up">
              <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-body-md font-semibold text-on-surface">الإشعارات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-label-sm text-brand-400 hover:text-brand-500 font-medium flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-label-sm text-on-surface-variant">
                    لا توجد إشعارات حالية
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={cn(
                        'p-3 border-b border-neutral-50 cursor-pointer transition-colors flex flex-col gap-1',
                        notif.is_read ? 'bg-white hover:bg-neutral-50' : 'bg-brand-50/40 hover:bg-brand-50/70'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-body-md font-medium text-on-surface">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-brand-400 self-center" />
                        )}
                      </div>
                      <p className="text-label-sm text-on-surface-variant leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-neutral-500 mt-1 self-start">
                        {new Date(notif.created_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Premium Notification Popup Alert */}
      {activeToast && (
        <div className="fixed top-4 left-4 z-50 max-w-sm bg-[#9c5c24] text-[#f2e0b8] border border-[#f2e0b8]/30 shadow-[0_10px_35px_rgba(156,92,36,0.35)] rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 animate-toast-slide-in">
          <div className="bg-[#f2e0b8] p-2.5 rounded-xl text-[#9c5c24] shadow-inner flex-shrink-0 animate-bounce">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-body-md text-white tracking-wide">{activeToast.title}</h4>
            <p className="text-label-sm text-[#f2e0b8]/90 mt-1 leading-relaxed">{activeToast.message}</p>
          </div>
        </div>
      )}
    </header>
  );
};
