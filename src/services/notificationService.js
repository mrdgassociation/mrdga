import { db, getMessagingInstance, VAPID_KEY } from '../firebase/config';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

// 🎯 Categories आणि Target Groups (Dynamic Config)
export const NOTIFICATION_CONFIG = {
  categories: [
    { id: 'ANNOUNCEMENT', label: '📢 महत्त्वाच्या बातम्या / सूचना' },
    { id: 'COMPETITION', label: '🏆 स्पर्धा अपडेट्स' },
    { id: 'REGISTRATION', label: '📑 अर्ज / नोंदणी स्टेटस' },
    { id: 'URGENT', label: '🚨 तातडीचे (Emergency)' }
  ],
  targetGroups: [
    { id: 'ALL', label: '🌐 सर्व युझर्स (All Public)' },
    { id: 'MRDGA_MEMBERS', label: '🛡️ फक्त MRDGA सदस्य' },
    { id: 'DEPT_OFFICIALS', label: '🏢 अधिकारी / कर्मचारी' }
  ]
};

export const notificationService = {
  // 1️⃣ Super Admin - नवीन नोटीफिकेशन सेव्ह आणि पब्लिश करणे (Firestore)
  async sendNotification(notificationData) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Notification Send Error:", error);
      throw error;
    }
  },

  // 2️⃣ ब्रॉडकास्ट हिस्ट्री (Recent Notifications) लोड करणे
  async getNotificationHistory(limitCount = 20) {
    try {
      const q = query(
        collection(db, 'notifications'), 
        orderBy('createdAt', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Fetch Notification History Error:", error);
      return [];
    }
  },

  // 3️⃣ 🛡️ Push Notification Permission & PostMessage to Service Worker (Zero Leakage)
async requestPushPermission() {
    console.log("🚀 [Front-end] requestPushPermission initiated...");
    try {
      if (!("Notification" in window)) {
        console.warn("⚠️ [Front-end] Notifications not supported in this browser.");
        return null;
      }

      console.log("🔒 [Front-end] Current Permission state:", Notification.permission);
      const permission = await Notification.requestPermission();
      console.log("🔒 [Front-end] Permission result:", permission);

      if (permission === "granted") {
        const messaging = await getMessagingInstance();
        console.log("🔥 [Front-end] Firebase Messaging Instance:", messaging ? "Available" : "Null");
        if (!messaging) return null;

        const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
        console.log("📂 [Front-end] Registering SW at path:", swPath);

        const registration = await navigator.serviceWorker.register(swPath, {
          scope: import.meta.env.BASE_URL
        });
        console.log("✅ [Front-end] SW Registration Object:", registration);

        // Function to send PostMessage
        const sendConfigToSW = (sw, stateName) => {
          if (sw) {
            console.log(`📤 [Front-end] Sending PostMessage to SW (${stateName})...`);
            sw.postMessage({
              type: 'SET_FIREBASE_CONFIG',
              config: {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID
              }
            });
          }
        };

        if (registration.active) {
          sendConfigToSW(registration.active, "Active");
        } else if (registration.installing || registration.waiting) {
          const sw = registration.installing || registration.waiting;
          sw.addEventListener('statechange', (e) => {
            console.log("🔄 [Front-end] SW state changed:", e.target.state);
            if (e.target.state === 'activated') {
              sendConfigToSW(navigator.serviceWorker.controller || registration.active, "Activated");
            }
          });
        }

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        console.log("📲 [Front-end] FCM Device Token:", token);
        return token;
      } else {
        console.warn("❌ [Front-end] Permission denied by user.");
        return null;
      }
    } catch (error) {
      console.error("❌ [Front-end Error]:", error);
      return null;
    }
  }
};

// FCM Token मिळाल्‍यानंतर Topic Subscription (Optional Helper)
export const subscribeUserToTopic = async (token, topicName = 'ALL') => {
  try {
    // Topic Registration Helper Call
    console.log(`Subscribing token to topic: ${topicName}`);
  } catch (err) {
    console.error("Topic Subscription Error:", err);
  }
};