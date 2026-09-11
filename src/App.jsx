import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import InsuranceInfo from './pages/InsuranceInfo';
import Form from './pages/Form';
import Login from './pages/Login';
import Competitions from './pages/Competitions';
import InsuranceDashboard from './pages/InsuranceDashboard';
import MyTeamDashboard from './pages/MyTeamDashboard';
import NotificationHub from './pages/NotificationHub';
import TournamentManager from './pages/TournamentManager';
import MandalDirectory from './pages/MandalDirectory';
import MeetingRSVP from './pages/MeetingRSVP';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import PageSettings from './pages/PageSettings';
import AdminLayout from './components/AdminLayout';

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Helpdesk from './pages/Helpdesk';
import EventsGallery from './pages/EventsGallery';

// 🔒 Security & Feature Guards
import ProtectedRoute from './components/ProtectedRoute';
import ModuleGuard from './components/ModuleGuard';

import UserProfilePage from './pages/UserProfilePage';
import TournamentScoringHub from './pages/TournamentScoringHub';

// 🇪🇸 Spain Tour 2026 Pages
import SpainTourPortal from './pages/SpainTourPortal';
import SpainVisaAdmin from './pages/SpainVisaAdmin';

export default function App() {
  const currentYear = new Date().getFullYear();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);
  
  return (
    <Router>
      <Routes>
        {/* 🌐 सार्वजनिक वेबसाईट राऊट्स */}
        <Route path="/" element={<Home />} />
        
        <Route 
          path="/competitions" 
          element={
            <ModuleGuard pageKey="competitionPage">
              <Competitions />
            </ModuleGuard>
          } 
        />

        {/* 🔒 Dynamic Feature Toggled Routes */}
        <Route 
          path="/about" 
          element={
            <ModuleGuard pageKey="aboutPage">
              <About />
            </ModuleGuard>
          } 
        />
        <Route 
          path="/insurance-info" 
          element={
            <ModuleGuard pageKey="insurancePage">
              <InsuranceInfo />
            </ModuleGuard>
          } 
        />
        <Route 
          path="/contact" 
          element={
            <ModuleGuard pageKey="contactPage">
              <Helpdesk />
            </ModuleGuard>
          } 
        />

        {/* 📸 उपक्रम & फोटो गॅलरी */}
        <Route 
          path="/gallery" 
          element={
            <ModuleGuard pageKey="galleryPage">
              <EventsGallery />
            </ModuleGuard>
          } 
        />

        {/* फॉर्म व इतर लीगल पेजेस */}
        <Route 
          path="/form" 
          element={<Navigate to={`/form/${currentYear}`} replace />} 
        />
        <Route path="/form/:compId" element={<Form />} />
        <Route path="/my-status" element={<MyTeamDashboard />} />
        <Route path="/login" element={<Login />} />

        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route 
          path="/helpdesk" 
          element={
            <ModuleGuard pageKey="contactPage">
              <Helpdesk /> 
            </ModuleGuard>
          } 
        />

        {/* 🔐 1. Admin Dashboard */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER']}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🛡️ 2. Insurance Dashboard */}
        <Route 
          path="/admin/insurance" 
          element={
            <ProtectedRoute allowedDepartments={['INSURANCE', 'MRDGA', 'SUPER']}>
              <AdminLayout>
                <InsuranceDashboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🇪🇸 १. प्रवाशांचे स्पेन दौरा नोंदणी पोर्टल (Secret - AdminLayout च्या आत) */}
        <Route 
          path="/admin/spain-tour-portal" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <SpainTourPortal currentUser={currentUser} />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🇪🇸 २. स्पेन व्हिसा कन्सोल (व्हिसा एजंट, MRDGA आणि Super Admin साठी) */}
        <Route 
          path="/admin/spain-tour" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER', 'VISA_AGENT']} allowedRoles={['Super Admin', 'Visa Agent']}>
              <AdminLayout>
                <SpainVisaAdmin currentUser={currentUser} />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 3. Reports & Export */}
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER', 'INSURANCE']}>
              <AdminLayout>
                <Reports />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 दहीहंडी स्पर्धा व्यवस्थापन */}
        <Route 
          path="/admin/tournaments" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER']}>
              <AdminLayout>
                <TournamentManager />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/tournaments/:tournamentId" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER']}>
              <AdminLayout>
                <TournamentScoringHub />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 📖 गोविंदा पथक डिरेक्टरी */}
        <Route 
          path="/admin/mandal-directory" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER']}>
              <AdminLayout>
                <MandalDirectory />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 👤 📋 माझे प्रोफाईल & कार्य अहवाल */}
        <Route 
          path="/admin/profile" 
          element={
            <ProtectedRoute allowedDepartments={['MRDGA', 'SUPER']}>
              <AdminLayout>
                <UserProfilePage />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 4. User Management */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 5. Website Page Visibility Settings */}
        <Route 
          path="/admin/settings" 
          element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminLayout>
                <PageSettings />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🔐 6. Notification Hub */}
        <Route 
          path="/admin/notifications" 
          element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminLayout>
                <NotificationHub />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* 🚩 १६ ऑगस्ट बैठक RSVP */}
        <Route 
          path="/rsvp" 
          element={
            <ModuleGuard pageKey="rsvpPage">
              <MeetingRSVP />
            </ModuleGuard>
          } 
        />

        <Route 
          path="/meeting-16aug" 
          element={
            <ModuleGuard pageKey="rsvpPage">
              <MeetingRSVP />
            </ModuleGuard>
          } 
        />

        {/* 🚀 चुकीचा मार्ग असल्यास थेट Home वर रीडायरेक्ट करा */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}