import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export function usePermission() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = authService.getCurrentUser(async (user) => {
      if (user?.email) {
        try {
          const doc = await authService.getUserRole(user.email);
          setUserProfile(doc || {});
        } catch (e) {
          console.error("Permission fetch error:", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔍 परवानगी तपासण्याचे फंक्शन
  const can = (moduleName, action = 'view') => {
    if (!userProfile) return false;
    if (userProfile.role === 'Super Admin') return true; // सुपर अॅडमिनला सर्व अधिकार

    const userPerms = userProfile.permissions;
    if (userPerms && userPerms[moduleName]) {
      return !!userPerms[moduleName][action];
    }

    // जुन्या युझर्ससाठी सेफ फॉलबॅक
    if (userProfile.department === 'MRDGA' || userProfile.department === 'SUPER') return true;
    return false;
  };

  return { can, userProfile, loading };
}