import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ProtectedRoute({ children, allowedRoles, allowedDepartments }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user && user.email) {
        try {
          const uDoc = await authService.getUserRole(user.email);
          
          if (uDoc) {
            const role = uDoc.role || 'Reviewer';
            const dept = uDoc.department || 'MRDGA';
            const isActive = uDoc.isActive !== false && uDoc.status !== 'Inactive';

            // 1. अकाऊंट ॲक्टिव्ह नसेल तर ब्लॉक
            if (!isActive) {
              setIsAuthorized(false);
              setLoading(false);
              return;
            }

            // 2. Super Admin किंवा SUPER डिपार्टमेंटला नेहमी ॲक्सेस
            if (role === 'Super Admin' || dept === 'SUPER') {
              setIsAuthorized(true);
              setLoading(false);
              return;
            }

            // 3. Role आणि Department मॅच करा
            const roleAllowed = !allowedRoles || allowedRoles.includes(role);
            const deptAllowed = !allowedDepartments || allowedDepartments.includes(dept);

            setIsAuthorized(roleAllowed && deptAllowed);
          } else {
            setIsAuthorized(false);
          }
        } catch (e) {
          console.error("ProtectedRoute Error:", e);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [allowedRoles, allowedDepartments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center text-amber-400 font-extrabold text-xs animate-pulse">
        सुरक्षा तपासणी होत आहे...
      </div>
    );
  }

  // 🛑 ॲक्सेस नसेल तर लगेच होमपेज ('/') वर पाठवा (रीडायरेक्ट करा)
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}