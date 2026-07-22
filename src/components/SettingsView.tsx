/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { DayEntry, WorkCategory, UserSettings, HolidaySetting, TaxRateSetting, DifferentOfficeLocation, VacationCycle } from '../types';
import { getDanishHolidays } from '../utils/holidays';
import { detectDeviceLocation } from '../utils/deviceLocation';
import { generateDefaultCycles } from '../utils/vacationBank';
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
  Briefcase,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  Check
} from 'lucide-react';

import { getWeekNumber, getWeekdayName, isWeekend, calculateHours, calculateDayOvertime } from '../utils/calculations';

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

interface SettingsViewProps {
  settings: UserSettings;
  entries: DayEntry[];
  onUpdateSettings: (settings: UserSettings) => void;
  onBulkSaveEntries: (bulkList: DayEntry[]) => Promise<void>;
  onClearAndReseed: () => void;
  onEraseAllEntries: () => void;
  isDebugUnlocked?: boolean;
}

export default function SettingsView({
  settings,
  entries,
  onUpdateSettings,
  onBulkSaveEntries,
  onClearAndReseed,
  onEraseAllEntries,
  isDebugUnlocked = false
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
  const [userName, setUserName] = useState<string>(settings.userName || '');
  const [userEmail, setUserEmail] = useState<string>(settings.userEmail || '');
  const [activeCompany, setActiveCompany] = useState<string>(
    settings.activeCompany || (settings.companies && settings.companies.length > 0 ? settings.companies[0] : '')
  );
  const [companies, setCompanies] = useState<string[]>(settings.companies || []);
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

  // Vacation Bank settings states
  const [vacationYearlyEntitlementDays, setVacationYearlyEntitlementDays] = useState<number>(
    settings.vacationYearlyEntitlementDays !== undefined ? settings.vacationYearlyEntitlementDays : 25
  );
  const [vacationFeriefridageHours, setVacationFeriefridageHours] = useState<number>(
    settings.vacationFeriefridageHours !== undefined ? settings.vacationFeriefridageHours : 37
  );
  const [vacationCycles, setVacationCycles] = useState<VacationCycle[]>(
    settings.vacationCycles || generateDefaultCycles(new Date().getFullYear(), settings.vacationYearlyEntitlementDays || 25)
  );

  // Backup & Restore states
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [isImportConfirming, setIsImportConfirming] = useState(false);
  const [isReseedConfirming, setIsReseedConfirming] = useState(false);
  const [isEraseConfirming, setIsEraseConfirming] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<{
    parsed: any;
    currentCount: number;
    backupCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time-Tracking Import Wizard states
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<DayEntry[]>([]);
  const [importDuplicateStrategy, setImportDuplicateStrategy] = useState<'overwrite' | 'skip'>('overwrite');
  const [importFileDetails, setImportFileDetails] = useState<{ name: string; size: string; type: 'csv' | 'json' } | null>(null);
  const [importIsMMDDYY, setImportIsMMDDYY] = useState<boolean>(false);
  const [importRawText, setImportRawText] = useState<string | null>(null);
  const [importRawFileName, setImportRawFileName] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state variables when settings prop changes (e.g. after reseed/import)
  React.useEffect(() => {
    setStandardWorkdayHours(settings.standardWorkdayHours);
    setRoundTripDistanceKm(settings.roundTripDistanceKm);
    setDefaultOfficeLocationName(settings.defaultOfficeLocationName || '');
    setEnableManualOverride(settings.enableManualOverride);
    setPreferredYearView(settings.preferredYearView);
    setUserName(settings.userName || '');
    setUserEmail(settings.userEmail || '');
    setActiveCompany(
      settings.activeCompany || (settings.companies && settings.companies.length > 0 ? settings.companies[0] : '')
    );
    setCompanies(settings.companies || []);
    setTaxRates(settings.taxRates);
    setHolidays(settings.holidays);
    setDifferentOfficeLocations(settings.differentOfficeLocations || []);
    setVacationYearlyEntitlementDays(settings.vacationYearlyEntitlementDays !== undefined ? settings.vacationYearlyEntitlementDays : 25);
    setVacationFeriefridageHours(settings.vacationFeriefridageHours !== undefined ? settings.vacationFeriefridageHours : 37);
    setVacationCycles(settings.vacationCycles || generateDefaultCycles(new Date().getFullYear(), settings.vacationYearlyEntitlementDays || 25));
  }, [settings]);

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
      userEmail,
      activeCompany: activeCompany || (companies.length > 0 ? companies[0] : ''),
      companies,
      theme,
      differentOfficeLocations,
      vacationYearlyEntitlementDays,
      vacationFeriefridageHours,
      vacationCycles
    };

    onUpdateSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const validateBackupData = (parsed: any): { valid: boolean; error?: string } => {
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'The file is empty or does not contain a valid JSON object.' };
    }

    if (parsed.version === undefined) {
      return { valid: false, error: 'Validation failed: Backup schema version is missing. File is unrecognized or incompatible.' };
    }

    if (typeof parsed.version !== 'number' || parsed.version < 1) {
      return { valid: false, error: `Validation failed: Incompatible backup schema version (${parsed.version}).` };
    }

    if (!parsed.settings || typeof parsed.settings !== 'object') {
      return { valid: false, error: "Validation failed: 'settings' object is missing or corrupted." };
    }

    const s = parsed.settings;
    if (typeof s.standardWorkdayHours !== 'number') {
      return { valid: false, error: "Validation failed: 'standardWorkdayHours' must be a valid number." };
    }
    if (s.taxRates && !Array.isArray(s.taxRates)) {
      return { valid: false, error: "Validation failed: 'taxRates' must be a valid array." };
    }
    if (s.holidays && !Array.isArray(s.holidays)) {
      return { valid: false, error: "Validation failed: 'holidays' must be a valid array." };
    }
    if (s.categoryColors && typeof s.categoryColors !== 'object') {
      return { valid: false, error: "Validation failed: 'categoryColors' must be a valid object." };
    }
    if (s.overtimeCreditRules && typeof s.overtimeCreditRules !== 'object') {
      return { valid: false, error: "Validation failed: 'overtimeCreditRules' must be a valid object." };
    }

    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      return { valid: false, error: "Validation failed: 'entries' array is missing or corrupted." };
    }

    for (let i = 0; i < parsed.entries.length; i++) {
      const entry = parsed.entries[i];
      if (!entry || typeof entry !== 'object') {
        return { valid: false, error: `Validation failed: Entry at index ${i} is not a valid object.` };
      }
      if (typeof entry.date !== 'string' || !entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { valid: false, error: `Validation failed: Entry at index ${i} has an invalid date format. Expected YYYY-MM-DD.` };
      }
      if (typeof entry.category !== 'string') {
        return { valid: false, error: `Validation failed: Entry for date ${entry.date} has an invalid or missing category.` };
      }
    }

    return { valid: true };
  };

  const exportBackup = async () => {
    setBackupError(null);
    setBackupSuccess(null);
    try {
      const { value: cachedEntries } = await Preferences.get({ key: 'danish_tracker_workday_entries' });
      const currentEntries = cachedEntries ? JSON.parse(cachedEntries) : [];

      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        settings: {
          ...settings,
          standardWorkdayHours,
          roundTripDistanceKm,
          defaultOfficeLocationName,
          enableManualOverride,
          preferredYearView,
          taxRates,
          holidays,
          userName,
          userEmail,
          activeCompany,
          companies,
          theme,
          differentOfficeLocations
        },
        entries: currentEntries
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `workledger_backup_${new Date().toISOString().split('T')[0]}.json`;

      // Check if running on Capacitor native platform
      if (Capacitor.isNativePlatform()) {
        try {
          // Write file natively
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });

          // Share file using Share API
          await Share.share({
            title: 'Workledger Backup',
            text: `Backup of settings and ${currentEntries.length} logged entries.`,
            url: writeResult.uri,
            dialogTitle: 'Save or Share Backup File'
          });

          setBackupSuccess('Backup file exported and shared successfully.');
          return;
        } catch (nativeErr: any) {
          console.error('Capacitor native export failed, falling back to browser download:', nativeErr);
        }
      }

      // Plain browser download fallback
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess('Backup file exported and downloaded successfully.');
    } catch (err: any) {
      console.error('Export failed:', err);
      setBackupError('Export failed: ' + err.message);
    }
  };

  const processImportString = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const validation = validateBackupData(parsed);

      if (!validation.valid) {
        setBackupError(validation.error || 'Invalid backup file schema.');
        return;
      }

      // Load current entries asynchronously to count them for overwrite warning
      Preferences.get({ key: 'danish_tracker_workday_entries' })
        .then(({ value }) => {
          const currentCount = value ? JSON.parse(value).length : 0;
          setPendingImportData({
            parsed,
            currentCount,
            backupCount: parsed.entries.length
          });
          setIsImportConfirming(true);
        })
        .catch(() => {
          setPendingImportData({
            parsed,
            currentCount: 0,
            backupCount: parsed.entries.length
          });
          setIsImportConfirming(true);
        });
    } catch (err: any) {
      setBackupError('Failed to parse backup file as valid JSON: ' + err.message);
    }
  };

  // --- SEAMLESS CSV & JSON TIME-TRACKING IMPORT WIZARD LOGIC ---

  // Utility to parse a single CSV row, respecting quoted values
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, '').trim());
  };

  // Robust date parser with default DD-MM-YY(YY) and MM-DD-YY(YY) toggle support
  const parseDateToISO = (dateStr: string, useMMDDYY: boolean): string | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }
    
    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanStr)) {
      return cleanStr.replace(/\//g, '-');
    }

    const parts = cleanStr.split(/[\/\-\.]+/).map(p => p.trim());
    if (parts.length !== 3) {
      // Fallback standard Date constructor
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return null;
    }

    let day = '';
    let month = '';
    let year = '';

    // If first part is 4 digits, treat as YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      // It's either DD-MM-YY(YY) or MM-DD-YY(YY)
      if (useMMDDYY) {
        month = parts[0];
        day = parts[1];
        year = parts[2];
      } else {
        day = parts[0];
        month = parts[1];
        year = parts[2];
      }
    }

    // Pad day and month
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');

    // Handle 2-digit years vs 4-digit years
    if (year.length === 2) {
      // E.g. "26" -> "2026"
      year = '20' + year;
    }

    // Simple validity check
    const yNum = parseInt(year, 10);
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);

    if (isNaN(yNum) || isNaN(mNum) || isNaN(dNum)) {
      return null;
    }

    if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31 || yNum < 1900 || yNum > 2100) {
      return null;
    }

    return `${year}-${month}-${day}`;
  };

  // Map arbitrary strings to valid WorkCategory enum values
  const mapStringToCategory = (typeStr: string): { category: WorkCategory; location?: string; isFeriefridag?: boolean } => {
    const s = (typeStr || '').toLowerCase().trim();
    if (!s) {
      return { category: WorkCategory.Office };
    }

    // Check against configured different office location names first
    const matchedCustomLoc = differentOfficeLocations.find(
      l => l.name.toLowerCase().trim() === s
    );
    if (matchedCustomLoc) {
      return { category: WorkCategory.OtherOffice, location: matchedCustomLoc.name };
    }

    // 1. Unpaid Holiday / Unpaid Ferie (check first to avoid 'ferie' collision)
    if (s.includes('unpaid') || s.includes('ubetalt')) {
      return { category: WorkCategory.UnpaidFerie };
    }

    // 2. Sick Day / Illness
    if (s.includes('sick') || s.includes('ill') || s.includes('syg') || s.includes('doctor') || s.includes('medical') || s.includes('sygedag') || s.includes('sygdom')) {
      return { category: WorkCategory.Sick };
    }

    // 3. Feriefridag (extra vacation category)
    if (s.includes('feriefridag') || s.includes('feriefridage')) {
      return { category: WorkCategory.Vacation, isFeriefridag: true };
    }

    // 4. Vacation / Ferie
    if (s.includes('vacation') || s.includes('ferie') || s.includes('annual leave') || s.includes('holiday taken') || s.includes('paid holiday') || s.includes('hol') || s.includes('feriedag')) {
      return { category: WorkCategory.Vacation };
    }

    // 5. Working Elsewhere / Other Office Location (check before generic 'work' matcher to prevent mapping to 'Office')
    if (s.includes('elsewhere') || s.includes('other') || s.includes('different') || s.includes('another office') || s.includes('udland')) {
      return { category: WorkCategory.OtherOffice };
    }

    // 6. Working From Home / WFH
    if (s.includes('wfh') || s.includes('home') || s.includes('remote') || s.includes('hjemme') || s.includes('distanc')) {
      return { category: WorkCategory.WFH };
    }

    // 7. National Holidays / Days Off (e.g. Fridag)
    if (s.includes('fridag') || s.includes('public holiday') || s.includes('national holiday') || s.includes('helligdag') || s.includes('søgnehelligdag')) {
      return { category: WorkCategory.Holiday };
    }

    // 8. Office (check last)
    if (s.includes('office') || s.includes('work') || s.includes('hq') || s.includes('filial') || s.includes('branch') || s.includes('arbejd')) {
      return { category: WorkCategory.Office };
    }

    // Default fallback
    return { category: WorkCategory.Office };
  };

  // Build a standard DayEntry object from raw parsed fields
  const buildImportDayEntry = (
    dateStr: string,
    category: WorkCategory,
    timeIn?: string,
    timeOut?: string,
    hoursOverride?: number,
    notes = '',
    location?: string,
    isFeriefridag?: boolean
  ): DayEntry => {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const weekday = getWeekdayName(dateStr);
    const weekNumber = getWeekNumber(dateStr);

    const isSpecialXOrZero = (v?: string): boolean => {
      if (!v) return false;
      const clean = v.trim().toLowerCase();
      return clean === 'x' || clean === '0';
    };

    const hasSpecialTime = isSpecialXOrZero(timeIn) || isSpecialXOrZero(timeOut);

    // Format times to standard HH:MM
    let cleanIn = hasSpecialTime ? undefined : (timeIn?.trim() || undefined);
    let cleanOut = hasSpecialTime ? undefined : (timeOut?.trim() || undefined);

    const normalizeTime = (t?: string): string | undefined => {
      if (!t) return undefined;
      const clean = t.trim().replace('.', ':');
      // matches e.g. "08:00", "8:00"
      const matched = clean.match(/^(\d{1,2}):(\d{2})/);
      if (matched) {
        return `${matched[1].padStart(2, '0')}:${matched[2]}`;
      }
      return undefined;
    };

    cleanIn = normalizeTime(cleanIn);
    cleanOut = normalizeTime(cleanOut);

    const calculatedHoursVal = calculateHours(cleanIn, cleanOut, 30); // 30 min default break
    
    let finalCounted = 7.4;
    let overriddenHours: number | undefined = undefined;

    if (hasSpecialTime) {
      overriddenHours = standardWorkdayHours;
      finalCounted = standardWorkdayHours;
    } else if (hoursOverride !== undefined && !isNaN(hoursOverride) && hoursOverride > 0) {
      overriddenHours = hoursOverride;
      finalCounted = hoursOverride;
    } else if (calculatedHoursVal > 0) {
      finalCounted = calculatedHoursVal;
    } else {
      if (
        category === WorkCategory.Office ||
        category === WorkCategory.WFH ||
        category === WorkCategory.OtherOffice ||
        category === WorkCategory.Vacation ||
        category === WorkCategory.Sick ||
        category === WorkCategory.Holiday
      ) {
        finalCounted = standardWorkdayHours;
      } else {
        finalCounted = 0;
      }
    }

    const isWeekendDay = isWeekend(dateStr);
    const overtimeVal = calculateDayOvertime(category, finalCounted, isWeekendDay, standardWorkdayHours);

    return {
      date: dateStr,
      weekday,
      weekNumber,
      month: m,
      year: y,
      category,
      entryTime: cleanIn,
      exitTime: cleanOut,
      breakMinutes: cleanIn && cleanOut ? 30 : undefined,
      calculatedHours: calculatedHoursVal,
      overriddenTotalHours: overriddenHours,
      finalCountedHours: finalCounted,
      overtime: overtimeVal,
      notes: notes || '',
      location,
      isFeriefridag,
      createdUpdatedTimestamp: new Date().toISOString()
    };
  };

  // Main file parsing dispatcher (handles drop / selection of CSV or JSON)
  const processTimeTrackingFile = (text: string, fileName: string, overrideMMDDYY?: boolean) => {
    setImportError(null);
    setImportSuccess(null);
    setImportPreviewRows([]);

    // Save raw file data for interactive toggles
    setImportRawText(text);
    setImportRawFileName(fileName);

    const isMMDDYY = overrideMMDDYY !== undefined ? overrideMMDDYY : importIsMMDDYY;

    const cleanName = fileName.toLowerCase();
    const isJson = cleanName.endsWith('.json');
    const isCsv = cleanName.endsWith('.csv');

    if (!isJson && !isCsv) {
      setImportError('Unsupported file format. Please upload a valid CSV or JSON file.');
      return;
    }

    try {
      if (isJson) {
        let parsed = JSON.parse(text);
        let extractedEntries: DayEntry[] = [];

        // Check if full backup JSON
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
          extractedEntries = parsed.entries;
        } else if (Array.isArray(parsed)) {
          // Check if raw array of entries
          extractedEntries = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Maybe single entry
          extractedEntries = [parsed];
        }

        // Validate entries
        const validEntries: DayEntry[] = [];
        extractedEntries.forEach((entry: any) => {
          if (entry && typeof entry === 'object' && entry.date && typeof entry.date === 'string') {
            const isoDate = parseDateToISO(entry.date, isMMDDYY);
            if (isoDate) {
              const cat = Object.values(WorkCategory).includes(entry.category) ? entry.category : WorkCategory.Office;
              validEntries.push(
                buildImportDayEntry(
                  isoDate,
                  cat,
                  entry.entryTime,
                  entry.exitTime,
                  entry.overriddenTotalHours || entry.finalCountedHours,
                  entry.notes,
                  entry.location,
                  entry.isFeriefridag
                )
              );
            }
          }
        });

        if (validEntries.length === 0) {
          setImportError('No valid work entries with recognizable dates found in the JSON file.');
          return;
        }

        setImportFileDetails({
          name: fileName,
          size: `${(text.length / 1024).toFixed(1)} KB`,
          type: 'json'
        });
        setImportPreviewRows(validEntries);
      } else {
        // Parse CSV
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setImportError('The uploaded CSV file does not contain enough data (header + rows required).');
          return;
        }

        // Detect headers
        const headers = parseCSVRow(lines[0]);
        const findHeaderIndex = (names: string[]) => {
          return headers.findIndex(h =>
            names.some(name => h.toLowerCase().replace(/[\s/_]/g, '') === name.toLowerCase().replace(/[\s/_]/g, ''))
          );
        };

        let dateIdx = findHeaderIndex(['date']);
        if (dateIdx === -1) {
          dateIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('date') || lower.includes('dato') || lower.includes('tid');
          });
        }

        let weekIdx = findHeaderIndex(['week', 'weeknumber', 'wk']);
        if (weekIdx === -1) {
          weekIdx = headers.findIndex(h => h.toLowerCase().includes('uge') || h.toLowerCase().includes('week'));
        }

        let timeInIdx = findHeaderIndex(['timein', 'in', 'start', 'starttim']);
        if (timeInIdx === -1) {
          timeInIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('in') || lower.includes('start') || lower.includes('ind');
          });
        }

        let timeOutIdx = findHeaderIndex(['timeout', 'out', 'end', 'endtim']);
        if (timeOutIdx === -1) {
          timeOutIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('out') || lower.includes('end') || lower.includes('ud') || lower.includes('slut');
          });
        }

        let hoursIdx = findHeaderIndex(['hours', 'hour', 'duration', 'totalhours', 'time']);
        if (hoursIdx === -1) {
          hoursIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('hour') || lower.includes('time') || lower.includes('duration') || lower.includes('timer');
          });
        }

        let locationIdx = findHeaderIndex(['locationdaytype', 'location', 'daytype', 'category', 'type']);
        if (locationIdx === -1) {
          locationIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('loc') || lower.includes('cat') || lower.includes('type') || lower.includes('sted') || lower.includes('kategori');
          });
        }

        let notesIdx = findHeaderIndex(['descriptionnotes', 'descriptioncomments', 'comments', 'comment', 'description', 'notes', 'note', 'desc']);
        if (notesIdx === -1) {
          notesIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('note') || lower.includes('comment') || lower.includes('desc') || lower.includes('forklaring') || lower.includes('bemærkning');
          });
        }

        if (dateIdx === -1) {
          setImportError('Could not find a required "Date" column in the CSV header. Please ensure your headers include "Date".');
          return;
        }

        const validEntries: DayEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
          const rowVals = parseCSVRow(lines[i]);
          if (rowVals.length === 0 || (rowVals.length === 1 && !rowVals[0])) continue;

          if (dateIdx >= rowVals.length) continue;
          const rawDate = rowVals[dateIdx];
          const isoDate = parseDateToISO(rawDate, isMMDDYY);
          if (!isoDate) continue; // Skip rows without valid date

          const rawTimeIn = (timeInIdx !== -1 && timeInIdx < rowVals.length) ? rowVals[timeInIdx] : undefined;
          const rawTimeOut = (timeOutIdx !== -1 && timeOutIdx < rowVals.length) ? rowVals[timeOutIdx] : undefined;
          
          let parsedHours: number | undefined = undefined;
          if (hoursIdx !== -1 && hoursIdx < rowVals.length && rowVals[hoursIdx]) {
            const num = parseFloat(rowVals[hoursIdx].replace(',', '.'));
            if (!isNaN(num)) {
              parsedHours = num;
            }
          }

          const rawLocationType = (locationIdx !== -1 && locationIdx < rowVals.length) ? rowVals[locationIdx] : '';
          const { category, location, isFeriefridag } = mapStringToCategory(rawLocationType);
          const rawNotes = (notesIdx !== -1 && notesIdx < rowVals.length) ? rowVals[notesIdx] : '';

          const entry = buildImportDayEntry(
            isoDate,
            category,
            rawTimeIn,
            rawTimeOut,
            parsedHours,
            rawNotes,
            location,
            isFeriefridag
          );

          validEntries.push(entry);
        }

        if (validEntries.length === 0) {
          setImportError('No valid rows with recognizable dates could be parsed from the CSV file.');
          return;
        }

        setImportFileDetails({
          name: fileName,
          size: `${(text.length / 1024).toFixed(1)} KB`,
          type: 'csv'
        });
        setImportPreviewRows(validEntries);
      }
    } catch (err: any) {
      setImportError(`Failed to parse file: ${err.message}`);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input value
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      setImportError('Oversized file: Exceeds maximum allowed size of 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        processTimeTrackingFile(text, file.name);
      } else {
        setImportError('Failed to read file.');
      }
    };
    reader.onerror = () => {
      setImportError('An error occurred reading the file.');
    };
    reader.readAsText(file);
  };

  const executeCommitImport = async () => {
    if (importPreviewRows.length === 0) return;

    try {
      let finalImportList = [...importPreviewRows];

      // Handle duplicate check
      if (importDuplicateStrategy === 'skip') {
        // filter out entries that already exist in the database
        finalImportList = importPreviewRows.filter(newE => 
          !entries.some(oldE => oldE.date === newE.date)
        );
      }

      if (finalImportList.length === 0) {
        setImportSuccess(`Import completed! Skipping matched dates resulted in 0 new entries being added.`);
        setImportPreviewRows([]);
        setImportFileDetails(null);
        setImportRawText(null);
        setImportRawFileName(null);
        setImportIsMMDDYY(false);
        return;
      }

      await onBulkSaveEntries(finalImportList);
      setImportSuccess(`Successfully imported ${finalImportList.length} time tracking records!`);
      setImportPreviewRows([]);
      setImportFileDetails(null);
      setImportRawText(null);
      setImportRawFileName(null);
      setImportIsMMDDYY(false);
    } catch (err: any) {
      setImportError(`Failed to commit import: ${err.message}`);
    }
  };

  const handleWebImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupError(null);
    setBackupSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be imported again
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      setBackupError('Oversized file upload: File exceeds the maximum size limit of 10 MB.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setBackupError('Invalid file type: Only .json files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') {
        setBackupError('Failed to read the selected file as a text string.');
        return;
      }
      processImportString(text);
    };
    reader.onerror = () => {
      setBackupError('An error occurred while reading the file from disk.');
    };
    reader.readAsText(file);
  };

  const handleNativeImport = async () => {
    setBackupError(null);
    setBackupSuccess(null);
    try {
      // Pick the file natively
      const pickResult = await FilePicker.pickFiles({
        types: ['application/json'],
        readData: true
      });

      if (!pickResult.files || pickResult.files.length === 0) {
        // User cancelled
        return;
      }

      const file = pickResult.files[0];

      if (file.size && file.size > 10 * 1024 * 1024) {
        setBackupError('Oversized file upload: File exceeds the maximum size limit of 10 MB.');
        return;
      }

      if (file.name && !file.name.toLowerCase().endsWith('.json')) {
        setBackupError('Invalid file type: Please select a valid .json file.');
        return;
      }

      if (!file.data) {
        setBackupError('Failed to read file contents natively (empty or unavailable data).');
        return;
      }

      let fileString: string;
      try {
        fileString = atob(file.data);
      } catch {
        setBackupError('Failed to decode native file data. The file might be corrupted or malformed.');
        return;
      }

      processImportString(fileString);
    } catch (err: any) {
      console.error('Native import failed:', err);
      // Fallback to browser file input click in case plugins fail
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    const { parsed } = pendingImportData;

    try {
      // 1. Save settings to cache
      await Preferences.set({
        key: 'danish_tracker_workday_settings',
        value: JSON.stringify(parsed.settings)
      });

      // 2. Save entries to cache
      await Preferences.set({
        key: 'danish_tracker_workday_entries',
        value: JSON.stringify(parsed.entries)
      });

      setIsImportConfirming(false);
      setPendingImportData(null);
      setBackupSuccess(`Successfully imported ${parsed.entries.length} entries and restored complete profile settings!`);

      // Update state immediately
      onUpdateSettings(parsed.settings);

      // Force full page reload after 2s so App.tsx gets fresh caches for everything
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setIsImportConfirming(false);
      setPendingImportData(null);
      setBackupError('Failed to save imported data: ' + err.message);
    }
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
          <div className="flex-1 font-bold">Preferences saved and applied successfully.</div>
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

      {/* Amber warning banner when roundTripDistanceKm is empty or 0 */}
      {(roundTripDistanceKm === '' || roundTripDistanceKm === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-slate-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="commute-distance-settings-warning">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-900 font-semibold leading-normal">
              Commute distance not set - SKAT deduction is currently 0. Go to Settings to enter your daily round-trip distance.
            </p>
          </div>
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
                  placeholder="e.g. Your Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm"
                />
                <p className="text-[10px] text-slate-505 mt-2">
                  This owner name is printed directly onto dynamic audit statements and tax report declarations.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Employee / Owner Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. your-email@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-sm"
                />
                <p className="text-[10px] text-slate-505 mt-2">
                  This email is printed directly onto dynamic audit statements and tax report declarations.
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
                  {companies.length === 0 ? (
                    <option value="">-- Register & Select Employer --</option>
                  ) : (
                    companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  )}
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
                        const updatedCompanies = [...companies, trimmed];
                        setCompanies(updatedCompanies);
                        setNewCompanyName('');
                        if (!activeCompany || companies.length === 0) {
                          setActiveCompany(trimmed);
                        }
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
                  {companies.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No registered companies.</p>
                  ) : (
                    companies.map((company) => (
                      <div key={company} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg text-xs font-semibold">
                        <span className="truncate text-slate-700 max-w-[200px]">{company}</span>
                        {companies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (company === activeCompany) {
                                setCompanyError("You cannot delete the active company. Change the active company first.");
                                setTimeout(() => setCompanyError(null), 4000);
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
                    ))
                  )}
                </div>

                {companyError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg text-[10px] leading-normal font-bold flex items-start gap-1.5 animate-fade-in" id="company-delete-warning">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{companyError}</span>
                  </div>
                )}
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

        {/* Vacation Bank Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="vacation-bank-settings-section">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xl">🌴</span>
            <span>Vacation Bank & Feriefridage Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Yearly Vacation Entitlement (Days)
              </label>
              <input
                type="number"
                value={vacationYearlyEntitlementDays}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 25);
                  setVacationYearlyEntitlementDays(val);
                  // Optionally sync default cycles with new entitlement if user updates it
                  setVacationCycles(prev => prev.map(c => ({ ...c, entitlementDays: c.entitlementDays === vacationYearlyEntitlementDays ? val : c.entitlementDays })));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                min="1"
                max="100"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
                Danish standard is 25 days (5 weeks of holiday). Some contracts or collective agreements offer 30 or 35 days.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Yearly Feriefridage Entitlement (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={vacationFeriefridageHours}
                onChange={(e) => setVacationFeriefridageHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                min="0"
                max="500"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
                Typically 37 hours (5 extra days) for full-time employees, or proportional if your contract specifies different standard hours.
              </p>
            </div>
          </div>

          {/* Cycles Corrections List */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Manage Vacation Cycles & Carried Over Days
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden text-xs">
              {vacationCycles.map((cycle, idx) => {
                const startYear = parseInt(cycle.earningStartDate.split('-')[0], 10);
                const endYear = parseInt(cycle.earningEndDate.split('-')[0], 10);
                return (
                  <div key={cycle.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div>
                      <span className="font-bold text-slate-850 text-xs block mb-1">
                        Cycle: {startYear} - {endYear}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Validity: {cycle.startDate} to {cycle.endDate}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Earning: {cycle.earningStartDate} to {cycle.earningEndDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[9px] text-slate-500 block mb-1 uppercase font-bold">Entitlement</span>
                        <input
                          type="number"
                          value={cycle.entitlementDays}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated = [...vacationCycles];
                            updated[idx] = { ...cycle, entitlementDays: val };
                            setVacationCycles(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded p-1 w-16 text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                          min="0"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 block mb-1 uppercase font-bold">Carried Over</span>
                        <input
                          type="number"
                          value={cycle.carriedOverDays}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated = [...vacationCycles];
                            updated[idx] = { ...cycle, carriedOverDays: val };
                            setVacationCycles(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded p-1 w-16 text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              * Danish vacation cycles are calculated automatically based on your standard settings. Here, you can manually adjust/correct carried-over days or change the default entitlement per cycle if you joined the company mid-cycle.
            </p>
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

        {/* Data Backup & Restore (Native-Aware JSON Import/Export) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="data-backup-and-restore-section">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="text-brand-blue w-5 h-5" />
            <span>Data Backup & Restore</span>
          </h3>

          <div className="space-y-4 text-xs leading-relaxed text-slate-600">
            <p>
              Export your complete settings, customized category colors, registered company directories, public holidays database, and all logged calendar work entries to a single portable JSON file. Restore your backup at any time on this device or transfer it to another device.
            </p>

            {/* Hidden web input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleWebImport}
              className="hidden"
              id="web-backup-file-input"
            />

            {/* Error & Success indicators */}
            {backupError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="backup-error-banner">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-red-950 block mb-0.5">Import Error</span>
                  <p className="text-[11px] text-red-900 leading-normal">{backupError}</p>
                </div>
              </div>
            )}

            {backupSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="backup-success-banner">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-emerald-950 block mb-0.5">Success</span>
                  <p className="text-[11px] text-emerald-900 leading-normal">{backupSuccess}</p>
                </div>
              </div>
            )}

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={exportBackup}
                className="flex-1 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export Backup JSON</span>
              </button>

              <button
                type="button"
                onClick={Capacitor.isNativePlatform() ? handleNativeImport : () => fileInputRef.current?.click()}
                className="flex-1 bg-brand-blue hover:opacity-90 active:opacity-80 text-white font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Import Backup JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Seamless Time-Tracking Import Wizard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="time-tracking-import-wizard-section">
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileSpreadsheet className="text-brand-blue w-5 h-5" />
            <span>Time-Tracking Import Wizard</span>
          </h3>

          <div className="space-y-4 text-xs leading-relaxed text-slate-600">
            <p>
              Seamlessly import your older historical time-tracking records from an external spreadsheet (e.g. Excel, Google Sheets) or another device.
            </p>

            {/* Date format config checkbox */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm select-none" id="date-format-selector-wrapper">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="import-mm-dd-yy-checkbox"
                  checked={importIsMMDDYY}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setImportIsMMDDYY(checked);
                    if (importRawText && importRawFileName) {
                      processTimeTrackingFile(importRawText, importRawFileName, checked);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer accent-brand-blue"
                />
                <label htmlFor="import-mm-dd-yy-checkbox" className="font-bold text-slate-700 cursor-pointer text-xs">
                  Interpret dates in MM-DD-YY format
                </label>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Default format: <strong className="text-slate-600 font-bold">DD-MM-YY</strong>
              </span>
            </div>

            <input
              type="file"
              ref={importFileInputRef}
              accept=".csv,.json"
              onChange={handleImportFileChange}
              className="hidden"
              id="import-wizard-file-input"
            />

            {/* Error & Success banner triggers */}
            {importError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="import-error-banner">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-rose-950 block mb-0.5">Parsing Failed</span>
                  <p className="text-[11px] text-rose-900 leading-normal">{importError}</p>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="import-success-banner">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-emerald-950 block mb-0.5">Import Succeeded</span>
                  <p className="text-[11px] text-emerald-900 leading-normal">{importSuccess}</p>
                </div>
              </div>
            )}

            {/* Drag & Drop or Click upload zone */}
            {importPreviewRows.length === 0 && (
              <div
                onClick={() => importFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-brand-blue bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition space-y-2.5 group"
                id="import-drag-drop-zone"
              >
                <div className="mx-auto w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue group-hover:scale-105 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Click to upload spreadsheet or backup</p>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts CSV or JSON format (Up to 5 MB)</p>
                </div>

                <div className="border-t border-slate-200/60 pt-3 mt-2 text-left space-y-1.5 text-[10px] text-slate-500">
                  <p className="font-bold text-slate-700">CSV Header Specification:</p>
                  <p className="font-mono bg-white p-1.5 rounded border border-slate-100 overflow-x-auto whitespace-nowrap">
                    Week, Date, Time IN, time OUT, Hours, Location/Day type, Description/Notes
                  </p>
                  <p className="text-slate-400">
                    * Date formats like <span className="font-mono">DD/MM/YYYY</span>, <span className="font-mono">YYYY-MM-DD</span> and categories (Office, WFH, Vacation, Sick, Holiday) are dynamically detected and auto-aligned.
                  </p>
                </div>
              </div>
            )}

            {/* Live Interactive Preview Zone */}
            {importPreviewRows.length > 0 && importFileDetails && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4 animate-fade-in" id="import-preview-zone">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Parsing</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileCode className="w-4 h-4 text-brand-blue" />
                      <span className="font-bold text-slate-800 font-mono text-[11px]">{importFileDetails.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({importFileDetails.size})</span>
                    </div>
                  </div>

                  {/* Duplicate Strategy Selection */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Duplicate Strategy</span>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setImportDuplicateStrategy('overwrite')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                          importDuplicateStrategy === 'overwrite'
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Overwrite
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportDuplicateStrategy('skip')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                          importDuplicateStrategy === 'skip'
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Skip Match
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statistics panel */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Parsed</span>
                    <span className="block font-mono text-[11px] font-bold text-slate-800 mt-0.5">{importPreviewRows.length} entries</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Matches Found</span>
                    <span className="block font-mono text-[11px] font-bold text-amber-600 mt-0.5">
                      {importPreviewRows.filter(r => entries.some(e => e.date === r.date)).length} dates
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Action Mode</span>
                    <span className="block font-bold text-brand-blue text-[9px] uppercase mt-0.5">
                      {importDuplicateStrategy === 'overwrite' ? 'Overwrite' : 'Skip Match'}
                    </span>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Previewing First 5 Parsed Records</span>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {importPreviewRows.slice(0, 5).map((row, idx) => {
                      const isDuplicate = entries.some(e => e.date === row.date);
                      return (
                        <div key={idx} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition text-[11px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-800">{row.date}</span>
                            <span className="text-slate-400 font-medium font-mono">({row.weekday.slice(0, 3)})</span>
                            
                            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                              {row.category}
                            </span>

                            {isDuplicate && (
                              <span className="text-[8px] bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded uppercase font-bold">
                                {importDuplicateStrategy === 'overwrite' ? 'Overwrite' : 'Skip'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-[10px] font-medium text-slate-500">
                              {row.entryTime && row.exitTime ? (
                                <span className="font-mono">{row.entryTime} - {row.exitTime}</span>
                              ) : (
                                <span>No Times</span>
                              )}
                            </div>
                            <span className="font-mono font-extrabold text-brand-blue text-[11px] bg-brand-blue/10 px-1.5 py-0.5 rounded min-w-[45px] text-center">
                              {row.finalCountedHours} hrs
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {importPreviewRows.length > 5 && (
                      <div className="p-2 text-center text-[10px] text-slate-400 font-semibold italic bg-slate-50/30 border-t border-slate-100">
                        + {importPreviewRows.length - 5} more parsed entries in this file
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setImportPreviewRows([]);
                      setImportFileDetails(null);
                      setImportError(null);
                      setImportRawText(null);
                      setImportRawFileName(null);
                      setImportIsMMDDYY(false);
                    }}
                    className="flex-1 bg-slate-200/80 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition cursor-pointer text-center"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={executeCommitImport}
                    className="flex-1 bg-brand-blue hover:opacity-95 text-white py-2.5 rounded-xl transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Commit Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual Confirm Modal for overwriting existing data */}
        {isImportConfirming && pendingImportData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 text-amber-800 p-2.5 rounded-full shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-650" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Overwrite Current Data?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are about to restore a complete settings & entries backup file. This action is irreversible and will replace all your current logs and preferences.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Current Local Database:</span>
                  <span className="text-slate-800 font-bold">{pendingImportData.currentCount} entries</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-semibold">Incoming Backup File:</span>
                  <span className="text-brand-blue font-bold">+{pendingImportData.backupCount} entries</span>
                </div>
                <div className="text-[10px] text-slate-400 text-center pt-2 italic leading-snug font-sans">
                  Full User Settings (category colors, standard hours, corporate branches, custom overtime credit rules) will be completely restored.
                </div>
              </div>

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportConfirming(false);
                    setPendingImportData(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 bg-brand-blue hover:opacity-90 text-white py-3 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Confirm Overwrite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Confirm Modal for clear & seed */}
        {isReseedConfirming && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans" id="reseed-confirm-modal">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 text-amber-800 p-2.5 rounded-full shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Clear & Seed Demo Data?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>CAUTION:</strong> This will clear ALL custom work entries, registered company branches, custom holidays, and re-seed the system with simulated logs for 2026. This action is irreversible.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsReseedConfirming(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReseedConfirming(false);
                    onClearAndReseed();
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Confirm & Reseed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Confirm Modal for erase all entries */}
        {isEraseConfirming && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans" id="erase-confirm-modal">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-rose-100 text-rose-800 p-2.5 rounded-full shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Erase All Work Entries?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>CAUTION:</strong> This will delete all of your logged work entries. This keeps core application configuration, holidays, settings, and other baseline data intact. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsEraseConfirming(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEraseConfirming(false);
                    onEraseAllEntries();
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Confirm & Erase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Developer / Demo Tools gated section */}
        {isDebugUnlocked && (
          <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl shadow-sm space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <div>
                <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Developer & Demo Sandboxing</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Simulate rich data environments and verify SKAT calculation compliance metrics.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsReseedConfirming(true);
                }}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300 shadow-sm"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Clear & Seed Demo Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEraseConfirming(true);
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Erase All Entries</span>
              </button>

              <div className="text-[9px] text-amber-700/80 font-mono bg-white/60 border border-amber-200 px-2 py-1 rounded-md">
                Sandbox Mode Active (Settings Override Enabled)
              </div>
            </div>
          </div>
        )}

        {/* Global Action & State Configuration */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white border border-slate-200 p-5 rounded-2xl gap-4 shadow-sm">
          <div>
            <span className="text-xs font-bold text-brand-slate block">Actions & State Configuration</span>
            <span className="text-[11px] text-slate-500">Reset default workspaces or save parameters permanently.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Short fine print instruction on enabling developer settings */}
        <div className="text-center text-[9px] italic font-medium text-slate-400 select-none pt-2 tracking-tight whitespace-nowrap">
          Tip: Tap your profile name/avatar in the sidebar 5 times to reveal hidden developer settings.
        </div>
      </form>
    </div>
  );
}
