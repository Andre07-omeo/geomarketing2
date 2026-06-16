'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Mail, Facebook, Twitter, Linkedin, Instagram,
  ArrowUp, ShieldCheck, Clock, Building2, Users, FileText,
  ChevronRight, Heart, Code, Github, Coffee, Zap, Globe,
  Award, TrendingUp, Calendar, CreditCard
} from 'lucide-react';

const Footer = () => {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Liens rapides
  const quickLinks = [
    { name: 'Accueil', href: '/', icon: <TrendingUp size={14} /> },
    { name: 'Carte', href: '/carte', icon: <MapPin size={14} /> },
    { name: 'Rapports', href: '/rapports', icon: <FileText size={14} /> },
    { name: 'Site Officiel', href: 'https://www.dispromalt.cd', icon: <Globe size={14} />, external: true },
  ];

  // Informations de la société
  const companyInfo = {
    name: 'GDP Dispromalt',
    fullName: 'Gestion Digitale des Panneaux Publicitaires',
    email: 'contact@dispromalt.cd',
    phone: '+243 123 456 789',
    address: 'Kinshasa/Gombe, RDC',
    website: 'https://www.dispromalt.cd',
    since: 2020,
  };

  // Informations du développeur
  const developerInfo = {
    name: 'Omeonga Omakinda Andre',
    role: 'Développeur Full Stack',
    email: 'omeongaandre2@gmail.com',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com/company/dispromalt',
    version: '1.0.0',
  };

  // Services
  const services = [
    { name: 'Gestion de panneaux', icon: <Building2 size={12} /> },
    { name: 'Suivi des réservations', icon: <Calendar size={12} /> },
    { name: 'Facturation digitale', icon: <CreditCard size={12} /> },
    { name: 'Rapports statistiques', icon: <TrendingUp size={12} /> },
  ];

  const socialLinks = [
    { icon: <Facebook size={16} />, href: 'https://facebook.com', color: '#1877f2' },
    { icon: <Twitter size={16} />, href: 'https://twitter.com', color: '#1da1f2' },
    { icon: <Linkedin size={16} />, href: 'https://linkedin.com', color: '#0077b5' },
    { icon: <Instagram size={16} />, href: 'https://instagram.com', color: '#e4405f' },
    { icon: <Github size={16} />, href: 'https://github.com', color: '#867e7e' },
  ];

  return (
    <footer className="relative mt-auto bg-gradient-to-b from-gray-50 via-white to-gray-100 border-t border-gray-200">
      {/* Ligne décorative en haut */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      {/* Effet de fond subtil (gardé très léger) */}
      <div className="absolute inset-0 bg-[url('/fond.jpg')] bg-cover bg-center opacity-5 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Grille principale */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-12 lg:py-16">

          {/* Colonne 1 - Société */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src="/icon-192x192.png"
                alt="GDP Dispromalt"
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
              />
            </div>

            <p className="text-gray-600 text-xs leading-relaxed">
              {companyInfo.fullName}
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-gray-600 text-xs">
                <MapPin size={12} className="text-amber-600 shrink-0" />
                <span>{companyInfo.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-xs">
                <Phone size={12} className="text-amber-600 shrink-0" />
                <a href={`tel:${companyInfo.phone}`} className="hover:text-amber-600 transition">
                  {companyInfo.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-xs">
                <Mail size={12} className="text-amber-600 shrink-0" />
                <a href={`mailto:${companyInfo.email}`} className="hover:text-amber-600 transition">
                  {companyInfo.email}
                </a>
              </div>
            </div>

            {/* Badge années d'expérience */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full border border-amber-300">
              <Award size={12} className="text-amber-600" />
              <span className="text-[9px] text-amber-700 font-bold">
                Depuis {companyInfo.since}
              </span>
            </div>
          </div>

          {/* Colonne 2 - Liens rapides */}
          <div className="space-y-4">
            <h4 className="text-amber-600 text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              Liens rapides
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-all duration-300 text-xs`}
                    >
                      <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                      {link.icon}
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className={`group flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-all duration-300 text-xs ${pathname === link.href ? 'text-amber-600' : ''
                        }`}
                    >
                      <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                      {link.icon}
                      {link.name}
                    </Link>
                  )}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Colonne 3 - Services */}
          <div className="space-y-4">
            <h4 className="text-amber-600 text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              Nos services
            </h4>
            <ul className="space-y-2">
              {services.map((service, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 + 0.2 }}
                  className="flex items-center gap-2 text-gray-600 text-xs"
                >
                  <span className="text-amber-600">{service.icon}</span>
                  {service.name}
                </motion.li>
              ))}
            </ul>

            {/* Sécurité */}
            <div className="pt-4">
              <div className="flex items-center gap-2 text-[9px] text-gray-500">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Paiements sécurisés</span>
              </div>
            </div>
          </div>

          {/* Colonne 4 - Développeur */}
          <div className="space-y-4">
            <h4 className="text-amber-600 text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              Développeur
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border border-amber-300">
                  <Code size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-gray-800 text-xs font-bold">{developerInfo.name}</p>
                  <p className="text-gray-500 text-[9px]">{developerInfo.role}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <a
                  href={`mailto:${developerInfo.email}`}
                  className="flex items-center gap-2 text-gray-600 hover:text-amber-600 text-[10px] transition"
                >
                  <Mail size={10} />
                  {developerInfo.email}
                </a>
                <a
                  href={developerInfo.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-amber-600 text-[10px] transition"
                >
                  <Github size={10} />
                  GitHub
                </a>
                <a
                  href={developerInfo.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-amber-600 text-[10px] transition"
                >
                  <Linkedin size={10} />
                  LinkedIn
                </a>
              </div>

              {/* Version */}
              <div className="pt-2 flex items-center gap-2">
                <div className="px-2 py-1 bg-gray-100 rounded-md">
                  <span className="text-[8px] text-gray-500">v{developerInfo.version}</span>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-gray-500">
                  <Coffee size={8} />
                  <span>Built with love</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bas du footer */}
        <div className="py-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

            {/* Copyright */}
            <div className="flex items-center gap-1 text-gray-500 text-[9px]">
              <span>© {currentYear} {companyInfo.name}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-[8px]">Tous droits réservés</span>
            </div>

            {/* Réseaux sociaux */}
            <div className="flex gap-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110"
                  style={{ color: social.color }}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Liens légaux */}
            <div className="flex gap-4">
              <Link href="/mentions-legales" className="text-gray-500 hover:text-amber-600 text-[8px] uppercase tracking-wider transition">
                Mentions
              </Link>
              <Link href="/confidentialite" className="text-gray-500 hover:text-amber-600 text-[8px] uppercase tracking-wider transition">
                Confidentialité
              </Link>
              <Link href="/cgu" className="text-gray-500 hover:text-amber-600 text-[8px] uppercase tracking-wider transition">
                CGU
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton retour en haut */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-white shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default Footer;