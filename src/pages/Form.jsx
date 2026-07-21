import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegistrationForm from '../components/RegistrationForm';

export default function Form() {
  const { season = "2026" } = useParams();

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white">
      <Navbar />
      <div className="flex-1 py-8">
        <RegistrationForm season={season} />
      </div>
      <Footer />
    </div>
  );
}