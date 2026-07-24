importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

let messaging = null;

// 1️⃣ Install Event - नवीन सर्व्हिस वर्कर लगेच लोड करण्यासाठी
self.addEventListener('install', (event) => {
  console.log('📦 [SW] Service Worker Installing...');
  self.skipWaiting(); // जुन्या वर्करची वाट न बघता तात्काळ ॲक्टिव्हेट व्हा
});

// 2️⃣ Activate Event - तात्काळ पेजेसचा ताबा (Control) घेण्यासाठी
self.addEventListener('activate', (event) => {
  console.log('⚡ [SW] Service Worker Activated & Claiming Clients!');
  event.waitUntil(clients.claim());
});

// 3️⃣ Message Event (React Front-end कडून येणारे मेसेजेस)
self.addEventListener('message', (event) => {
  console.log('📩 [SW Message Event] Data received from App:', event.data);

  if (!event.data) return;

  // A. Firebase Config Set करणे
  if (event.data.type === 'SET_FIREBASE_CONFIG') {
    const firebaseConfig = event.data.config;

    if (!firebase.apps.length) {
      try {
        firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
          console.log('[SW] Background FCM Notification Received:', payload);
          showNotification(
            payload.notification?.title || 'MRDGA Update',
            payload.notification?.body,
            payload.data?.actionUrl
          );
        });

        console.log('✅ [SW] Firebase Messaging Initialized via PostMessage.');
      } catch (err) {
        console.error('❌ [SW] Firebase Init Error:', err);
      }
    }
  }

  // B. Local Admin Push Test Trigger (Notification Hub)
  if (event.data.type === 'TEST_PUSH') {
    console.log('🔔 [SW] TEST_PUSH Triggered with Payload:', event.data.payload);

    const title = event.data.payload?.title || 'MRDGA Update 🔔';
    const body = event.data.payload?.body || 'नवीन अपडेट उपलब्ध आहे.';
    const url = event.data.payload?.url || '/mrdga/';

    event.waitUntil(showNotification(title, body, url));
  }
});

// 4️⃣ Direct Push Event (DevTools किंवा FCM Direct Push)
self.addEventListener('push', (event) => {
  console.log('🚀 [SW Push Event] Triggered!', event);

  let title = 'MRDGA Test Notification 🔔';
  let body = 'हे DevTools / FCM कडून आलेले Push Notification आहे!';
  let url = '/mrdga/';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.notification?.title || title;
      body = data.notification?.body || body;
      url = data.data?.actionUrl || url;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(showNotification(title, body, url));
});

// 🛠️ Helper Function: System Notification Pop-up दाखवण्यासाठी
function showNotification(title, body, url) {
  console.log(`📢 [SW ShowNotification] Triggering: "${title}"`);

  const options = {
    body: body || 'नवीन अपडेट उपलब्ध आहे.',
    icon: '/mrdga-logo.png',
    badge: '/mrdga-logo.png',
    data: { url: url || '/mrdga/' },
    requireInteraction: true // पॉप-अप स्क्रीनवर राहून अटेंशन घेईल
  };

  return self.registration.showNotification(title, options)
    .then(() => console.log('✅ [SW] System Notification Displayed Successfully!'))
    .catch((err) => console.error('❌ [SW] ShowNotification Error:', err));
}

// 5️⃣ Notification Click Event
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