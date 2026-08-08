import { db } from '../firebase/config';
import { 
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, 
  doc, getDoc, updateDoc, where 
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
  async saveUserFcmToken(email, tokenOrSubscription) {
  //  console.log(`🚀 [FCM-LOG 3]: Initiating Token Save for Email: '${email}'`);
    if (!email || !tokenOrSubscription) {
      console.warn("⚠️ [FCM-LOG 3.1]: Missing Email or Token. Aborting save.");
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let cleanToken = '';
    let subscriptionJson = '';

    if (typeof tokenOrSubscription === 'object' && tokenOrSubscription.endpoint) {
      subscriptionJson = JSON.stringify(tokenOrSubscription);
      const parts = tokenOrSubscription.endpoint.split('/');
      cleanToken = parts[parts.length - 1];
    } else if (typeof tokenOrSubscription === 'string') {
      try {
        const parsed = JSON.parse(tokenOrSubscription);
        if (parsed.endpoint) {
          subscriptionJson = tokenOrSubscription;
          const parts = parsed.endpoint.split('/');
          cleanToken = parts[parts.length - 1];
        } else {
          cleanToken = tokenOrSubscription;
        }
      } catch (e) {
        cleanToken = tokenOrSubscription;
      }
    }

    //console.log(`🔑 [FCM-LOG 3.2]: Normalized Email: '${emailLower}' | Clean Token Snippet: '${cleanToken.substring(0, 20)}...'`);

    const payloadToSave = {
      fcmToken: cleanToken,
      webPushSubscription: subscriptionJson || null,
      notificationsEnabled: true,
      updatedAt: serverTimestamp()
    };

    try {
      // 🏢 A. Update in 'users' collection
      try {
        const userDocRef = doc(db, 'users', emailLower);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          await updateDoc(userDocRef, payloadToSave);
         // console.log("✅ [FCM-LOG 3.4]: Token successfully updated in 'users' collection!");
        }
      } catch (userErr) {
        //console.log("ℹ️ [FCM-LOG 3.5b]: 'users' check safely bypassed.");
      }

      // 🛡️ B. Update in 'insurance_requests_2026' collection
      const insQuery = query(collection(db, 'insurance_requests_2026'), where('email', '==', emailLower));
      const insSnap = await getDocs(insQuery);
      if (!insSnap.empty) {
        insSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'insurance_requests_2026', d.id), { fcmToken: cleanToken });
        });
        //console.log(`✅ [FCM-LOG 3.7]: Token updated in ${insSnap.size} insurance records.`);
      }

      // 🏆 C. Update in 'teams' collection
      const teamsQuery = query(collection(db, 'teams'), where('email', '==', emailLower));
      const teamsSnap = await getDocs(teamsQuery);
      if (!teamsSnap.empty) {
        teamsSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'teams', d.id), { fcmToken: cleanToken });
        });
       // console.log(`✅ [FCM-LOG 3.10]: Token updated in ${teamsSnap.size} team records.`);
      }

    } catch (err) {
      console.error("❌ [FCM-ERROR 3]: Error saving FCM Token to Firestore:", err);
    }
  },

  // 🎯 RELIABLE PUSH PERMISSION (Fallback Fixed)
  async requestPushPermission(userEmail = null) {
    //console.log("--------------------------------------------------");
    //console.log("🚀 [PUSH PROCESS START]: Requesting Permission for:", userEmail);

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("⚠️ या ब्राउझरमध्ये Push Notification सपोर्ट नाही.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ Permission denied.");
      return null;
    }
   // console.log("✅ [STEP 1 SUCCESS]: Permission Granted!");

    try {
      const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
      await navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL });
      const activeRegistration = await navigator.serviceWorker.ready;
     // console.log("✅ [STEP 2 SUCCESS]: Service Worker Active!", activeRegistration);

      let finalTokenOrSub = null;

      // 📌 STEP 3: SDK Direct Method First (Fast & Reliable)
      try {
      //  console.log("🔑 [STEP 3]: Requesting FCM Token via Firebase Messaging SDK...");
        const messaging = getMessaging();
        
        finalTokenOrSub = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: activeRegistration
        });

        if (finalTokenOrSub) {
        //  console.log("📲 [STEP 3 SUCCESS]: FCM Token Received directly via SDK!", finalTokenOrSub);
        }
      } catch (sdkErr) {
        console.warn("⚠️ Firebase Messaging SDK failed, trying PushManager fallback:", sdkErr.message);
      }

      // 📌 PushManager Native Fallback (जर SDK फेल झाला तर)
      if (!finalTokenOrSub) {
        //console.log("🔑 [STEP 3 FALLBACK]: Trying Native PushManager...");
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_KEY);
        
        if (convertedVapidKey) {
          let sub = await activeRegistration.pushManager.getSubscription();
          if (!sub) {
            sub = await activeRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });
          }
          finalTokenOrSub = sub;
        }
      }

      // 📌 STEP 4: Firestore Save
      if (finalTokenOrSub) {
        if (userEmail) {
        //  console.log("👉 [STEP 4 TRIGGER]: Saving token for email:", userEmail);
          await this.saveUserFcmToken(userEmail, finalTokenOrSub);
        }
        return finalTokenOrSub;
      } else {
        console.warn("❌ [STEP 3 FAIL]: Could not retrieve FCM token.");
        return null;
      }

    } catch (err) {
      console.error("❌ [STEP 3 ERROR LOG]:", err.message || err);
      return null;
    }
  }
};