/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DayEntry, WorkCategory, UserSettings, HolidaySetting, TaxRateSetting, DifferentOfficeLocation } from '../types';
import { getDanishHolidays } from '../utils/holidays';
import { detectDeviceLocation } from '../utils/deviceLocation';
import {
  Settings,
  Clock,
  Car,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Briefcase
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onClearAndReseed: () => void;
}

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClearAndReseed
}: SettingsViewProps) {
  const deviceLocation = React.useMemo(() => detectDeviceLocation(), []);

  // Local States mirroring settings
  const [standardWorkdayHours, setStandardWorkdayHours] = useState(settings.standardWorkdayHours);
  const [roundTripDistanceKm, setRoundTripDistanceKm] = useState<number | ''>(settings.roundTripDistanceKm);
  const [defaultOfficeLocationName, setDefaultOfficeLocationName] = useState<string>(
    settings.defaultOfficeLocationName || ''
  );
  const [enableManualOverride, setEnableManualOverride] = useState(settings.enableManualOverride);
  const [preferredYearView, setPreferredYearView] = useState(settings.preferredYearView);

  // User Profile and Company directories
  const [userName, setUserName] = useState<string>(settings.userName || 'Rohan Patil');
  const [activeCompany, setActiveCompany] = useState<string>(settings.activeCompany || 'Danfoss Power Electronics A/S');
  const [companies, setCompanies] = useState<string[]>(settings.companies || [
    'Danfoss Power Electronics A/S',
    'Danfoss Climate Solutions',
    'Danfoss Drives'
  ]);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(settings.theme || 'system');

  // Tax rates
  const [taxRates, setTaxRates] = useState<TaxRateSetting[]>(settings.taxRates);

  // Holidays state management
  const [holidays, setHolidays] = useState<HolidaySetting[]>(settings.holidays);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Status message
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add tax year state
  const [isAddingTaxYear, setIsAddingTaxYear] = useState(false);
  const [newTaxYear, setNewTaxYear] = useState('');
  const [taxYearError, setTaxYearError] = useState('');

  // Different Office Locations states
  const [differentOfficeLocations, setDifferentOfficeLocations] = useState<DifferentOfficeLocation[]>(
    settings.differentOfficeLocations || []
  );
  const [newLocName, setNewLocName] = useState('');
  const [newLocDistance, setNewLocDistance] = useState<number | ''>('');
  const [newLocInclude, setNewLocInclude] = useState<boolean>(true);

  const handleAddOfficeLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLocName.trim();
    if (!name) return;

    const newLoc: DifferentOfficeLocation = {
      id: 'loc-' + Date.now(),
      name,
      roundTripDistanceKm: typeof newLocDistance === 'number' ? newLocDistance : 0,
      includeInCommute: newLocInclude
    };

    setDifferentOfficeLocations([...differentOfficeLocations, newLoc]);
    setNewLocName('');
    setNewLocDistance('');
    setNewLocInclude(true);
  };

  const handleDeleteOfficeLocation = (id: string) => {
    setDifferentOfficeLocations(differentOfficeLocations.filter((loc) => loc.id !== id));
  };

  const handleAddTaxYear = () => {
    setTaxYearError('');
    const yr = parseInt(newTaxYear, 10);
    if (!yr || isNaN(yr)) {
      setTaxYearError('Enter a valid year.');
      return;
    }

    if (taxRates.some((rate) => rate.year === yr)) {
      setTaxYearError(`Tax year ${yr} already exists.`);
      return;
    }

    const newRate: TaxRateSetting = {
      year: yr,
      thresholdKm: 24,
      rate1: 2.28,
      rate2: 1.14,
      limitKm: 120
    };

    const updated = [...taxRates, newRate].sort((a, b) => b.year - a.year);
    setTaxRates(updated);
    setIsAddingTaxYear(false);
    setNewTaxYear('');
  };

  // Edit single tax rate fields
  const handleTaxRateChange = (index: number, field: keyof TaxRateSetting, value: number) => {
    const updated = [...taxRates];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRates(updated);
  };

  const handleDeleteTaxRate = (yearToDelete: number) => {
    const currentYear = new Date().getFullYear();
    if (yearToDelete === currentYear) {
      setTaxYearError(`The current calendar year (${currentYear}) cannot be deleted.`);
      return;
    }
    const updated = taxRates.filter((rate) => rate.year !== yearToDelete);
    setTaxRates(updated);
  };

  // Add custom Danish holiday
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;

    const newHoli: HolidaySetting = {
      date: newHolidayDate,
      name: newHolidayName,
      isCustom: true
    };

    const updated = [...holidays, newHoli].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  // Delete holiday
  const handleDeleteHoliday = (date: string) => {
    const updated = holidays.filter((h) => h.date !== date);
    setHolidays(updated);
  };

  // Reload defaults for Selected Year
  const handleRestoreHolidays = (year: number) => {
    const preloads = getDanishHolidays(year);
    setHolidays(preloads);
  };

  // Save Settings
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedSettings: UserSettings = {
      ...settings,
      standardWorkdayHours,
      roundTripDistanceKm,
      defaultOfficeLocationName,
      enableManualOverride,
      preferredYearView,
      taxRates,
      holidays,
      userName,
      activeCompany,
      companies,
      theme,
      differentOfficeLocations
    };

    onUpdateSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="settings-management-panel">
      {/* Save Success feedback toast (Floating at the top of the screen) */}
      {saveSuccess && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-5 py-4 rounded-xl border flex items-center gap-3 shadow-xl animate-fade-in font-sans text-xs transition-all"
          id="settings-save-success-toast"
          style={{ 
            backgroundColor: '#3F4E4F', 
            color: '#DCD7C9',
            borderColor: '#DCD7C9',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)' 
          }}
        >
          <div className="flex-1 font-bold">Preferences saved and applied successfully inside local storage!</div>
          <button 
            type="button" 
            onClick={() => setSaveSuccess(false)}
            className="font-bold shrink-0 text-sm cursor-pointer px-1.5 py-0.5 rounded-md transition-colors"
            style={{ color: '#DCD7C9', opacity: 0.8 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Row 0: User Profile & Corporate Directories */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xl">USER PROFILE</span>
            <span className="ml-auto text-right text-xs font-normal text-slate-400">Personal Profile & Employer Branches Directory</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs" id="user-profile-and-companies-setting-grid">
            {/* User Owner Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Employee / Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Rohan Patil"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm"
                />
                <p className="text-[10px] text-slate-505 mt-2">
                  This owner name is printed directly onto dynamic audit statements and tax report declarations.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Active Selected Employer / Company
                </label>
                <select
                  value={activeCompany}
                  onChange={(e) => setActiveCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm focus:border-brand-blue"
                >
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-505 mt-2">
                  Select your current primary employer. Commutes and overtime logs will group under this registered branch.
                </p>
              </div>
            </div>

            {/* Corporate Directories Registry List */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Employer Registration
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Add company name"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCompanyName.trim();
                      if (trimmed && !companies.includes(trimmed)) {
                        setCompanies([...companies, trimmed]);
                        setNewCompanyName('');
                      }
                    }}
                    className="bg-brand-blue hover:bg-blue-600 text-white font-bold px-4 rounded-xl transition cursor-pointer text-xs shrink-0"
                  >
                    Add Employer
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl bg-slate-50 p-3.5 space-y-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Registered Companies</span>
                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                  {companies.map((company) => (
                    <div key={company} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg text-xs font-semibold">
                      <span className="truncate text-slate-700 max-w-[200px]">{company}</span>
                      {companies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (company === activeCompany) {
                              alert("You cannot delete the active company. Change active company first.");
                              return;
                            }
                            setCompanies(companies.filter((c) => c !== company));
                          }}
                          className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 rounded text-[10px] font-sans font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Theme switcher block has been removed as the app now runs a unified premium color theme across all devices */}
        </div>

        {/* Row 1: Core baselines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="text-brand-blue" />
            <span>Schedule Baselines & Overtime Benchmarks</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Standard Workday Baseline Hours
              </label>
              <input
                type="number"
                step="0.1"
                value={standardWorkdayHours}
                onChange={(e) => setStandardWorkdayHours(Math.max(1, parseFloat(e.target.value) || 7.4))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                min="1"
                max="24"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
                Expected daily capacity for business weekdays in Denmark (typically <strong className="text-slate-700">7.4 hours</strong> per full collective agreements). Overtime is calculated relative to this benchmark.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Manual Hours Override Support
              </label>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 h-[48px]">
                <input
                  type="checkbox"
                  id="checkbox-override-settings"
                  checked={enableManualOverride}
                  onChange={(e) => setEnableManualOverride(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-blue bg-white focus:ring-brand-blue/30 cursor-pointer"
                />
                <label htmlFor="checkbox-override-settings" className="text-slate-700 font-bold select-none cursor-pointer">
                  Enable manual punches overrides
                </label>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal mt-2">
                If checked, you'll see a helper field inside Daily Log to manually bypass computed clock metrics if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2A: Default Office Commute Parameters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <Car className="text-teal-600" />
            <span>Default Office Commute Parameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Default Office Location
              </label>
              <input
                type="text"
                value={defaultOfficeLocationName}
                onChange={(e) => setDefaultOfficeLocationName(e.target.value)}
                placeholder={`e.g. ${deviceLocation.capital}, ${deviceLocation.majorCities.slice(0, 2).join(', ')}`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 font-semibold"
              />
              <p className="text-[10px] text-slate-500 leading-normal mt-2">
                The name/identifier of your primary office (e.g., <strong className="text-slate-700">{deviceLocation.capital} Office</strong>).
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Round-Trip Commute Distance (KM)
              </label>
              <input
                type="number"
                value={roundTripDistanceKm}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoundTripDistanceKm(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                }}
                placeholder="e.g. 40"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                min="0"
                max="500"
              />
              <p className="text-[10px] text-slate-500 leading-normal mt-2">
                Round-trip driving kilometers between your home address and the default corporate office.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2B: Skat Commute Deduction Scales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2">
              <Layers className="text-teal-600" />
              <span>Danish Commute Deduction Scales (By Tax Year)</span>
            </h3>
            
            {!isAddingTaxYear ? (
              <button
                type="button"
                onClick={() => {
                  setIsAddingTaxYear(true);
                  setNewTaxYear(new Date().getFullYear().toString());
                  setTaxYearError('');
                }}
                className="bg-brand-blue hover:bg-blue-600 text-white font-bold px-2.5 py-1.5 rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tax Year
              </button>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="number"
                  placeholder="Year"
                  value={newTaxYear}
                  onChange={(e) => {
                    setNewTaxYear(e.target.value);
                    setTaxYearError('');
                  }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-800 text-[10px] w-16 font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  min="1900"
                  max="2100"
                />
                <button
                  type="button"
                  onClick={handleAddTaxYear}
                  className="bg-brand-blue hover:bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTaxYear(false);
                    setTaxYearError('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                  id="cancel-add-tax-year"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {taxYearError && (
            <div className="text-[10px] text-red-500 font-semibold leading-none">
              ⚠️ {taxYearError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              {taxRates.map((rate, idx) => (
                <div key={rate.year} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3 text-[10px] font-mono">
                  <div className="grid grid-cols-4 gap-2 items-center flex-1">
                    <span className="font-bold text-slate-800 text-xs">{rate.year} Tax Year:</span>
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-0.5">Threshold (km)</span>
                      <input
                        type="number"
                        value={rate.thresholdKm}
                        onChange={(e) => handleTaxRateChange(idx, 'thresholdKm', parseInt(e.target.value, 10) || 24)}
                        className="bg-white border border-slate-200 rounded p-1 text-slate-800 w-full text-center focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-0.5">Rate 1 (DKK/km)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.rate1}
                        onChange={(e) => handleTaxRateChange(idx, 'rate1', parseFloat(e.target.value) || 2.28)}
                        className="bg-white border border-slate-200 rounded p-1 text-slate-800 w-full text-center focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-0.5">Rate 2 (DKK/km)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.rate2}
                        onChange={(e) => handleTaxRateChange(idx, 'rate2', parseFloat(e.target.value) || 1.14)}
                        className="bg-white border border-slate-200 rounded p-1 text-slate-800 w-full text-center focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-center pt-3 shrink-0">
                    {rate.year === new Date().getFullYear() ? (
                      <div 
                        className="p-1.5 text-slate-300 cursor-not-allowed" 
                        title="Current calendar year cannot be deleted"
                      >
                        <Trash2 className="w-4 h-4 opacity-40" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteTaxRate(rate.year)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title={`Delete ${rate.year} Tax Year`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Standard SKAT rules apply: Commutes below 24 km yield 0 deduction. Distances between 25-120 km yield <strong className="text-slate-700">2.28 DKK/km</strong> (2026 scales). Above 120 km defaults to <strong className="text-slate-700">1.14 DKK/km</strong>.
            </p>
          </div>
        </div>

        {/* Row: Different Office Locations Directory */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="different-office-locations-section">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="text-indigo-600" />
            <span>Different Office Locations Directory</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Add Office Location Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Add Different Office Location</h4>
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 mb-1 leading-none font-semibold">Location / Branch Name</label>
                  <input
                    type="text"
                    placeholder={`e.g. ${deviceLocation.majorCities.slice(0, 3).join(', ')}`}
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 leading-none font-semibold">Round-Trip Distance (km)</label>
                  <input
                    type="number"
                    value={newLocDistance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewLocDistance(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                    }}
                    placeholder={`e.g. 60`}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    min="0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="loc-include-commute"
                    checked={newLocInclude}
                    onChange={(e) => setNewLocInclude(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-blue bg-white focus:ring-brand-blue/30 cursor-pointer"
                  />
                  <label htmlFor="loc-include-commute" className="text-slate-700 font-bold select-none cursor-pointer">
                    Include in Driving Commute
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  If selected, driving commute deduction is calculated using this location's distance on days logged with this different office.
                </p>
                <button
                  type="button"
                  onClick={handleAddOfficeLocation}
                  className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Location
                </button>
              </div>
            </div>

            {/* Office Locations List */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Registered Locations ({differentOfficeLocations.length})</h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {differentOfficeLocations.length > 0 ? (
                  differentOfficeLocations.map((loc) => (
                    <div key={loc.id} className="p-3.5 flex justify-between items-center text-[11px] bg-white">
                      <div>
                        <span className="font-bold text-slate-850 text-xs block mb-0.5">{loc.name}</span>
                        <div className="flex gap-3 text-slate-500 text-[10px] font-mono">
                          <span>Round-Trip: <strong>{loc.roundTripDistanceKm} km</strong></span>
                          <span>•</span>
                          <span className={loc.includeInCommute ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                            {loc.includeInCommute ? 'Counts as driving commute' : 'Does NOT count as commute'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteOfficeLocation(loc.id)}
                        className="text-rose-600 p-1.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-slate-400 italic">No additional different office locations registered. Only default office ({defaultOfficeLocationName || 'Default Office'}) is configured.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Public Holidays */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2">
              <Calendar className="text-rose-500" />
              <span>Public Holidays Database Manager</span>
            </h3>
            <button
              type="button"
              onClick={() => handleRestoreHolidays(2026)}
              className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono transition cursor-pointer"
            >
              Reset 2026 Danish Preloads
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Add Holiday Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Add Custom Holiday Code</h4>
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 mb-1 leading-none font-semibold">Holiday Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Easter Extra Friday"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 leading-none font-semibold font-mono">Calendar date</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Holiday
                </button>
              </div>

              <div className="p-3.5 bg-amber-50 border border-brand-peach/15 rounded-xl text-slate-700 leading-relaxed text-[11px] space-y-1">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Overtime Protection
                </span>
                <span>Days designated as Holiday count toward standard expected hours, resulting in <strong>neutral overtime change (0)</strong> rather than negative overtime.</span>
              </div>
            </div>

            {/* Holiday list */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Loaded Denmark Holidays ({holidays.length})</h4>
              <div className="bg-slate-50 rounded-xl border border-slate-200 max-h-[290px] overflow-y-auto divide-y divide-slate-100">
                {holidays.length > 0 ? (
                  holidays.map((holi) => (
                    <div key={holi.date} className="p-2.5 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-brand-blue mr-2">{holi.date}</span>
                        <span className="text-slate-800 font-semibold">{holi.name}</span>
                        {holi.isCustom && <span className="ml-2 text-[8px] bg-brand-blue/15 text-brand-blue border border-brand-blue/20 px-1 py-0.5 rounded uppercase font-bold">Custom</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(holi.date)}
                        className="text-rose-600 p-1 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/50 rounded cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-slate-400 italic">No holidays loaded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Action & Seed state */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white border border-slate-200 p-5 rounded-2xl gap-4 shadow-sm">
          <div>
            <span className="text-xs font-bold text-brand-slate block">Actions & State Configuration</span>
            <span className="text-[11px] text-slate-500">Reset default workspaces or save parameters permanently.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('CAUTION: This will clear ALL custom work entries and re-seed the program with simulated logs for 2026. Proceed?')) {
                  onClearAndReseed();
                }
              }}
              className="bg-slate-50 hover:bg-slate-100 text-xs text-rose-650 font-bold px-4 py-2.5 rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear & Seed Demo Data</span>
            </button>

            <button
              id="save-settings-btn"
              type="submit"
              className="bg-brand-blue hover:bg-blue-600 active:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-brand-blue"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
