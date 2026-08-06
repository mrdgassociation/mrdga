/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 📦 Workbox Precache Manifest Injection Site (PWA साठी आवश्यक)
self.__WB_MANIFEST;

// 🎯 FIXED: Service Worker मध्ये थेट Firebase Static Init करणे (जर तुमच्याकडे Vite env नसेल, तर डायरेक्ट व्हॅल्यूज ठेवा)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Background Notification Listener थेट सुरुवातीलाच चालू ठेवणे
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background FCM Notification Received:', payload);
  showNotification(
    payload.notification?.title || payload.data?.title || 'MRDGA Update',
    payload.notification?.body || payload.data?.body || payload.data?.message,
    payload.data?.actionUrl || payload.data?.targetPath
  );
});

// 1️⃣ Install Event
self.addEventListener('install', (event) => {
  console.log('📦 [SW] Service Worker Installing...');
  self.skipWaiting();
});

// 2️⃣ Activate Event
self.addEventListener('activate', (event) => {
  console.log('⚡ [SW] Service Worker Activated & Claiming Clients!');
  event.waitUntil(self.clients.claim());
});

// 🛠️ Helper Function: System Notification Pop-up
function showNotification(title, body, url) {
  console.log(`📢 [SW ShowNotification] Triggering: "${title}"`);

  const options = {
    body: body || 'नवीन अपडेट उपलब्ध आहे.',
    icon: '/mrdga-logo.png',
    badge: '/mrdga-logo.png',
    data: { url: url || '/mrdga/' },
    requireInteraction: true
  };

  return self.registration.showNotification(title, options)
    .then(() => console.log('✅ [SW] System Notification Displayed Successfully!'))
    .catch((err) => console.error('❌ [SW] ShowNotification Error:', err));
}

// 3️⃣ Direct Push Event
self.addEventListener('push', (event) => {
  console.log('🚀 [SW Push Event] Triggered!', event);

  let title = 'MRDGA Update 🔔';
  let body = 'नवीन सूचना उपलब्ध आहे.';
  let url = '/mrdga/';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.notification?.title || data.data?.title || title;
      body = data.notification?.body || data.data?.body || data.data?.message || body;
      url = data.data?.actionUrl || data.data?.targetPath || url;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(showNotification(title, body, url));
});

// 4️⃣ Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [SW Click] Notification clicked:', event);
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/mrdga/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.includes(urlToOpen) && 'focus' in windowClients[i]) {
          return windowClients[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// 5️⃣ Message Event (React Front-end कडून येणारे मेसेजेस)
self.addEventListener('message', (event) => {
  console.log('📩 [SW Message Event] Data received from App:', event.data);

  if (!event.data) return;

  if (event.data.type === 'TEST_PUSH') {
    console.log('🔔 [SW] TEST_PUSH Triggered with Payload:', event.data.payload);

    const title = event.data.payload?.title || 'MRDGA Update 🔔';
    const body = event.data.payload?.body || 'नवीन अपडेट उपलब्ध आहे.';
    const url = event.data.payload?.url || '/mrdga/';

    event.waitUntil(showNotification(title, body, url));
  }
});