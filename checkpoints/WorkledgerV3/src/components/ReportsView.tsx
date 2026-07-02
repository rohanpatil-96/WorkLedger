/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { calculateCommuteDeduction, isWeekend, getCommuteDistance } from '../utils/calculations';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Copy,
  Calendar,
  Layers,
  Coins,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase
} from 'lucide-react';

interface ReportsViewProps {
  entries: DayEntry[];
  settings: UserSettings;
}

export default function ReportsView({ entries, settings }: ReportsViewProps) {
  const currentLocalTime = new Date();
  const activeYear = currentLocalTime.getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(activeYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentLocalTime.getMonth() + 1);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('yearly');

  // Copy success indicator
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showChronologicalStatement, setShowChronologicalStatement] = useState<boolean>(false);
  const [printTipOpen, setPrintTipOpen] = useState<boolean>(false);

  // Filter lists based on preferences
  const yearEntries = useMemo(() => {
    return entries.filter((e) => e.year === selectedYear);
  }, [entries, selectedYear]);

  const reportEntries = useMemo(() => {
    if (reportType === 'monthly') {
      return yearEntries.filter((e) => e.month === selectedMonth).sort((a, b) => a.date.localeCompare(b.date));
    }
    return [...yearEntries].sort((a, b) => a.date.localeCompare(b.date));
  }, [yearEntries, reportType, selectedMonth]);

  // Count by category helper
  const countByCategory = (list: DayEntry[], cat: WorkCategory) =>
    list.filter((e) => e.category === cat).length;

  const wfhDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.WFH), [reportEntries]);
  const officeDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Office), [reportEntries]);
  const otherOfficeDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.OtherOffice), [reportEntries]);
  const vacationDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Vacation), [reportEntries]);
  const sickDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Sick), [reportEntries]);
  const holidaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Holiday), [reportEntries]);
  const unpaidCount = useMemo(() => countByCategory(reportEntries, WorkCategory.UnpaidFerie), [reportEntries]);

  // Commute tax settings
  const activeTaxSetting = useMemo(() => {
    return settings.taxRates.find((t) => t.year === selectedYear) || {
      year: selectedYear,
      thresholdKm: 24,
      rate1: 2.28,
      rate2: 1.14,
      limitKm: 120
    };
  }, [settings, selectedYear]);

  const deductionPerDay = useMemo(() => {
    return calculateCommuteDeduction(Number(settings.roundTripDistanceKm || 0), activeTaxSetting);
  }, [settings, activeTaxSetting]);

  const commuteDaysCount = useMemo(() => {
    return reportEntries.filter((e) => getCommuteDistance(e, settings) > 0).length;
  }, [reportEntries, settings]);

  const estimatedDeductionSum = useMemo(() => {
    return reportEntries.reduce((acc, e) => {
      const dist = getCommuteDistance(e, settings);
      return acc + calculateCommuteDeduction(dist, activeTaxSetting);
    }, 0);
  }, [reportEntries, settings, activeTaxSetting]);

  const totalHoursCounted = useMemo(() => {
    return reportEntries.reduce((acc, e) => acc + e.finalCountedHours, 0);
  }, [reportEntries]);

  const overtimeSumValue = useMemo(() => {
    return reportEntries.reduce((acc, e) => acc + e.overtime, 0);
  }, [reportEntries]);

  // --- DOWNLOAD CSV HANDLER ---
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // BOM to preserve Danish characters
    csvContent += 'Date,Weekday,Week,Month,Year,Category,EntryTime,ExitTime,BreakMinutes,CalculatedHours,FinalCountedHours,OvertimeShift,Notes\n';

    reportEntries.forEach((e) => {
      const notesClean = (e.notes || '').replace(/"/g, '""');
      csvContent += `${e.date},${e.weekday},${e.weekNumber},${e.month},${e.year},"${e.category}",${e.entryTime || ''},${e.exitTime || ''},${e.breakMinutes ?? ''},${e.calculatedHours},${e.finalCountedHours},${e.overtime},"${notesClean}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danish_workdays_report_${reportType}_${selectedYear}${reportType === 'monthly' ? '_' + selectedMonth : ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TAB-DELIMITED (GOOGLE SHEETS COMPATIBLE) ---
  const handleCopyTSV = () => {
    let tsv = 'Date\tWeekday\tWeek\tCategory\tEntry\tExit\tBreak\tHours\tOvertime\tNotes\n';

    reportEntries.forEach((e) => {
      tsv += `${e.date}\t${e.weekday}\t${e.weekNumber}\t${e.category}\t${e.entryTime || ''}\t${e.exitTime || ''}\t${e.breakMinutes ?? ''}\t${e.finalCountedHours}\t${e.overtime}\t${e.notes || ''}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    });
  };

  const handlePrintPDF = () => {
    try {
      window.print();
    } catch (e) {
      console.error('Print trigger error:', e);
    }
    setPrintTipOpen(true);
  };

  const monthsNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="reports-exporting-workspace">
      {/* Configuration Widget Controls */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-brand-slate flex items-center gap-2">
            <FileText className="text-brand-blue" />
            <span>Generate Workday Statements</span>
          </h3>
          <p className="text-xs text-slate-500">
            Export schedules to CSV, copy directly into Google Sheets, or print structured tax statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Report Scope Selector */}
          <div className="bg-slate-100 p-1 border border-slate-200 rounded-xl flex">
            <button
              onClick={() => setReportType('yearly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportType === 'yearly' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Year scope
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportType === 'monthly' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Month scope
            </button>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value={2026}>2026 Tax Year: 2.28 kr</option>
            <option value={2025}>2025 Tax Year: 2.23 kr</option>
          </select>

          {reportType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {monthsNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Primary Export Actions Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden" id="reports-quick-actions-bar">
        <button
          onClick={handleExportCSV}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm"
        >
          <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue/20 transition">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-brand-slate block">Download Raw CSV</span>
            <span className="text-[10px] text-slate-500">Preserves Danish characters</span>
          </div>
        </button>

        <button
          onClick={handleCopyTSV}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-brand-green group-hover:bg-emerald-105/70 transition">
            {copiedStatus ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-emerald-700" />}
          </div>
          <div>
            <span className="font-bold text-brand-slate block">{copiedStatus ? 'Copied To Clipboard!' : 'Copy to Google Sheets'}</span>
            <span className="text-[10px] text-slate-505">Clipboard-ready tab data</span>
          </div>
        </button>

        <button
          onClick={handlePrintPDF}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm"
        >
          <div className="p-2.5 rounded-xl bg-brand-peach/10 text-amber-700 group-hover:bg-brand-peach/20 transition">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-brand-slate block">Print PDF Statement</span>
            <span className="text-[10px] text-slate-505">Pre-styled tax audit page</span>
          </div>
        </button>
      </div>

      {/* PDF Fixed Repeating Page Header */}
      <div className="hidden print:flex fixed top-[0.4in] left-[0.6in] right-[0.6in] justify-between items-center border-b border-[#2C3639]/10 pb-3" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#2C3639] flex items-center justify-center text-[#DCD7C9] font-bold">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#DCD7C9" />
              <path d="M8 9H16M8 13H13" stroke="#2C3639" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight text-[#2C3639]">WorkLedger</span>
        </div>
        <span className="text-[10px] text-[#A27B5B] font-mono tracking-widest uppercase">Official Time & Commute Ledger</span>
      </div>

      {/* PDF Fixed Repeating Page Footer */}
      <div className="hidden print:flex fixed bottom-[0.4in] left-[0.6in] right-[0.6in] justify-between items-center border-t border-[#2C3639]/10 pt-3" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        <span className="italic text-[9px] text-[#8C7C6B]">
          Generated by WorkLedger Denmark • Report Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span className="text-[9px] text-[#2C3639] font-bold whitespace-nowrap">
          Page <span className="print-page-counter"></span>
        </span>
      </div>

      {/* Style injection for PDF Print Layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin-top: 1.3in;
            margin-bottom: 1.0in;
            margin-left: 0.6in;
            margin-right: 0.6in;
          }

          body, #main-application-container {
            background-color: #FAF8F5 !important;
            color: #2C3639 !important;
          }

          /* Force high-integrity background graphics printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide Screen Only elements */
          .print\\:hidden, #reports-exporting-workspace > div:first-child, #reports-quick-actions-bar, #reports-print-assistance-button {
            display: none !important;
          }

          /* Remove outside boundary of report canvas */
          #printable-auditable-report-canvas {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Premium Inverted Style for Windows/Cards */
          .print-inverted-window {
            background-color: #FAF8F5 !important;
            color: #2C3639 !important;
            border: 1px solid #DFD7C9 !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            padding: 18px !important;
            margin-bottom: 18px !important;
          }

          /* Inner cards */
          .print-inner-card {
            background-color: #F3EFE9 !important;
            border-color: #DFD7C9 !important;
            color: #2C3639 !important;
          }

          /* Text colors on print */
          .print-text-primary {
            color: #2C3639 !important;
          }
          
          .print-text-accent {
            color: #A27B5B !important;
          }

          .print-text-neutral {
            color: #5C4D3C !important;
          }

          .print-text-muted {
            color: #8C7C6B !important;
          }

          /* Table inside printed windows */
          .print-table {
            background-color: transparent !important;
            color: #2C3639 !important;
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          .print-table thead tr {
            background-color: #F3EFE9 !important;
            border-bottom: 1.5px solid #DFD7C9 !important;
          }

          .print-table thead th {
            background-color: #F3EFE9 !important;
            color: #2C3639 !important;
            font-family: "Plus Jakarta Sans", sans-serif !important;
            font-size: 10px !important;
            border-bottom: 1.5px solid #DFD7C9 !important;
          }

          .print-table tbody tr {
            border-bottom: 1px solid #F3EFE9 !important;
          }

          .print-table tbody td {
            color: #2C3639 !important;
          }

          /* Explicit printed table column sizing for clean alignment */
          .print-table th:nth-child(1), .print-table td:nth-child(1) { width: 16% !important; } /* Date */
          .print-table th:nth-child(2), .print-table td:nth-child(2) { width: 14% !important; } /* Weekday */
          .print-table th:nth-child(3), .print-table td:nth-child(3) { width: 10% !important; text-align: center !important; } /* Week */
          .print-table th:nth-child(4), .print-table td:nth-child(4) { width: 16% !important; text-align: center !important; } /* Worked Hours */
          .print-table th:nth-child(5), .print-table td:nth-child(5) { width: 14% !important; text-align: center !important; } /* Overtime */
          .print-table th:nth-child(6), .print-table td:nth-child(6) { width: 30% !important; } /* Notes */

          .print-table th.text-center, .print-table td.text-center {
            text-align: center !important;
          }

          .print-overtime-positive {
            color: #6BCB77 !important;
          }

          .print-overtime-negative {
            color: #EF4444 !important;
          }

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Retain beautiful grids in print viewport width */
          .print-grid-3 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .print-grid-4 {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .print-grid-7 {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          /* Page numbering increments automatically in @page */
          body {
            counter-reset: page;
          }
          .print-page-counter::after {
            content: counter(page);
          }
        }
      ` }} />

      {/* Printable Report Canvas Frame */}
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-7 print:bg-transparent print:p-0 print:border-none print:shadow-none print:space-y-6"
        id="printable-auditable-report-canvas"
      >
                        {/* Premium Title & Details Workspace Header */}
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-6 print-avoid-break">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-brand-peach uppercase tracking-wider block">
                          Official Ledger & Audit Trail
                        </span>
                        <h2 className="text-xl md:text-2xl font-serif text-brand-slate dark:text-white tracking-tight leading-tight print-text-primary">
                          Denmark Workday Hours & Commute Log
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-505 dark:text-slate-400 mt-1">
                          <span>Statement Timeframe:</span>
                          <strong className="text-slate-700 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded font-mono text-[11px] print-inner-card">
                            {reportType === 'monthly' ? `${monthsNames[selectedMonth - 1]} ` : 'Full Calendar '}{selectedYear}
                          </strong>
                        </div>
                      </div>
                      
                      <div className="text-right text-[10px] text-slate-400 font-mono tracking-wider hidden print:block">
                        SECURE DECENTRALIZED COMPLIANCE RECORD
                      </div>
                    </div>

                    {/* Premium User Information Info Grid - HIDDEN IN APP BUILD, preserved only in printed documents */}
                    <div className="hidden print:grid grid-cols-3 gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/50 pt-5 text-xs print-grid-3">
                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">LEDGER SUBJECT</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">{settings.userName || 'Rohan Patil'}</strong>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px] mt-0.5">{settings.userName ? `${settings.userName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'rohanpatil96@gmail.com'}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">EMPLOYER COMPLIANCE</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">{settings.activeCompany || 'Danfoss Power Electronics A/S'}</strong>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[10px] mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            Active Hybrid Work Schema
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">REGULATORY SCHEME</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">SKAT (Danish Tax Agency)</strong>
                          <span className="text-brand-peach font-bold block text-[10px] mt-0.5">Section 9 C (Befordringsfradrag)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categories Ledger overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print-grid-4">
                    {/* Total Hours Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hours</span>
                        <span className="bg-brand-blue/10 text-brand-blue p-1.5 rounded-lg shrink-0">
                          <Clock className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#2C3639] font-mono tracking-tight block">
                          {totalHoursCounted.toFixed(2)} <span className="text-xs font-normal text-slate-500">hrs</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total hours counted</span>
                      </div>
                    </div>

                    {/* Overtime Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Negative overtime on Unpaid Vacation days reflects unworked standard hours per SKAT rules.">
                          Overtime Summary <span className="text-slate-400 text-[10px]">ⓘ</span>
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-lg shrink-0">
                          <Clock className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className={`text-2xl font-extrabold font-mono tracking-tight block ${overtimeSumValue >= 0 ? 'text-[#73825E]' : 'text-rose-600'}`}>
                          {overtimeSumValue >= 0 ? `+${overtimeSumValue.toFixed(2)}` : overtimeSumValue.toFixed(2)} <span className="text-xs font-normal text-slate-500">hrs</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Overtime balance</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic leading-snug border-t border-slate-100 pt-2">
                        * Negative overtime on Unpaid Vacation days reflects unworked standard hours per SKAT rules.
                      </p>
                    </div>

                    {/* Eligible SKAT Days Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible SKAT Days</span>
                        <span className="bg-indigo-500/10 text-indigo-600 p-1.5 rounded-lg shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#2C3639] font-mono tracking-tight block">
                          {commuteDaysCount} <span className="text-xs font-normal text-slate-500">days</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Eligible office days</span>
                      </div>
                    </div>

                    {/* Est. SKAT Deduction Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. SKAT Deduction</span>
                        <span className="bg-amber-500/10 text-amber-600 p-1.5 rounded-lg shrink-0">
                          <Coins className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#3F4E4F] font-mono tracking-tight block">
                          {estimatedDeductionSum.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                          <span className="text-xs font-normal text-slate-500">DKK</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Estimated deduction</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Category counter block */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print-inverted-window print-avoid-break">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-blue" />
                      <span>Detailed Category Counter</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-blue shrink-0" />
                          <span className="truncate">Office</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {officeDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                          <span className="truncate">WFH</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {wfhDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate">Diff Branch</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {otherOfficeDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-green shrink-0" />
                          <span className="truncate">Vacation</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {vacationDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-peach shrink-0" />
                          <span className="truncate">Sick Day</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {sickDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">Holiday</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {holidaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">Unpaid</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {unpaidCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Commute explanation block */}
                <div className="bg-[#DCD7C9] p-6 rounded-2xl border border-[#DFD7C9] shadow-sm space-y-3 print-inverted-window print-avoid-break font-sans text-[#2C3639]">
                  <div className="text-xs font-bold text-[#2C3639] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Coins className="w-4 h-4 text-[#2C3639] shrink-0" /> Commute Tax Calculation Method (Danish SKAT rules)
                  </div>
                  <p className="text-xs text-[#2C3639] leading-relaxed font-sans">
                    The commute deduction estimate is calculated dynamically based on Danish tax laws for {selectedYear} for high-integrity audit logs:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#2C3639] font-sans">
                    <li className="font-sans">Default Office ({settings.defaultOfficeLocationName || 'Default Office Location'}) round-trip distance checked is: <strong className="text-[#2C3639] font-bold font-sans">{settings.roundTripDistanceKm} km</strong>.</li>
                    <li className="font-sans">First 24 km of any commute gets no refund. Deductible distance: <strong className="text-[#2C3639] font-bold font-sans">{Math.max(0, Number(settings.roundTripDistanceKm || 0) - 24)} km / default commuter day</strong>.</li>
                    <li className="font-sans">Portion 25 - 120 km rate is: <strong className="text-[#2C3639] font-bold font-sans">{activeTaxSetting.rate1} DKK/km</strong>.</li>
                    <li className="font-sans">Portion above 120 km rate is: <strong className="text-[#2C3639] font-bold font-sans">{activeTaxSetting.rate2} DKK/km</strong>.</li>
                    <li className="font-sans">Different office locations: <strong className="text-[#2C3639] font-bold font-sans">Included dynamically</strong> if enabled in settings, using their specific round-trip distances.</li>
                    <li className="font-sans">Exclusions: Saturdays/Sundays, Sick spells, Vacation, non-commute remote locations, and Work-from-Home days.</li>
                  </ul>
                </div>

                {/* Items tabular statement report list */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 print:border-none print:pt-0">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 print:hidden animate-fade-in">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Chronological Statement of Workdays
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-705 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl shadow-xs select-none">
                        📊 {reportEntries.filter(e => e.category === WorkCategory.Office).length} office days recorded
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowChronologicalStatement(!showChronologicalStatement)}
                        className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-705 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                      >
                        <span>{showChronologicalStatement ? 'Hide Statement' : 'Show Statement'}</span>
                        {showChronologicalStatement ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hidden print:block">
                    Chronological Statement of Workdays (Office Commutes Only)
                  </h4>

                  <div className={`${showChronologicalStatement ? 'block' : 'hidden print:block'} space-y-6`}>
                    {useMemo(() => {
                      const groups: { [key: number]: DayEntry[] } = {};
                      reportEntries.forEach((e) => {
                        if (e.category === WorkCategory.Office) {
                          if (!groups[e.month]) {
                            groups[e.month] = [];
                          }
                          groups[e.month].push(e);
                        }
                      });

                      return Object.keys(groups)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((m) => ({
                          monthNum: m,
                          monthName: monthsNames[m - 1],
                          entries: groups[m].sort((a, b) => a.date.localeCompare(b.date))
                        }));
                    }, [reportEntries]).map((group) => (
                      <div 
                        key={group.monthNum} 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs print-inverted-window print-avoid-break space-y-3"
                      >
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                          <h5 className="font-semibold text-sm text-brand-slate dark:text-white uppercase tracking-wider print:text-white font-serif">
                            {group.monthName} {selectedYear}
                          </h5>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold print-inner-card">
                            {group.entries.length} office {group.entries.length === 1 ? 'day' : 'days'}
                          </span>
                        </div>

                        <div className="overflow-hidden rounded-lg">
                          <table className="w-full text-left text-xs border-collapse font-sans print-table">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                                <th className="p-2.5 font-mono">Date</th>
                                <th className="p-2.5">Weekday</th>
                                <th className="p-2.5 text-center">Week</th>
                                <th className="p-2.5 text-center font-bold">Worked Hours</th>
                                <th className="p-2.5 text-center font-bold">Overtime</th>
                                <th className="p-2.5">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-350 font-semibold">
                              {group.entries.map((e) => (
                                <tr key={e.date} className="break-inside-avoid hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                                  <td className="p-2.5 font-mono whitespace-nowrap text-slate-800 dark:text-slate-200 font-bold text-[11px] print-text-primary">{e.date}</td>
                                  <td className="p-2.5 font-medium text-slate-505 dark:text-slate-450">{e.weekday}</td>
                                  <td className="p-2.5 text-center font-mono text-[10px]">{e.weekNumber}</td>
                                  <td className="p-2.5 text-center font-bold font-mono text-slate-850 dark:text-slate-200 text-[11px] print-text-primary">{e.finalCountedHours.toFixed(2)} hrs</td>
                                  <td className="p-2.5 text-center font-bold font-mono">
                                    <span className={e.overtime > 0 ? 'text-[#73825E] dark:text-[#8A9A76] print-overtime-positive' : e.overtime < 0 ? 'text-rose-605 font-bold print-overtime-negative' : 'text-slate-400'}>
                                      {e.overtime >= 0 ? `+${e.overtime.toFixed(2)}` : e.overtime.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 break-words whitespace-normal text-slate-500 dark:text-slate-400 font-normal italic print-text-neutral" title={e.notes}>
                                    {e.notes || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    
                    {useMemo(() => reportEntries.filter(e => e.category === WorkCategory.Office).length, [reportEntries]) === 0 && (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic font-medium bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-xl print-inverted-window">
                        No office commute entries recorded in the selected timeframe.
                      </div>
                    )}
                  </div>
                </div>
              </div>

      {/* PDF Print Assistance Overlay Modal */}
      {printTipOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up text-xs">
            <div className="flex items-center gap-2.5 text-brand-blue dark:text-brand-peach">
              <Printer className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">PDF Print Workspace Tips</h3>
            </div>
            
            <div className="space-y-3 text-slate-700 dark:text-slate-200 leading-relaxed">
              <p>
                Because this application is currently rendered in an <strong>interactive live iframe</strong>, different browsers restrict direct printer triggers for security reasons.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/65 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/65 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block text-[11px] uppercase tracking-wide">Quick 2-Step Safe Print:</span>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <li>Click the <strong className="text-brand-blue">"Open App in New Tab"</strong> icon in the top right header of your preview workspace.</li>
                  <li>Click <strong>Print PDF Statement</strong> there. Your native browser print options panel will load immediately for high-resolution storage or paper saving.</li>
                </ol>
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 italic">
                Pro-tip: In the print dialog, specify "Save as PDF" as destination and enable "Background Graphics" for standard colors.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPrintTipOpen(false)}
                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl transition cursor-pointer text-center select-none"
              >
                Understood, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
