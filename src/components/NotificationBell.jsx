import React, { useState, useEffect } from 'react';
import { Bell, X, ExternalLink, CheckCheck, Sparkles } from 'lucide-react';
import { notificationService, NOTIFICATION_CONFIG } from '../services/notificationService';
import { authService } from '../services/authService'; // 🎯 तुझी मूळ authService फाईल
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userInfo, setUserInfo] = useState({ role: 'Public', department: 'Public' });
  const navigate = useNavigate();

  useEffect(() => {

    // 🚀 ऑटोमॅटिक Push Service Worker रजिस्टर करा
  notificationService.requestPushPermission();
  
    // 🔑 १. authService वरून लॉगिन युझरचे Exact Details (Role & Dept) मिळवा
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user && user.email) {
        const roleData = await authService.getUserRole(user.email);
        if (roleData) {
          setUserInfo({
            role: roleData.role || 'Public',
            department: roleData.department || 'Public'
          });
        }
      }
      fetchNotifications();
    });

    return () => unsubscribe();
  }, []);

  const fetchNotifications = async () => {
    const data = await notificationService.getNotificationHistory(15);
    
    // 🎯 २. तुझ्या authService मधील Role आणि Dept नुसार Filter
    const filtered = data.filter((item) => {
      if (item.targetGroup === 'ALL') return true;
      if (item.targetGroup === 'MRDGA_MEMBERS' && userInfo.role !== 'Public') return true;
      if (item.targetGroup === `DEPT_${userInfo.department}`) return true;
      if (item.targetGroup === `ROLE_${userInfo.role}`) return true;
      return false;
    });

    setNotifications(filtered);
    
    // Unread count tracking
    const readIds = JSON.parse(localStorage.getItem('mrdga_read_notifications') || '[]');
    const unread = filtered.filter(n => !readIds.includes(n.id)).length;
    setUnreadCount(unread);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('mrdga_read_notifications', JSON.stringify(allIds));
    setUnreadCount(0);
  };

  const handleNotificationClick = (item) => {
    const readIds = JSON.parse(localStorage.getItem('mrdga_read_notifications') || '[]');
    if (!readIds.includes(item.id)) {
      readIds.push(item.id);
      localStorage.setItem('mrdga_read_notifications', JSON.stringify(readIds));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (item.actionUrl) {
      setIsOpen(false);
      navigate(item.actionUrl);
    }
  };

  return (
    <div className="relative">
      {/* 🔔 Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) markAllAsRead();
        }}
        className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-gray-300 hover:text-amber-400 transition cursor-pointer"
        title="सूचना / नोटिफिकेशन्स"
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread Red Counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center px-1 animate-pulse border-2 border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 📱 Slide-over Drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans text-white">
            
            {/* Drawer Header */}
            <div className="p-3.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-amber-300">सूचना केंद्र (Notifications)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-gray-400 hover:text-amber-400 flex items-center gap-1 transition"
                  title="सर्व वाचले म्हणून चिन्हांकित करा"
                >
                  <CheckCheck className="w-3 h-3" /> सर्व वाचले
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  नवीन कोणत्याही सूचना उपलब्ध नाहीत.
                </div>
              ) : (
                notifications.map((item) => {
                  const readIds = JSON.parse(localStorage.getItem('mrdga_read_notifications') || '[]');
                  const isRead = readIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 rounded-xl transition cursor-pointer flex gap-3 items-start ${
                        isRead ? 'bg-transparent opacity-70 hover:opacity-100' : 'bg-amber-500/10 border border-amber-500/20'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-white/10">
                            {NOTIFICATION_CONFIG.categories.find(c => c.id === item.category)?.label || item.category}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('mr-IN') : 'आत्ताच'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-0.5">{item.title}</h4>
                        <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">{item.body}</p>
                        
                        {item.actionUrl && (
                          <div className="mt-1.5 text-[10px] text-amber-400 font-bold flex items-center gap-1">
                            पाहण्यासाठी इथे क्लिक करा <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2 bg-slate-900/80 border-t border-white/5 text-[10px] text-gray-500 text-center">
              महाराष्ट्र राज्य दहीहंडी गोविंदा असोसिएशन (MRDGA)
            </div>

          </div>
        </>
      )}
    </div>
  );
}