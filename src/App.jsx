import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import InsuranceInfo from './pages/InsuranceInfo';
// जर हे पेजेस बनवून तयार नसतील तर सध्या तात्पुरते Home कडे नेऊ किंवा पेजेस इम्पोर्ट करा:
import Form from './pages/Form';
import Login from './pages/Login';
import Competitions from './pages/Competitions';
import MyTeamDashboard from './pages/MyTeamDashboard';


// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import AdminLayout from './components/AdminLayout';

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Helpdesk from './pages/Helpdesk';




export default function App() {

  const currentYear = new Date().getFullYear();
  
  return (

    
    <Router>
      <Routes>
        {/* 🌐 सार्वजनिक वेबसाईट राऊट्स */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        
        {/* भविष्यात बनणाऱ्या पेजेससाठी राऊट्स (सध्या तात्पुरते Home वर नेतील) */}
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/insurance-info" element={<InsuranceInfo />} />
        <Route path="/contact" element={<Helpdesk />} />

        {/* फॉर्म व लॉगिन 
        <Route path="/form" element={<Navigate to="/form/2026" replace />} />
        <Route path="/form/:season" element={<Form />} /> */}

        {/* 🎯 App.jsx मधील अपडेटेड राऊट्स */}
        {/* 1️⃣ जर कोणी फक्त साध्या '/form' वर गेला तर चालू वर्षाकडे पाठवा */}
              <Route 
                path="/form" 
                element={<Navigate to={`/form/${currentYear}`} replace />} 
              />

              {/* 2️⃣ Dynamic Competition ID किंवा Season चा सर्वसामान्य राऊट (उदा. COMP-2026-01 किंवा 2026) */}
              <Route path="/form/:compId" element={<Form />} />

        <Route path="/my-status" element={<MyTeamDashboard />} />
        <Route path="/login" element={<Login />} />

         {/* // Routes Inside App.jsx:*/}
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsOfService />} />
<Route path="/helpdesk" element={<Helpdesk />} />
        {/* 🔐 स्वतंत्र ॲडमिन पोर्टल */}
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

        {/* चुकीचा पथ असल्यास Home वर रीडायरेक्ट */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}