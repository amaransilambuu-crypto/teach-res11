import React, { useState } from 'react';
import { useInstitutionTheme } from '../context/ThemeContext.tsx';
import { hexToRgba } from '../utils/color.ts';
import {
  BookOpen,
  Phone,
  Copy,
  Check,
  MessageCircle,
  School,
  Sparkles,
  ShieldCheck,
  HardDrive,
  Laptop,
  CheckCircle2,
  Award,
  Code2,
  WifiOff,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const { theme, schoolName } = useInstitutionTheme();

  const primaryHex = theme.primary_color || '#1e3a8a';

  const developerPhone = '7603930445';
  const formattedPhone = '+91 76039 30445';
  const whatsappUrl = `https://wa.me/917603930445?text=${encodeURIComponent(
    'Hello Mr. P. Siva, I am contacting you regarding the Teacher Resource Hub application.'
  )}`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(developerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div id="about-view-container" className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* DEVELOPER SHOWCASE PANEL - Styled to match exact Midnight Blue Aesthetic */}
      <div
        id="about-hero-panel"
        className="relative rounded-3xl overflow-hidden shadow-2xl border p-6 sm:p-10 transition-all duration-300"
        style={{
          backgroundColor: '#050e21',
          borderColor: '#0e2246',
          boxShadow: '0 25px 50px -12px rgba(2, 6, 23, 0.75)',
        }}
      >
        {/* Subtle radial ambient glow matching the deep navy/cyan tone */}
        <div
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: 'rgba(2, 132, 199, 0.12)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: 'rgba(30, 58, 138, 0.15)' }}
        />

        <div className="relative z-10 space-y-6">
          {/* Top Header Row: DEVELOPED & MAINTAINED BY + Official Lead Developer */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#38bdf8]">
              <Code2 className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
              <span>DEVELOPED & MAINTAINED BY</span>
            </div>

            <div className="px-3.5 py-1 rounded-full bg-[#052922] border border-[#0d9488]/80 text-[#2dd4bf] text-xs font-semibold inline-flex items-center shadow-xs">
              <span>Official Lead Developer</span>
            </div>
          </div>

          {/* Profile Row: Book Squircle + Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-1">
            {/* Book Icon Squircle */}
            <div
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border transition-transform duration-200 hover:scale-105"
              style={{
                backgroundColor: '#183670',
                borderColor: '#2b54a3',
              }}
            >
              <BookOpen className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-xs" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Name & Verified Badge */}
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-3xl sm:text-4xl font-black text-white tracking-wide font-sans">
                  P. SIVA
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#092244] border border-[#0284c7] text-[#38bdf8] text-xs font-semibold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Verified Educator</span>
                </span>
              </div>

              {/* Academic Degree Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {['M.Sc.', 'B.Ed.', 'M.Phil.', 'MCA.'].map((deg) => (
                  <span
                    key={deg}
                    className="px-3.5 py-1 rounded-xl bg-[#0e1c36] border border-[#1e3357] text-white text-xs font-bold font-sans tracking-wide shadow-xs"
                  >
                    {deg}
                  </span>
                ))}
              </div>

              {/* Designation */}
              <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200 pt-0.5">
                <Award className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                <span>PG Computer Science Teacher</span>
              </div>

              {/* School */}
              <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
                <School className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                <span className="truncate">Govt Hr Sec School, Pannaipuram</span>
              </div>
            </div>
          </div>

          {/* Faint Horizontal Divider */}
          <div
            className="border-t my-6"
            style={{ borderColor: '#0e1d3b' }}
          />

          {/* Bottom Dock: Direct Cell Contact + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            {/* Phone Display */}
            <div className="flex items-center space-x-3.5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-300 flex-shrink-0 shadow-sm border"
                style={{
                  backgroundColor: '#0e1c36',
                  borderColor: '#1e3357',
                }}
              >
                <Phone className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  DIRECT CELL CONTACT
                </div>
                <a
                  href={`tel:${developerPhone}`}
                  className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-wider hover:text-[#38bdf8] transition-colors inline-block"
                >
                  {formattedPhone}
                </a>
              </div>
            </div>

            {/* Action Buttons: Copy Number + Chat on WhatsApp */}
            <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap">
              {/* Copy Phone Button */}
              <button
                type="button"
                id="about-copy-phone-btn"
                onClick={handleCopyPhone}
                className="px-5 py-3 rounded-2xl text-sm font-semibold inline-flex items-center space-x-2 transition-all border text-white active:scale-95 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: '#11213f',
                  borderColor: '#233c67',
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>

              {/* WhatsApp Direct Chat Button */}
              <a
                id="about-whatsapp-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-bold text-sm inline-flex items-center space-x-2.5 transition-all shadow-lg shadow-green-500/25 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORM ARCHITECTURE & CAPABILITIES PANEL */}
      <div
        id="about-capabilities-panel"
        className="bg-white rounded-3xl border p-6 sm:p-8 shadow-sm space-y-6 transition-all duration-300"
        style={{
          borderTopColor: primaryHex,
          borderTopWidth: '4px',
          borderColor: hexToRgba(primaryHex, 0.2),
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm transition-colors"
              style={{ backgroundColor: primaryHex }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Teacher Resource Hub
              </h3>
              <p className="text-xs text-slate-500">
                Enterprise Cloud Teaching Repository for Tamil Nadu Higher Secondary Schools
              </p>
            </div>
          </div>

          <span
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-2xs"
            style={{
              borderColor: hexToRgba(primaryHex, 0.35),
              color: primaryHex,
              backgroundColor: hexToRgba(primaryHex, 0.08),
            }}
          >
            {schoolName || 'Govt Hr Sec School, Pannaipuram'}
          </span>
        </div>

        {/* Highlights Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors space-y-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs font-bold text-xs"
              style={{
                backgroundColor: hexToRgba(primaryHex, 0.12),
                color: primaryHex,
              }}
            >
              <HardDrive className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900">5GB - 20GB Quota</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Generous cloud storage allocated per teacher for syllabi, video lectures, lesson plans, and model practical codes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors space-y-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs font-bold text-xs"
              style={{
                backgroundColor: hexToRgba(primaryHex, 0.12),
                color: primaryHex,
              }}
            >
              <Laptop className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Cross-Device Sync</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Seamlessly switch between school computer lab desktop workstations, tablets, and mobile smartphones on Android/iOS.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors space-y-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs font-bold text-xs"
              style={{
                backgroundColor: hexToRgba(primaryHex, 0.12),
                color: primaryHex,
              }}
            >
              <WifiOff className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Offline-First PWA</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Precached thumbnails and service worker caching ensure uninterrupted teaching even during network drops in classrooms.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-colors space-y-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs font-bold text-xs"
              style={{
                backgroundColor: hexToRgba(primaryHex, 0.12),
                color: primaryHex,
              }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Role-Based RBAC</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Complete administrator oversight, activity audit trails, granular sharing permissions, and isolated personal folders.
            </p>
          </div>
        </div>

        {/* Academic Details & Tech Specs Banner */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors"
          style={{
            backgroundColor: `${primaryHex}08`,
            borderColor: `${primaryHex}25`,
          }}
        >
          <div className="space-y-1">
            <div
              className="font-bold flex items-center space-x-1.5 text-sm"
              style={{ color: primaryHex }}
            >
              <span>Higher Secondary Computer Science Department</span>
            </div>
            <p className="text-slate-600 text-xs">
              Engineered and maintained by <strong>P. SIVA</strong>, Govt Hr Sec School, Pannaipuram.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-2xs font-mono text-slate-700 flex-shrink-0">
            <span className="px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs font-semibold">
              v2.4.0 Production
            </span>
            <span className="px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs font-semibold">
              React + TypeScript
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
