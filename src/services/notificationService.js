import { db } from '../firebase/config';
import { 
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, 
  doc, setDoc, getDoc, updateDoc, where 
} from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging'; // 👈 १. FCM SDK डायरेक्ट इंपोर्ट केले

// .env मधून VAPID Key स्वच्छ करून घेणे
const rawVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const VAPID_KEY = rawVapidKey.trim().replace(/^["']|["']$/g, '');

// Base64 VAPID Key conversion helper
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error("❌ VAPID Key conversion failed:", e);
    return null;
  }
}

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

  // 1️⃣ Firestore मध्ये नोटीफिकेशन सेव्ह करणे
  async sendNotification(notificationData) {
    try {
    //  console.log("📤 [FCM-LOG 1]: Saving notification record to Firestore...", notificationData);
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp()
      });
    //  console.log("✅ [FCM-LOG 1.1]: Notification saved successfully with ID:", docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("❌ [FCM-ERROR 1]: Failed to save notification:", error);
      throw error;
    }
  },

  // 2️⃣ ब्रॉडकास्ट हिस्ट्री फेच करणे
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
      console.error("❌ [FCM-ERROR 2]: History fetch failed:", error);
      return [];
    }
  },

 // 3️⃣ 💾 FIRESTORE TOKEN SAVE FUNCTION
  async saveUserFcmToken(email, tokenOrSubscription, source = 'web') {
    if (!email || !tokenOrSubscription) {
      console.warn("⚠️ [FCM]: Missing Email or Token.");
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let cleanToken = '';

    if (typeof tokenOrSubscription === 'object' && tokenOrSubscription.endpoint) {
      const parts = tokenOrSubscription.endpoint.split('/');
      cleanToken = parts[parts.length - 1];
    } else if (typeof tokenOrSubscription === 'string') {
      try {
        const parsed = JSON.parse(tokenOrSubscription);
        cleanToken = parsed.endpoint ? parsed.endpoint.split('/').pop() : tokenOrSubscription;
      } catch (e) {
        cleanToken = tokenOrSubscription;
      }
    }

    try {
      console.log("💾 [FCM] Saving to 'fcm_tokens' collection for:", emailLower);
      
      // 🎯 थेट setDoc वापरणे (डॉक्युमेंट नसेल तर नवीन तयार करेल, असेल तर अपडेट करेल)
      const tokenDocRef = doc(db, 'fcm_tokens', emailLower);
      await setDoc(tokenDocRef, {
        email: emailLower,
        fcmToken: cleanToken,
        source: source,
        platform: 'web',
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log("✅ [FCM SUCCESS] Document written to 'fcm_tokens'!");
    } catch (err) {
      console.error("❌ [FCM FIRESTORE ERROR]:", err);
      throw err;
    }
  },

  async requestPushPermission(userEmail = null) {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("⚠️ Push Notification not supported.");
      return null;
    }

    try {
      console.log("👉 [STEP A]: Checking permission...");
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      console.log("🔔 Permission status:", permission);
      
      if (permission !== "granted") return null;

      console.log("👉 [STEP B]: Registering Service Worker...");
      const swUrl = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
      await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
      
      console.log("👉 [STEP C]: Waiting for Service Worker READY...");
      const readyReg = await navigator.serviceWorker.ready;
      console.log("✅ [STEP C SUCCESS]: Service Worker is READY!");

      let finalToken = null;

      // 🎯 STEP D1: जुनी सबस्क्रिप्शन क्लिअर करून नवीन घेणे
      console.log("👉 [STEP D]: Subscribing via PushManager...");
      try {
        const convertedKey = urlBase64ToUint8Array(VAPID_KEY);

        // जुनी अडकलेली सबस्क्रिप्शन असल्यास आधी ती काढून टाकणे
        const existingSub = await readyReg.pushManager.getSubscription();
        if (existingSub) {
          console.log("🧹 [STEP D]: Unsubscribing old push subscription...");
          await existingSub.unsubscribe();
        }

        console.log("🚀 [STEP D]: Creating fresh push subscription...");
        const newSub = await readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        if (newSub && newSub.endpoint) {
          const parts = newSub.endpoint.split('/');
          finalToken = parts[parts.length - 1];
          console.log("🔑 [STEP D SUCCESS - NATIVE]: Fresh Token Obtained:", finalToken);
        }
      } catch (nativeErr) {
        console.warn("❌ Native subscription failed:", nativeErr.message || nativeErr);
      }

      // 🎯 STEP D2: जर Native ने टोकन दिले नसेल तरच SDK प्रयत्न करणे
      if (!finalToken) {
        try {
          const messaging = getMessaging();
          finalToken = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: readyReg
          });
          console.log("🔑 [STEP D SUCCESS - SDK]: FCM Token Obtained:", finalToken);
        } catch (sdkErr) {
          console.error("SDK getToken Error:", sdkErr);
        }
      }

      // 🎯 STEP E: Firestore मध्ये सेव्ह करणे
      if (finalToken && userEmail) {
        console.log("👉 [STEP E]: Saving token to Firestore for:", userEmail);
        await this.saveUserFcmToken(userEmail, finalToken, 'spain_tour_whitelist');
        console.log("🎉 [SUCCESS]: Token saved to fcm_tokens collection!");
        return finalToken;
      }

      return finalToken;
    } catch (err) {
      console.error("❌ [CRITICAL FCM FAILURE]:", err);
      throw err;
    }
  }
};