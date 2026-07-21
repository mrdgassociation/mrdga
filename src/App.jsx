import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Form from './pages/Form';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports'; // 👈 Import करा
import UserManagement from './pages/UserManagement'; // Import

import AdminLayout from './components/AdminLayout';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🌐 सार्वजनिक वेबसाईट राऊट्स (यावर मूळ Navbar व Footer दिसेल) */}
        <Route path="/" element={<Home />} />
        <Route path="/form" element={<Navigate to="/form/2026" replace />} />
        <Route path="/form/:season" element={<Form />} />
        <Route path="/login" element={<Login />} />

        {/* 🔐 स्वतंत्र ॲडमिन पोर्टल (Sidebar सह) */}
        <Route 
          path="/admin" 
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          } 
        />
        <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
        <Route path="/admin/users" element={<AdminLayout><UserManagement /></AdminLayout>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}