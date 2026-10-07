import React, { useState, useEffect } from 'react';
import { useInstitutionTheme } from '../context/ThemeContext.tsx';
import {
  INSTITUTION_COLOR_PRESETS,
  SchoolPalette,
  isDarkColor,
  getContrastRatio,
  getContrastTextColor,
} from '../utils/color.ts';
import {
  Palette,
  Check,
  RotateCcw,
  School,
  Sparkles,
  ShieldCheck,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ThemeSelectorProps {
  onSaved?: () => void;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onSaved, compact = false }) => {
  const {
    theme,
    isDarkBrand,
    updateTheme,
    resetTheme,
    isSaving,
    error: contextError,
  } = useInstitutionTheme();

  // Local draft state for smooth editing and live preview
  const [selectedColor, setSelectedColor] = useState<string>(theme.primary_color);
  const [schoolNameInput, setSchoolNameInput] = useState<string>(theme.school_name);
  const [customHexInput, setCustomHexInput] = useState<string>(theme.primary_color);
  const [hexError, setHexError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync with context if updated externally (e.g. other user changed it)
  useEffect(() => {
    setSelectedColor(theme.primary_color);
    setCustomHexInput(theme.primary_color);
    setSchoolNameInput(theme.school_name);
  }, [theme.primary_color, theme.school_name]);

  const handlePresetSelect = (palette: SchoolPalette) => {
    setSelectedColor(palette.primary);
    setCustomHexInput(palette.primary);
    setHexError(null);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) {
      val = '#' + val;
    }
    setCustomHexInput(val);

    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
      setHexError(null);
      setSelectedColor(val);
    } else {
      setHexError('Please enter a valid hex color code (e.g., #1e3a8a or #4f46e5)');
    }
  };

  const handleNativeColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedColor(val);
    setCustomHexInput(val);
    setHexError(null);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hexError) return;

    try {
      await updateTheme({
        primary_color: selectedColor,
        school_name: schoolNameInput.trim() || 'Govt Hr Sec School, Pannaipuram',
      });
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      // handled in context
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('Reset institution brand theme to default Academic Navy (#1e3a8a)?')) {
      try {
        const def = await resetTheme();
        setSelectedColor(def.primary_color);
        setCustomHexInput(def.primary_color);
        setSchoolNameInput(def.school_name);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch {
        // handled in context
      }
    }
  };

  // Preview computations
  const previewIsDark = isDarkColor(selectedColor);
  const previewContrastText = getContrastTextColor(selectedColor);
  const previewContrastRatio = getContrastRatio(selectedColor, previewContrastText);
  const hasChanges =
    selectedColor.toLowerCase() !== theme.primary_color.toLowerCase() ||
    schoolNameInput.trim() !== theme.school_name.trim();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 transition-colors duration-300"
              style={{ backgroundColor: selectedColor }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Institution Brand & Theme
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  School-Wide
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Customize your institution's primary brand color. The selected color dynamically
                applies to the <strong>Dashboard Hero</strong>, <strong>About Developer Panel</strong>, <strong>Navbar</strong>, and <strong>Sidebar</strong> for
                all teachers and administrators in this school.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              title="Reset to default brand theme"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Reset Default
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Brand theme successfully updated!</strong> The primary color has been saved and
            dynamically applied to the Navbar and Sidebar for all users in{' '}
            <strong>{schoolNameInput || theme.school_name}</strong>.
          </span>
        </div>
      )}

      {contextError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{contextError}</span>
        </div>
      )}

      {/* Institution Name Input */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
          <School className="w-4 h-4 text-slate-500" />
          Institution / School Name
        </label>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={schoolNameInput}
              onChange={(e) => setSchoolNameInput(e.target.value)}
              placeholder="e.g. Govt Hr Sec School, Pannaipuram"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-900"
            />
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Displayed on school portal & mobile apps
          </span>
        </div>
      </div>

      {/* Presets & Custom Pickers */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Institutional Brand Palettes
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Click to select or preview
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Recognized educational palettes crafted with balanced contrast for desktop monitors and
            mobile screens.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {INSTITUTION_COLOR_PRESETS.map((palette) => {
              const isSelected = selectedColor.toLowerCase() === palette.primary.toLowerCase();
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handlePresetSelect(palette)}
                  className={`group relative p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-xs flex items-center justify-center text-white transition-transform group-hover:scale-105"
                      style={{ backgroundColor: palette.primary }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{palette.primary}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-slate-800 leading-tight">
                      {palette.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                      {palette.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hex & Color Wheel */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Custom Brand Hex Color
          </h4>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              {/* Native color picker trigger */}
              <div className="relative">
                <input
                  type="color"
                  id="native-brand-color-picker"
                  value={selectedColor.length === 7 ? selectedColor : '#1e3a8a'}
                  onChange={handleNativeColorPick}
                  className="w-10 h-10 p-0 rounded-xl border-2 border-slate-200 cursor-pointer overflow-hidden shadow-xs"
                />
              </div>

              {/* Text Hex input */}
              <div className="relative w-36">
                <input
                  type="text"
                  value={customHexInput}
                  onChange={handleCustomHexChange}
                  maxLength={7}
                  placeholder="#1e3a8a"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border outline-none ${
                    hexError
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Contrast compliance badge */}
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 font-medium text-[11px] text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Contrast: {previewContrastRatio}:1 (WCAG AA {previewContrastRatio >= 4.5 ? '✓ Pass' : '⚠️ Low'})
              </span>
              <span className="text-[11px] text-slate-400">
                Text on Navbar/Sidebar: <strong className="text-slate-700">{previewIsDark ? 'White' : 'Dark'}</strong>
              </span>
            </div>
          </div>

          {hexError && (
            <p className="text-xs text-red-600 mt-1.5 font-medium">{hexError}</p>
          )}
        </div>
      </div>

      {/* Live Miniature Interactive Preview */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            Live Preview (Dynamic Navbar & Sidebar Layout)
          </h4>
          <span className="text-[11px] text-slate-400">
            Real-time preview of {schoolNameInput || 'School'} UI
          </span>
        </div>

        {/* Mock App Shell Frame */}
        <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs bg-slate-100 text-xs">
          {/* Mock Navbar */}
          <div
            className="px-4 py-2.5 flex items-center justify-between transition-colors duration-200 border-b border-black/10"
            style={{ backgroundColor: selectedColor }}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: previewIsDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  color: previewContrastText,
                }}
              >
                T
              </div>
              <div>
                <span
                  className="font-bold text-xs block leading-tight truncate max-w-[180px] sm:max-w-[280px]"
                  style={{ color: previewContrastText }}
                >
                  {schoolNameInput || 'Govt Hr Sec School, Pannaipuram'}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider block opacity-75"
                  style={{ color: previewContrastText }}
                >
                  Teacher Resource Hub
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className="hidden sm:block px-2.5 py-1 rounded-md text-[10px] truncate max-w-[120px]"
                style={{
                  backgroundColor: previewIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                  color: previewContrastText,
                }}
              >
                🔍 Search resources...
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: previewIsDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  color: previewContrastText,
                }}
              >
                T
              </div>
            </div>
          </div>

          {/* Mock Body: Sidebar + Main Content */}
          <div className="flex h-40">
            {/* Mock Sidebar */}
            <div
              className="w-36 sm:w-44 p-2.5 space-y-1.5 transition-colors duration-200 border-r border-black/10 flex-shrink-0 flex flex-col justify-between"
              style={{ backgroundColor: selectedColor }}
            >
              <div className="space-y-1">
                {/* Active Tab */}
                <div
                  className="px-2 py-1 rounded-md text-[10px] font-bold flex items-center space-x-1.5"
                  style={{
                    backgroundColor: previewIsDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
                    color: previewContrastText,
                  }}
                >
                  <span>📊</span>
                  <span>Dashboard</span>
                </div>
                {/* Inactive Tabs */}
                <div
                  className="px-2 py-1 rounded-md text-[10px] flex items-center space-x-1.5 opacity-80"
                  style={{ color: previewContrastText }}
                >
                  <span>📁</span>
                  <span>My Resources</span>
                </div>
                <div
                  className="px-2 py-1 rounded-md text-[10px] flex items-center space-x-1.5 opacity-80"
                  style={{ color: previewContrastText }}
                >
                  <span>🗂️</span>
                  <span>Folders</span>
                </div>
                <div
                  className="px-2 py-1 rounded-md text-[10px] flex items-center space-x-1.5 opacity-80"
                  style={{ color: previewContrastText }}
                >
                  <span>🎬</span>
                  <span>Videos</span>
                </div>
              </div>

              {/* Mock Storage Mini Card */}
              <div
                className="p-1.5 rounded-md text-[9px]"
                style={{
                  backgroundColor: previewIsDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
                  color: previewContrastText,
                }}
              >
                <div className="flex justify-between font-semibold">
                  <span>Storage</span>
                  <span>45%</span>
                </div>
                <div className="w-full bg-white/20 h-1 rounded-full mt-0.5 overflow-hidden">
                  <div className="bg-white h-full w-[45%]" />
                </div>
              </div>
            </div>

            {/* Mock Main Content Area with Dynamic Dashboard Hero Banner */}
            <div className="flex-1 p-2.5 bg-slate-50 overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                {/* Mini Dashboard Welcome Hero Banner */}
                <div
                  className="rounded-lg p-2.5 transition-colors duration-200 shadow-2xs"
                  style={{
                    backgroundColor: selectedColor,
                    color: previewContrastText,
                  }}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1"
                      style={{
                        backgroundColor: previewIsDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
                        color: previewContrastText,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Cloud Sync
                    </span>
                    <button
                      type="button"
                      className="px-2 py-0.5 rounded bg-white text-[8px] font-bold shadow-2xs"
                      style={{ color: previewIsDark ? selectedColor : '#0f172a' }}
                    >
                      + Upload
                    </button>
                  </div>
                  <div className="text-[10px] font-extrabold truncate" style={{ color: previewContrastText }}>
                    Welcome back, Teacher!
                  </div>
                  <div className="text-[8px] opacity-80 truncate" style={{ color: previewContrastText }}>
                    {schoolNameInput || 'Govt Hr Sec School, Pannaipuram'} central cloud
                  </div>
                </div>

                {/* Resource Item preview */}
                <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-[9px] truncate">
                    📄 Class12_Practical_Exercises.pdf
                  </span>
                  <span className="text-slate-400 text-[8px] flex-shrink-0">3.4 MB</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 text-right">
                Dashboard, About panel & Shell adapt dynamically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-500">
          {hasChanges ? (
            <span className="text-amber-600 font-medium">● Unsaved theme changes</span>
          ) : (
            <span className="text-slate-400">✓ Current theme synchronized</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveTheme}
          disabled={isSaving || Boolean(hexError)}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isSaving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Saving School Theme...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Save & Apply School Theme
            </>
          )}
        </button>
      </div>
    </div>
  );
};
