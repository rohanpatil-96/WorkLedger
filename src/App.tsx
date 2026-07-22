/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import { Preferences } from '@capacitor/preferences';
import { DayEntry, WorkCategory, UserSettings } from './types';
import { generateSeedData } from './utils/calculations';
import { getDanishHolidays } from './utils/holidays';
import { generateDefaultCycles } from './utils/vacationBank';

// Subcomponents
import QuickEntry from './components/QuickEntry';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import EntriesView from './components/EntriesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import PitchView from './components/PitchView';
import VacationView from './components/VacationView';

// Icons
import {
  Clock,
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Sliders,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  Briefcase,
  Sparkles,
  Palmtree
} from 'lucide-react';

export function WorkLedgerLogo({ className = "w-5 h-5" }: { className?: string }) {
  const uniqueId = useId();
  const safeId = `logoGrad-${uniqueId.replace(/:/g, '')}`;
  const bgId = `logoBgGrad-${uniqueId.replace(/:/g, '')}`;
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Premium Warm Caramel Gold Gradient for the Monogram W */}
        <linearGradient id={safeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A27B5B" />
          <stop offset="50%" stopColor="#C49B7C" />
          <stop offset="100%" stopColor="#856041" />
        </linearGradient>
        
        {/* Deep Charcoal-Slate Gradient for the logo container */}
        <linearGradient id={bgId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2C3639" />
          <stop offset="100%" stopColor="#1E2426" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container representing the App Icon boundary */}
      <rect 
        x="1.5" 
        y="1.5" 
        width="21" 
        height="21" 
        rx="5" 
        fill={`url(#${bgId})`} 
        stroke="#A27B5B" 
        strokeWidth="1" 
        strokeOpacity="0.45" 
      />

      {/* Geometric Monogram 'W' */}
      <path 
        d="M6 7.5L9.5 16.5L12 11.5L14.5 16.5L18 7.5" 
        stroke={`url(#${safeId})`} 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Sleek Clock Hand / Ledger Line */}
      <path 
        d="M9 13.5L15 9" 
        stroke="#E2D4C9" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        className="opacity-90"
      />

      {/* Center clock pin */}
      <circle cx="12" cy="11.5" r="1.1" fill="#E2D4C9" />
    </svg>
  );
}

const ENTRIES_CACHE_KEY = 'danish_tracker_workday_entries';
const SETTINGS_CACHE_KEY = 'danish_tracker_workday_settings';
const VACATION_CYCLES_CACHE_KEY = 'danish_tracker_vacation_cycles';

