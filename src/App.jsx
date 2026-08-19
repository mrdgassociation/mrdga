import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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

export default function App() {
  const currentYear = new Date().getFullYear();
  
  return (
    <Router>
      <Routes>
        {/* 🌐 सार्वजनिक वेबसाईट राऊट्स */}
        <Route path="/" element={<Home />} />
        {/* 🚩 BUG FIXED: Competitions वर ModuleGuard जोडला आहे */}
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

        {/* 📸 उपक्रम & फोटो गॅलरी (Navbar & Layout सह) */}
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

        {/* 🔐 1. Admin Dashboard (फक्त MRDGA आणि SUPER डिपार्टमेंटसाठी) */}
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

        {/* 🛡️ 2. Insurance Dashboard (INSURANCE, MRDGA आणि SUPER डिपार्टमेंटसाठी) */}
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

        {/* 🔐 3. Reports & Export (INSURANCE, MRDGA आणि SUPER सर्व टीम्ससाठी) */}
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

        // 2. Routes मध्ये (उदा. AdminDashboard च्या खाली):
        {/* 🔐 दहीहंडी स्पर्धा व्यवस्थापन (फक्त MRDGA आणि SUPER डिपार्टमेंटसाठी) */}
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

        {/* 🎯 मॅनेज करा वर क्लिक केल्यावर उघडणारे पेज (हा राऊट मिसिंग असेल तर एरर येतो) */}
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

        {/* 🔐 📖 गोविंदा पथक डिरेक्टरी (फक्त MRDGA आणि SUPER डिपार्टमेंटसाठी) */}
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

      {/* 👤 📋 माझे प्रोफाईल & कार्य अहवाल (सर्व अधिकृत डिपार्टमेंट्ससाठी) */}
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


        {/* 🔐 4. User Management (फक्त Super Admin साठी) */}
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

        {/* 🔐 5. Website Page Visibility Settings (फक्त Super Admin साठी) */}
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

        {/* 🔐 6. Notification Hub (फक्त Super Admin साठी) */}
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

                {/* 🚩 १६ ऑगस्ट बैठक RSVP (ModuleGuard द्वारे सुपर ॲडमिन कंट्रोल) */}
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