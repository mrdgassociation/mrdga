// 🎯 SECTION: Form Wrapper
import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegistrationForm from '../components/RegistrationForm';

export default function Form() {
  const { compId } = useParams();
  console.log("📌 [FORM WRAPPER] URL Parameter compId:", compId);

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white">
      <Navbar />
      <div className="flex-1 py-8">
        <RegistrationForm competitionId={compId} />
      </div>
      <Footer />
    </div>
  );
}