export default function App() {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'calendar' | 'entries' | 'reports' | 'vacation' | 'settings' | 'pitch'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Vacation Bank onboarding states
  const [showVacationOnboardingPrompt, setShowVacationOnboardingPrompt] = useState(false);
  const [onboardingDays, setOnboardingDays] = useState(25);

  // Debug Mode state
  const [debugTaps, setDebugTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDebugUnlocked, setIsDebugUnlocked] = useState(false);
  const [showDebugToast, setShowDebugToast] = useState(false);

  const handleDebugTap = () => {
    if (isDebugUnlocked) return;
    const now = Date.now();
    if (now - lastTapTime > 3000) {
      setDebugTaps(1);
      setLastTapTime(now);
    } else {
      const nextTaps = debugTaps + 1;
      setLastTapTime(now);
      setDebugTaps(nextTaps);
      if (nextTaps >= 5) {
        setIsDebugUnlocked(true);
        setShowDebugToast(true);
        setTimeout(() => setShowDebugToast(false), 4000);
      }
    }
  };

  // First boot state populating
  useEffect(() => {
    const loadCachedData = async () => {
      // 1. Load or default settings
      const { value: cachedSettings } = await Preferences.get({ key: SETTINGS_CACHE_KEY });
      let finalSettings: UserSettings;

      if (cachedSettings) {
        try {
          finalSettings = JSON.parse(cachedSettings);
        } catch (err) {
          finalSettings = getDefaultSettings();
        }
      } else {
        finalSettings = getDefaultSettings();
      }

      // 2. Load or seed entries
      const { value: cachedEntries } = await Preferences.get({ key: ENTRIES_CACHE_KEY });
      let finalEntries: DayEntry[] = [];

      if (cachedEntries) {
        try {
          finalEntries = JSON.parse(cachedEntries);
        } catch (err) {
          finalEntries = [];
        }
      } else {
        // First boot defaults to an empty list
        finalEntries = [];
      }

      setSettings(finalSettings);
      setEntries(finalEntries);

      // Check if vacation bank is configured. If not, trigger onboarding
      if (finalSettings.vacationYearlyEntitlementDays === undefined) {
        setShowVacationOnboardingPrompt(true);
      }

      // On first load, if userName & activeCompany is empty, automatically navigate to Settings
      if (!finalSettings.userName && !finalSettings.activeCompany) {
        setActiveTab('settings');
      }

      // Save states if empty
      if (!cachedSettings) {
        await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(finalSettings) });
      }
      if (!cachedEntries) {
        await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(finalEntries) });
      }
    };

    loadCachedData();
  }, []);

  const handleCompleteVacationOnboarding = async () => {
    if (!settings) return;
    const stdHours = settings.standardWorkdayHours || 7.4;
    const defaultFeriefridageHours = Math.round((stdHours / 7.4) * 37 * 10) / 10;
    const generatedCycles = generateDefaultCycles(new Date().getFullYear(), onboardingDays);

    const updatedSettings: UserSettings = {
      ...settings,
      vacationYearlyEntitlementDays: onboardingDays,
      vacationFeriefridageHours: defaultFeriefridageHours,
      vacationCycles: generatedCycles
    };

    setSettings(updatedSettings);
    setShowVacationOnboardingPrompt(false);

    await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(updatedSettings) });
    await Preferences.set({ key: VACATION_CYCLES_CACHE_KEY, value: JSON.stringify(generatedCycles) });
  };

  // Enforce the unified premium color theme across all devices
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  const getDefaultSettings = (): UserSettings => {
    const defaultHolidays = getDanishHolidays(2026);
    return {
      standardWorkdayHours: 7.4,
      roundTripDistanceKm: '',
      userName: '',
      userEmail: '',
      activeCompany: '',
      companies: [],
      theme: 'system',
      taxRates: [
        { year: 2026, thresholdKm: 24, rate1: 2.28, rate2: 1.14, limitKm: 120 },
        { year: 2025, thresholdKm: 24, rate1: 2.23, rate2: 1.12, limitKm: 120 }
      ],
      categoryColors: {
        [WorkCategory.Office]: 'bg-brand-blue text-white',
        [WorkCategory.WFH]: 'bg-teal-600 text-white',
        [WorkCategory.Holiday]: 'bg-red-500 text-white',
        [WorkCategory.Vacation]: 'bg-brand-green text-white',
        [WorkCategory.Sick]: 'bg-brand-peach text-white/95',
        [WorkCategory.UnpaidFerie]: 'bg-slate-450 text-white',
        [WorkCategory.OtherOffice]: 'bg-indigo-500 text-white'
      } as any,
      holidays: defaultHolidays,
      overtimeCreditRules: {
        [WorkCategory.Office]: 'earned',
        [WorkCategory.WFH]: 'earned',
        [WorkCategory.OtherOffice]: 'earned',
        [WorkCategory.Holiday]: 'standard',
        [WorkCategory.Vacation]: 'standard',
        [WorkCategory.Sick]: 'standard',
        [WorkCategory.UnpaidFerie]: 'zero'
      },
      enableManualOverride: true,
      preferredYearView: 2026,
      differentOfficeLocations: [],
      defaultOfficeLocationName: ''
    };
  };

  // --- COMPONENT ACTION DISPATCHERS ---

  const handleSaveEntry = async (updatedEntry: DayEntry) => {
    const existingIdx = entries.findIndex((e) => e.date === updatedEntry.date);
    let nextEntries = [...entries];
    if (existingIdx >= 0) {
      nextEntries[existingIdx] = updatedEntry;
    } else {
      nextEntries.push(updatedEntry);
    }
    nextEntries.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(nextEntries);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(nextEntries) });
  };

  const handleBulkSaveEntries = async (bulkList: DayEntry[]) => {
    let nextEntries = [...entries];
    bulkList.forEach((newE) => {
      const idx = nextEntries.findIndex((e) => e.date === newE.date);
      if (idx >= 0) {
        nextEntries[idx] = newE; // overwrite duplicate
      } else {
        nextEntries.push(newE);
      }
    });
    nextEntries.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(nextEntries);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(nextEntries) });
  };

  const handleDeleteEntry = async (dateToDelete: string) => {
    const filtered = entries.filter((e) => e.date !== dateToDelete);
    setEntries(filtered);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(filtered) });
  };

  const handleUpdateSettings = async (updatedSettings: UserSettings) => {
    setSettings(updatedSettings);
    await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(updatedSettings) });
    if (updatedSettings.vacationCycles) {
      await Preferences.set({ key: VACATION_CYCLES_CACHE_KEY, value: JSON.stringify(updatedSettings.vacationCycles) });
    }
  };

  const handleClearAndReseed = async () => {
    if (!settings) return;

    // Fictional Danish companies
    const companyPool = [
      "Nordic Tech Solutions ApS",
      "Copenhagen Logistics A/S",
      "Aarhus Digital Group",
      "Odense Marine Systems",
      "Baltic Software House",
      "Danish Wind Innovations",
      "Kattegat Consulting",
      "Zealand Cyber Security",
      "Jutland Robotics ApS"
    ];

    // Placeholder user profiles
    const profilePool = [
      { name: "Mads Hansen", email: "mads.hansen@demo-company.dk" },
      { name: "Freja Nielsen", email: "freja.nielsen@demo-firm.dk" },
      { name: "Lars Jensen", email: "lars.jensen@test-enterprise.dk" },
      { name: "Astrid Møller", email: "astrid.moller@demo-corp.dk" },
      { name: "Mikkel Poulsen", email: "mikkel.poulsen@demo-solutions.dk" },
      { name: "Sofie Petersen", email: "sofie.petersen@sandbox-mail.dk" }
    ];

    // Danish office cities
    const cityPool = ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg"];

    const randomCompany = companyPool[Math.floor(Math.random() * companyPool.length)];
    const randomProfile = profilePool[Math.floor(Math.random() * profilePool.length)];
    const randomCity = cityPool[Math.floor(Math.random() * cityPool.length)];
    const randomCommute = Math.floor(Math.random() * 71) + 10; // 10 to 80 km

    const nextSettings: UserSettings = {
      ...settings,
      companies: [randomCompany],
      activeCompany: randomCompany,
      userName: randomProfile.name,
      userEmail: randomProfile.email,
      defaultOfficeLocationName: randomCity,
      roundTripDistanceKm: randomCommute
    };

    const synthetic2026 = generateSeedData(settings.standardWorkdayHours);
    setSettings(nextSettings);
    setEntries(synthetic2026);
    setActiveTab('home');

    await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(nextSettings) });
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(synthetic2026) });
  };

  const handleEraseAllEntries = async () => {
    setEntries([]);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify([]) });
  };

  // Render Loader if first-time load pending
  if (!settings) {
    return (
      <div className="min-h-screen bg-brand-bg text-slate-800 flex items-center justify-center p-6 font-sans">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-semibold tracking-wide">Initialising WorkLedger data...</p>
        </div>
      </div>
    );
  }

  // Active view content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <QuickEntry
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onBulkSaveEntries={handleBulkSaveEntries}
          />
        );
      case 'dashboard':
        return <DashboardView entries={entries} settings={settings} />;
      case 'calendar':
        return (
          <CalendarView
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'entries':
        return (
          <EntriesView
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'reports':
        return <ReportsView entries={entries} settings={settings} />;
      case 'vacation':
        return (
          <VacationView
            entries={entries}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            entries={entries}
            onUpdateSettings={handleUpdateSettings}
            onBulkSaveEntries={handleBulkSaveEntries}
            onClearAndReseed={handleClearAndReseed}
            onEraseAllEntries={handleEraseAllEntries}
            isDebugUnlocked={isDebugUnlocked}
          />
        );
      case 'pitch':
        return <PitchView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const menuItems = [
    { id: 'home', label: 'Quick Entry / Home', icon: Clock },
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'calendar', label: 'Interactive Calendar', icon: CalendarDays },
    { id: 'vacation', label: 'Vacation Bank', icon: Palmtree },
    { id: 'entries', label: 'Historical Working Logs', icon: FileSpreadsheet },
    { id: 'reports', label: 'Tax & Reports', icon: FileText },
    { id: 'settings', label: 'Workday Settings', icon: Sliders },
    { id: 'pitch', label: 'Share & Tester Guide', icon: Sparkles }
  ] as const;

  const currentSectionLabel = menuItems.find(item => item.id === activeTab)?.label || 'Quick Entry / Home';

  return (
    <div className="min-h-screen bg-brand-bg text-slate-800 flex flex-col md:flex-row font-sans selection:bg-brand-blue selection:text-white" id="main-application-container">
      
      {/* Mobile Top Header (hidden on desktop) */}
      <div className="md:hidden bg-brand-slate border-b border-brand-slate pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 px-4 flex justify-between items-center z-30 print:hidden shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-slate-800 border border-slate-700/60 shadow-inner">
            <WorkLedgerLogo className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white block">WorkLedger — {currentSectionLabel}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="text-slate-300 hover:text-white p-1 rounded-lg border border-slate-700 font-semibold"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
          id="mobile-menu-backdrop"
        />
      )}

      {/* Navigation Sidebar Drawer */}
      <aside 
        id="sidebar-navigation"
        className={`
          fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-brand-slate flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out pb-[env(safe-area-inset-bottom,0px)] print:hidden
          md:static md:w-64 md:max-w-none md:h-auto md:shadow-none md:translate-x-0 md:z-20 md:flex
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full hidden md:flex'}
        `}
      >
        {/* Brand identity */}
        <div className="hidden md:flex items-center gap-2.5 px-6 py-6 border-b border-slate-700/65">
          <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700/60 shadow-lg">
            <WorkLedgerLogo className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base block">WorkLedger</span>
            <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Workday Tracker</span>
          </div>
        </div>

        {/* Sidebar Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 scale-[1.01]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </button>
            );
          })}
        </nav>

         {/* User identification footer */}
         <div className="p-4 border-t border-slate-700/65 bg-black/10 text-xs text-slate-400">
           <div 
             className="flex items-center gap-2.5 mb-2.5 cursor-pointer active:scale-[0.97] transition-transform select-none"
             onClick={handleDebugTap}
             title="Tap 5 times to reveal hidden developer settings"
           >
             <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center font-extrabold text-white border border-blue-400/20 font-mono text-xs shadow-sm">
               {(settings.userName || 'Your Name').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
             </div>
             <div className="truncate flex-1">
               <span className="font-bold text-white block truncate">
                 {settings.userName || 'Your Name'}
               </span>
               <span className="text-[10px] text-slate-300 font-semibold block truncate">
                 {settings.activeCompany || 'Your Company'}
               </span>
             </div>
           </div>
           <div className="text-[9px] font-mono font-medium text-slate-400 border-t border-slate-700/40 pt-2 text-center select-none tracking-tight">
             © 2026 WorkLedger. All Rights Reserved.
           </div>
         </div>
      </aside>

      {/* Main layout contents area */}
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:p-8 container mx-auto pr-4 print:p-0 print:bg-white print:text-black">
        {/* Dynamic component routing view */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumb Header for Desktop */}
          <div className="sticky top-[-2rem] bg-brand-bg pt-8 pb-3.5 z-10 hidden md:flex justify-between items-center border-b border-slate-200 mb-2 print:hidden">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <div className="p-1 rounded bg-slate-100 border border-slate-200">
                <WorkLedgerLogo className="w-4 h-4" />
              </div>
              <span className="text-slate-500 font-semibold">WorkLedger</span>
              <span className="text-slate-400 font-normal">-</span>
              <span className="text-brand-blue font-bold">{currentSectionLabel}</span>
            </h2>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ACTIVE TAX RECORD</span>
          </div>
          {renderTabContent()}
        </div>
      </main>

      {/* Developer Settings Unlocked Toast */}
      {showDebugToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white font-semibold text-xs px-4 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 animate-bounce select-none">
          <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
          <span>Developer Tools unlocked in workday settings!</span>
        </div>
      )}

      {/* Vacation Onboarding Modal */}
      {showVacationOnboardingPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center mx-auto text-3xl">
              🌴
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Configure Your Vacation Bank</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Welcome to the new Vacation Bank! Please configure your yearly entitlement to activate Danish cycle tracking.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
                  Yearly Vacation Days
                </label>
                <div className="flex gap-2">
                  {[25, 30, 35].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setOnboardingDays(days)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        onboardingDays === days
                          ? 'bg-brand-blue text-white border-brand-blue shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {days} Days {days === 25 ? '(Std)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-left">
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
                  Or Custom Amount
                </label>
                <input
                  type="number"
                  value={onboardingDays}
                  onChange={(e) => setOnboardingDays(Math.max(1, parseInt(e.target.value, 10) || 25))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  min="1"
                  max="100"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 text-left p-3.5 rounded-xl text-[10px] text-amber-800 leading-relaxed font-semibold">
                ℹ️ <strong>Danish standard minimum:</strong> 5 weeks = 25 days. Some contracts or collective agreements offer 30 or 35 days (feriefridage excluded).
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteVacationOnboarding}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-brand-blue/10"
            >
              Activate Vacation Bank
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
