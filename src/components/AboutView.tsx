import React, { useState } from 'react';
import {
  GraduationCap,
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
  Smartphone,
  ExternalLink,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const developerPhone = '7603930445';
  const whatsappUrl = `https://wa.me/917603930445?text=${encodeURIComponent(
    'Hello Mr. P. Siva, I am contacting you regarding the Teacher Resource Hub application.'
  )}`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(developerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div id="about-view-container" className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* DEVELOPER INFO HERO CARD (Exact Match to Design Specification) */}
      <div className="bg-[#09122c] rounded-3xl p-6 sm:p-10 border border-[#162a5b] shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Yellow-Amber Squircle with Mortarboard / Graduation Cap */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 transition-transform hover:scale-105 duration-200">
            <GraduationCap className="w-10 h-10 sm:w-11 sm:h-11 text-slate-950 fill-slate-950" />
          </div>

          {/* Golden Serif Heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-400 tracking-wide text-center mb-8 font-serif">
            App Developer Info
          </h2>

          {/* Main Inner Developer Card */}
          <div className="w-full max-w-xl bg-[#0d1d45]/90 rounded-2xl border border-blue-500/25 p-6 sm:p-7 shadow-xl backdrop-blur-xs">
            {/* Tagline */}
            <div className="text-[11px] font-black uppercase tracking-widest text-sky-400/90 mb-4">
              DEVELOPED BY
            </div>

            {/* Profile Row */}
            <div className="flex items-start space-x-4">
              {/* Book Icon Badge */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-[#091536] border border-blue-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
                <BookOpen className="w-7 h-7 text-amber-400" />
              </div>

              {/* Profile Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  P. SIVA
                </h3>
                <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5 tracking-wide">
                  M.Sc., B.Ed., M.Phil., MCA.
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1">
                  PG Computer Science Teacher
                </p>

                {/* School Row */}
                <div className="flex items-center space-x-2 mt-2 text-xs sm:text-sm font-semibold text-white">
                  <School className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="truncate">Govt Hr Sec School, Pannaipuram</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-500/20 my-5" />

            {/* Bottom Contact Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Phone info */}
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-[#091536] border border-blue-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Phone className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-400/90">
                    CELL NO
                  </div>
                  <a
                    href={`tel:${developerPhone}`}
                    className="text-base sm:text-lg font-bold text-white font-mono tracking-wider hover:text-amber-300 transition-colors"
                  >
                    {developerPhone}
                  </a>
                </div>
              </div>

              {/* Action Buttons: Copy & WhatsApp */}
              <div className="flex items-center space-x-2.5">
                {/* Copy Button */}
                <button
                  type="button"
                  id="about-copy-phone-btn"
                  onClick={handleCopyPhone}
                  className="px-3.5 py-2 rounded-xl bg-[#142654] hover:bg-[#1c3575] text-slate-200 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors border border-blue-500/30 active:scale-95 shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* WhatsApp Button */}
                <a
                  id="about-whatsapp-btn"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-[#059669]" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APPLICATION SPECIFICATIONS & ARCHITECTURE OVERVIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              About Teacher Resource Hub
            </h3>
            <p className="text-xs text-slate-400">
              Enterprise Cloud Teaching Repository for Tamil Nadu Higher Secondary Schools
            </p>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800">5GB+ Free Cloud Quota</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Generous cloud storage allocated per teacher for syllabi, video lectures, lesson plans, and model practical codes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800">Cross-Device Access</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Seamlessly switch between school computer lab desktop workstations, tablets, and mobile smartphones on Android/iOS.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800">Role-Based Security</h4>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Complete administrator oversight, activity audit trails, granular sharing permissions, and isolated personal folders.
            </p>
          </div>
        </div>

        {/* Academic Details & Tech Specs */}
        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-indigo-900 flex items-center space-x-1.5">
              <span>Higher Secondary Computer Science Department</span>
            </div>
            <p className="text-indigo-700/80 text-2xs">
              Developed and maintained by <strong>P. SIVA</strong>, Govt Hr Sec School, Pannaipuram.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-2xs font-mono text-indigo-800 flex-shrink-0">
            <span className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 shadow-2xs">
              Version 2.4.0
            </span>
            <span className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 shadow-2xs">
              React + TypeScript
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
