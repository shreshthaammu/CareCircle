import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  Heart,
  Sun,
  Moon,
  Eye,
  LogOut,
  Menu,
  X,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { session, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setPrefsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setPrefsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cycleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'high-contrast' : 'light');
  };

  const themeLabel =
    theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'High Contrast';

  if (!session) {
    return (
      <header className="bg-white/95 backdrop-blur-sm border-b border-sand-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-teal-700 font-display font-extrabold text-xl tracking-tight whitespace-nowrap shrink-0"
          >
            <Heart className="w-6 h-6 text-teal-600 fill-teal-600" />
            <span>CareCircle</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600" aria-label="Public Navigation">
            <Link
              to="/"
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                location.pathname === '/'
                  ? 'border-teal-600 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Overview
            </Link>
            <Link
              to="/create-circle"
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                location.pathname === '/create-circle'
                  ? 'border-teal-600 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Create Circle
            </Link>
            <Link
              to="/join"
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                location.pathname === '/join'
                  ? 'border-teal-600 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Join with Passcode
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={prefsRef}>
              <button
                type="button"
                onClick={() => setPrefsOpen(prev => !prev)}
                aria-label="Accessibility and language preferences"
                aria-expanded={prefsOpen}
                className="p-2 rounded-lg border border-sand-200 text-stone-700 hover:bg-sand-100 transition flex items-center gap-1.5 text-sm font-medium whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{themeLabel}</span>
              </button>

              {prefsOpen && (
                <div className="card absolute right-0 mt-2 w-60 bg-white border border-sand-200 rounded-xl shadow-elevated p-3 space-y-3 z-50">
                  <div>
                    <span className="text-xs font-semibold text-stone-500 block mb-1.5">Display Theme</span>
                    <div className="grid grid-cols-3 gap-1 bg-sand-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`min-h-0 py-1.5 px-2 rounded-md text-xs font-semibold transition ${
                          theme === 'light' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`min-h-0 py-1.5 px-2 rounded-md text-xs font-semibold transition ${
                          theme === 'dark' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('high-contrast')}
                        className={`min-h-0 py-1.5 px-2 rounded-md text-xs font-semibold transition ${
                          theme === 'high-contrast' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                        }`}
                      >
                        Contrast
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="public-lang-select" className="text-xs font-semibold text-stone-500 block mb-1.5">
                      Language
                    </label>
                    <select
                      id="public-lang-select"
                      value={language}
                      onChange={e => setLanguage(e.target.value as any)}
                      className="w-full rounded-lg border border-sand-300 px-2.5 py-1.5 text-sm font-medium"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/join"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const navItems = [
    { to: '/dashboard', label: t.navDashboard },
    { to: '/medications', label: t.navMedications },
    { to: '/appointments', label: t.navAppointments },
    { to: '/suggestions', label: t.navSuggestions },
    { to: '/emergency-card', label: t.navEmergencyCard },
    { to: '/settings', label: t.navSettings },
  ];

  const roleText =
    session.role === 'ELDER'
      ? t.roleElder
      : session.role === 'CARETAKER'
      ? t.roleCaretaker
      : t.roleFamily;

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-sand-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 text-teal-700 font-display font-extrabold text-xl tracking-tight whitespace-nowrap shrink-0"
        >
          <Heart className="w-6 h-6 text-teal-600 fill-teal-600" />
          <span>CareCircle</span>
        </Link>

        {/* Zone 2: Clean single-line navigation */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-stone-600 overflow-x-auto" aria-label="Main Navigation">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  active
                    ? 'border-teal-600 text-stone-900 font-semibold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Elder View primary action + compact utilities */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/elder"
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              location.pathname === '/elder'
                ? 'bg-accent-600 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t.navElderMode}</span>
          </Link>

          {/* Preferences & Account Popover */}
          <div className="relative" ref={prefsRef}>
            <button
              type="button"
              onClick={() => setPrefsOpen(prev => !prev)}
              aria-label="Account and display settings"
              aria-expanded={prefsOpen}
              className="p-2 rounded-xl border border-sand-200 hover:bg-sand-100 text-stone-700 transition flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-600" />}
              {theme === 'dark' && <Moon className="w-4 h-4 text-teal-400" />}
              {theme === 'high-contrast' && <Eye className="w-4 h-4 text-accent-500" />}
              <span className="hidden sm:inline font-mono">{session.circleCode}</span>
            </button>

            {prefsOpen && (
              <div className="card absolute right-0 mt-2 w-72 bg-white border border-sand-200 rounded-2xl shadow-elevated p-4 space-y-4 z-50">
                <div className="pb-3 border-b border-sand-200">
                  <p className="text-sm font-bold text-stone-900 truncate">{session.elderName}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {roleText} <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono font-semibold text-teal-700">{session.circleCode}</span>
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-stone-500 block mb-1.5">Theme</span>
                  <button
                    type="button"
                    onClick={cycleTheme}
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 hover:bg-sand-100 text-sm font-semibold text-stone-800 flex items-center justify-between transition"
                  >
                    <span>Mode: {themeLabel}</span>
                    {theme === 'light' && <Sun className="w-4 h-4 text-amber-600" />}
                    {theme === 'dark' && <Moon className="w-4 h-4 text-teal-400" />}
                    {theme === 'high-contrast' && <Eye className="w-4 h-4 text-accent-500" />}
                  </button>
                </div>

                <div>
                  <label htmlFor="auth-lang-select" className="text-xs font-semibold text-stone-500 block mb-1.5">
                    Language
                  </label>
                  <select
                    id="auth-lang-select"
                    value={language}
                    onChange={e => setLanguage(e.target.value as any)}
                    className="w-full rounded-xl border border-sand-200 px-3 py-2 text-sm font-medium"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.navLogout}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-xl border border-sand-200 hover:bg-sand-100 text-stone-700 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <nav
          className="lg:hidden border-t border-sand-200 bg-white px-4 py-3 space-y-1"
          aria-label="Mobile Navigation"
        >
          <div className="px-3 py-2 text-xs text-stone-500 border-b border-sand-100 mb-2">
            {session.elderName} <span aria-hidden="true">·</span> {roleText} <span aria-hidden="true">·</span>{' '}
            <span className="font-mono font-semibold text-teal-700">{session.circleCode}</span>
          </div>
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  active ? 'bg-teal-50 text-teal-800' : 'text-stone-700 hover:bg-sand-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};
