// ==========================================
// 🎯 MRDGA SYSTEM MODULES CONFIGURATION
// ==========================================

export const SYSTEM_MODULES = [
  {
    key: 'COMPETITION',
    label: 'स्पर्धा',
    icon: '🏆',
    color: 'orange',
    path: '/admin'
  },
  {
    key: 'INSURANCE',
    label: 'विमा',
    icon: '🛡️',
    color: 'emerald',
    path: '/admin/insurance'
  },
  {
    key: 'DIRECTORY',
    label: 'डिरेक्टरी',
    icon: '📖',
    color: 'blue',
    path: '/admin/mandal-directory'
  },
  {
    key: 'REPORTS',
    label: 'रिपोर्ट्स',
    icon: '📊',
    color: 'indigo',
    path: '/admin/reports'
  }
  // 🔮 उद्या नवीन मॉड्यूल आले की फक्त इथे १ ओळ जोडायची:
  // { key: 'MEETING_RSVP', label: '१६ ऑगस्ट बैठक', icon: '📅', color: 'purple', path: '/admin/rsvp' },
  // { key: 'ID_CARD', label: 'आयकार्ड प्रिंट', icon: '🪪', color: 'amber', path: '/admin/id-cards' }
];

// 🎯 सर्व कीजची लिस्ट (Default All Access साठी)
export const ALL_MODULE_KEYS = SYSTEM_MODULES.map(m => m.key);