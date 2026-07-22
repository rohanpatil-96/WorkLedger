/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { calculateCommuteDeduction, isWeekend, getCommuteDistance, getWeekNumber } from '../utils/calculations';
import {
  TrendingUp,
  Briefcase,
  Home as HomeIcon,
  Calendar,
  Layers,
  Percent,
  Clock,
  Coins,
  ShieldCheck,
  Stethoscope,
  Umbrella,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart2
} from 'lucide-react';

interface DashboardViewProps {
  entries: DayEntry[];
  settings: UserSettings;
}

export default function DashboardView({ entries, settings }: DashboardViewProps) {
  // Use current local time
  const currentLocalTime = new Date();
  const activeYear = currentLocalTime.getFullYear();
  const activeMonth = currentLocalTime.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(activeYear);
  const [showVisualViews, setShowVisualViews] = useState<boolean>(false);

  // Filter entries of the selected year
  const yearEntries = entries.filter((e) => e.year === selectedYear);

  // Filter entries of active month in selected year
  const monthEntries = yearEntries.filter((e) => e.month === activeMonth);

  // --- OVERTIME CALCULATIONS ---
  const cumulativeOvertime = entries.reduce((acc, e) => acc + e.overtime, 0);
  const yearOvertimeSum = yearEntries.reduce((acc, e) => acc + e.overtime, 0);
  const monthOvertimeSum = monthEntries.reduce((acc, e) => acc + e.overtime, 0);

  // Current week overtime
  const currentWeekNum = getWeekNumber(currentLocalTime); 
  const weekOvertimeSum = yearEntries
    .filter((e) => e.weekNumber === currentWeekNum)
    .reduce((acc, e) => acc + e.overtime, 0);

  // --- ATTENDANCE COUNTS ---
  const countByCategory = (list: DayEntry[], cat: WorkCategory) =>
    list.filter((e) => e.category === cat).length;

  const mOffice = countByCategory(monthEntries, WorkCategory.Office);
  const yOffice = countByCategory(yearEntries, WorkCategory.Office);

  const mWFH = countByCategory(monthEntries, WorkCategory.WFH);
  const yWFH = countByCategory(yearEntries, WorkCategory.WFH);

  const mVacation = countByCategory(monthEntries, WorkCategory.Vacation);
  const yVacation = countByCategory(yearEntries, WorkCategory.Vacation);

  const mSick = countByCategory(monthEntries, WorkCategory.Sick);
  const ySick = countByCategory(yearEntries, WorkCategory.Sick);

  const mHoliday = countByCategory(monthEntries, WorkCategory.Holiday);
  const yHoliday = countByCategory(yearEntries, WorkCategory.Holiday);

  const mUnpaid = countByCategory(monthEntries, WorkCategory.UnpaidFerie);
  const yUnpaid = countByCategory(yearEntries, WorkCategory.UnpaidFerie);

  const mOtherOffice = countByCategory(monthEntries, WorkCategory.OtherOffice);
  const yOtherOffice = countByCategory(yearEntries, WorkCategory.OtherOffice);

  // --- COMMUTE DEDUCTION ESTIMATES (SKAT) ---
  const taxRateSetting = settings.taxRates.find((t) => t.year === selectedYear) || {
    year: selectedYear,
    thresholdKm: 24,
    rate1: 2.28,
    rate2: 1.14,
    limitKm: 120
  };

  const dayDeduction = calculateCommuteDeduction(Number(settings.roundTripDistanceKm || 0), taxRateSetting);

  const monthOfficeDaysForDeduction = monthEntries.filter((e) => getCommuteDistance(e, settings) > 0).length;
  const yearOfficeDaysForDeduction = yearEntries.filter((e) => getCommuteDistance(e, settings) > 0).length;

  const monthEstimatedDeduction = monthEntries.reduce((acc, e) => {
    const dist = getCommuteDistance(e, settings);
    return acc + calculateCommuteDeduction(dist, taxRateSetting);
  }, 0);

  const yearEstimatedDeduction = yearEntries.reduce((acc, e) => {
    const dist = getCommuteDistance(e, settings);
    return acc + calculateCommuteDeduction(dist, taxRateSetting);
  }, 0);

  // --- CHART DATA PREPARATION ---
  const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const mNum = i + 1;
    const mList = yearEntries.filter((e) => e.month === mNum);
    const officeCount = countByCategory(mList, WorkCategory.Office);
    const wfhCount = countByCategory(mList, WorkCategory.WFH);
    const otDiff = mList.reduce((acc, e) => acc + e.overtime, 0);

    return {
      monthLabel: monthsNames[i],
      office: officeCount,
      wfh: wfhCount,
      overtime: parseFloat(otDiff.toFixed(2))
    };
  });

  const categoryShares = Object.values(WorkCategory).map((cat) => {
    const count = countByCategory(yearEntries, cat);
    return {
      name: cat,
      count,
      percentage: yearEntries.length > 0 ? Math.round((count / yearEntries.length) * 100) : 0
    };
  });

  const getTailwindBgColor = (cat: WorkCategory) => {
    switch (cat) {
      case WorkCategory.Office: return 'bg-brand-blue';
      case WorkCategory.WFH: return 'bg-teal-500';
      case WorkCategory.Holiday: return 'bg-rose-500';
      case WorkCategory.Vacation: return 'bg-brand-green';
      case WorkCategory.Sick: return 'bg-brand-peach';
      case WorkCategory.UnpaidFerie: return 'bg-slate-400';
      case WorkCategory.OtherOffice: return 'bg-indigo-500';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-analytical-workspace">
      {/* Amber warning banner when roundTripDistanceKm is empty or 0 */}
      {(settings.roundTripDistanceKm === '' || settings.roundTripDistanceKm === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-slate-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="commute-distance-dashboard-warning">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-900 font-semibold leading-normal">
              Commute distance not set - SKAT deduction is currently 0. Go to Settings to enter your daily round-trip distance.
            </p>
          </div>
        </div>
      )}

      {/* Year Selection Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 p-5 rounded-2xl gap-3 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2">
            <TrendingUp className="text-brand-blue w-5 h-5" />
            <span>WorkLedger Personal Dashboard</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Round-trip commute dist:{' '}
            <strong className="text-slate-800">{settings.roundTripDistanceKm} km</strong>. Standard workday benchmark:{' '}
            <strong className="text-slate-800">{settings.standardWorkdayHours} hrs</strong>.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Select Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-mono"
          >
            <option value={2026}>2026 Tax Year</option>
            <option value={2025}>2025 Tax Year</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Metrics: Overtime and WFH counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overtime KPI card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden" id="overtime-total-balance-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.">
              Overtime Balance ({selectedYear} YTD) <span className="text-slate-400 text-[10px]">ⓘ</span>
            </span>
            <span className="bg-brand-blue/10 text-brand-blue p-1.5 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className={`text-2xl font-extrabold font-mono tracking-tight block ${
              yearOvertimeSum >= 0 ? 'text-brand-green' : 'text-rose-500'
            }`}>
              {yearOvertimeSum >= 0 ? `+${yearOvertimeSum.toFixed(2)}` : `${yearOvertimeSum.toFixed(2)}`} hrs
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Cumulative Balance ({selectedYear})</span>
          </div>
          <div className="bg-slate-50/60 p-2 rounded-xl text-[11px] text-slate-600 flex justify-between font-medium">
            <span>All-time Overtime:</span>
            <span className="font-bold font-mono text-slate-600">
              {cumulativeOvertime >= 0 ? `+${cumulativeOvertime.toFixed(2)}` : cumulativeOvertime.toFixed(2)} hrs
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-[11px] text-slate-505">
            <span>This week: <strong className="text-slate-800 font-mono font-bold">{weekOvertimeSum >= 0 ? `+${weekOvertimeSum.toFixed(2)}` : weekOvertimeSum.toFixed(2)}</strong></span>
            <span>This month: <strong className="text-slate-800 font-mono font-bold">{monthOvertimeSum >= 0 ? `+${monthOvertimeSum.toFixed(2)}` : monthOvertimeSum.toFixed(2)}</strong></span>
          </div>
          <p className="text-[10px] text-slate-400 italic leading-snug border-t border-slate-100 pt-2.5">
            * Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.
          </p>
        </div>

        {/* In Office Days as Tax Deduction */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden" id="in-office-days-tax-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Office Days ({selectedYear} YTD)
              <br />
              (Tax Deductible)
            </span>
            <span className="bg-brand-blue/10 text-brand-blue p-1.5 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-extrabold font-mono text-brand-slate tracking-tight block">
              {yearOfficeDaysForDeduction} <span className="text-xs font-normal text-slate-500">days</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-1">
              This Month: <span className="text-brand-blue font-mono font-bold">{monthOfficeDaysForDeduction} days</span>
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-505 flex items-center gap-1 leading-tight text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Excludes remote days (WFH) & generic branches.
          </div>
        </div>

        {/* WFH documentation counter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden" id="wfh-tax-documentation-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WFH Days ({selectedYear} YTD)</span>
            <span className="bg-brand-blue/10 text-brand-blue p-1.5 rounded-lg">
              <HomeIcon className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-extrabold font-mono text-brand-slate tracking-tight block">
              {yWFH} <span className="text-xs font-normal text-slate-500">days</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-1">
              This Month: <span className="text-brand-blue font-mono font-bold">{mWFH} days</span>
            </span>
          </div>
          <p className="border-t border-slate-100 pt-2 text-[10px] text-slate-505 leading-normal flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Tracks monthly and YTD WFH counts.
          </p>
        </div>

        {/* Est. SKAT Deduction refund card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden" id="skat-commute-refund-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-peach/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est Commute Deduction ({selectedYear} YTD)</span>
            <span className="bg-amber-500/10 text-amber-600 p-1.5 rounded-lg">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-extrabold font-mono text-slate-800 tracking-tight block">
              {yearEstimatedDeduction.toFixed(2)}{' '}
              <span className="text-xs text-slate-505 font-sans font-semibold">DKK</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mt-1">
              This Month Estimate: <span className="text-amber-600 font-mono font-semibold">{monthEstimatedDeduction.toFixed(2)} DKK</span>
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 text-[9px] text-slate-505 flex flex-col gap-0.5 leading-tight">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              YTD: {yearOfficeDaysForDeduction} commute days logged across offices
            </span>
            <span className="text-[8px] pl-4 text-slate-400">Based on configured office commute distances (First 24 km exempt)</span>
          </div>
        </div>
      </div>

      {/* Month Attendance counter box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
          Category Counts Breakdown: {monthsNames[activeMonth - 1]} {selectedYear} vs Selected Year YTD
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
              <span>Office</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mOffice} <span className="text-xs font-medium text-slate-400">/ {yOffice}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>WFH</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mWFH} <span className="text-xs font-medium text-slate-400">/ {yWFH}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
              <span>Paid Holiday</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mVacation} <span className="text-xs font-medium text-slate-400">/ {yVacation}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-peach" />
              <span>Sick days</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mSick} <span className="text-xs font-medium text-slate-400">/ {ySick}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Holidays</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mHoliday} <span className="text-xs font-medium text-slate-400">/ {yHoliday}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Unpaid</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mUnpaid} <span className="text-xs font-medium text-slate-400">/ {yUnpaid}</span></div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Diff Branch</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-800">{mOtherOffice} <span className="text-xs font-medium text-slate-400">/ {yOtherOffice}</span></div>
          </div>
        </div>
      </div>

      {/* Accordion Toggle Banner for Charts */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-brand-blue shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-slate tracking-tight">Interactive Visual Analytics Charts</h4>
            <span className="text-xs text-slate-505 block">Analyze monthly trends of your work location balances, overtime curves, and weekly distributions.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowVisualViews(!showVisualViews)}
          className="bg-brand-blue hover:bg-blue-600 font-bold text-white px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
        >
          <span>{showVisualViews ? 'Hide Visual Views' : 'Show Visual Views'}</span>
          {showVisualViews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showVisualViews && (
        <div className="space-y-6" id="collapsible-visuals-sections-wrapper">
          {/* Visual Analytics grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: WFH days monthly bar */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Work From Home Days by Month ({selectedYear})</span>
                <span className="text-[10px] text-teal-600 font-mono font-bold">Max: 22d</span>
              </h4>
              <div className="h-[180px] w-full flex items-end justify-between px-2 pt-6 pb-2 bg-slate-50 rounded-xl relative border border-slate-100">
                {monthlyStats.map((stat, i) => {
                  const heightPercentage = Math.min(100, Math.round((stat.wfh / 22) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                      {/* Tooltip on hovering element */}
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] text-white px-2 py-0.5 rounded shadow z-10 font-mono whitespace-nowrap">
                        {stat.wfh} days WFH
                      </div>
                      <div
                        style={{ height: `${heightPercentage}%`, minHeight: stat.wfh > 0 ? '4px' : '0px' }}
                        className="w-4 bg-teal-500/80 hover:bg-teal-500 rounded-t-sm transition-all focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/80 w-full text-center">
                        {stat.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Office commutes counts weekly */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Office Days by Month ({selectedYear})</span>
                <span className="text-[10px] text-brand-blue font-mono font-bold">Max: 22d</span>
              </h4>
              <div className="h-[180px] w-full flex items-end justify-between px-2 pt-6 pb-2 bg-slate-50 rounded-xl relative border border-slate-100">
                {monthlyStats.map((stat, i) => {
                  const heightPercentage = Math.min(100, Math.round((stat.office / 22) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] text-white px-2 py-0.5 rounded shadow z-10 font-mono whitespace-nowrap">
                        {stat.office} days Office
                      </div>
                      <div
                        style={{ height: `${heightPercentage}%`, minHeight: stat.office > 0 ? '4px' : '0px' }}
                        className="w-4 bg-brand-blue/80 hover:bg-brand-blue rounded-t-sm transition-all"
                      />
                      <span className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/80 w-full text-center">
                        {stat.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 3: Overtime balance curves */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between cursor-help" title="Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.">
                <span>Monthly Overtime Log ({selectedYear}) <span className="text-slate-400 text-[10px]">ⓘ</span></span>
                <span className="text-[10px] text-brand-green font-mono font-bold">Credited</span>
              </h4>
              <div className="h-[180px] w-full flex items-center justify-between px-2 pt-1 pb-1 bg-slate-50 rounded-xl relative border border-slate-100">
                {/* Horizontal Zero-Reference line */}
                <div className="absolute left-0 right-0 h-px bg-slate-200 top-1/2 pointer-events-none" />

                {monthlyStats.map((stat, i) => {
                  const ot = stat.overtime;
                  const maxVal = 15;
                  const normalizedOt = Math.max(-maxVal, Math.min(maxVal, ot));
                  const heightPct = Math.round((Math.abs(normalizedOt) / maxVal) * 50);

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-center cursor-pointer">
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] text-white px-2 py-0.5 rounded shadow z-10 font-mono whitespace-nowrap">
                        {ot >= 0 ? `+${ot.toFixed(2)}` : ot.toFixed(2)} hrs
                      </div>

                      {/* Top block for positive overtime, bottom for negative */}
                      <div className="flex-1 w-full flex flex-col justify-end">
                        {ot > 0 && (
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-4 bg-brand-green hover:brightness-105 rounded-t-sm mx-auto transition-all"
                          />
                        )}
                      </div>
                      <div className="flex-1 w-full flex flex-col justify-start">
                        {ot < 0 && (
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-4 bg-rose-500/80 hover:bg-rose-400 rounded-b-sm mx-auto transition-all"
                          />
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-200/80 w-full text-center">
                        {stat.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 italic leading-snug">
                * Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend 4: Stacked Category Distribution bar */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-brand-slate uppercase tracking-wider">
                Yearly Attendance Categories Distribution ({selectedYear})
              </h4>
              <p className="text-xs text-slate-500 leading-normal">
                Reflects overall percentage shares of your workday categories recorded YTD. Use this to review holiday balances.
              </p>

              <div className="space-y-4">
                <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                  {categoryShares.map((share, i) => {
                    if (share.count === 0) return null;
                    return (
                      <div
                        key={i}
                        style={{ width: `${share.percentage}%` }}
                        className={`${getTailwindBgColor(share.name)} h-full hover:brightness-105 transition-all cursor-pointer`}
                        title={`${share.name}: ${share.count} days (${share.percentage}%)`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {categoryShares.map((share, i) => {
                    if (share.count === 0) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-slate-600">
                        <div className={`w-3 h-3 rounded-full ${getTailwindBgColor(share.name)}`} />
                        <span className="truncate leading-tight font-semibold">{getCategoryDisplayName(share.name).replace('Working from ', '').replace('Working ', '')}:</span>
                        <span className="font-mono font-bold text-slate-800 ml-auto">{share.count}d ({share.percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Trend 5: Comparative Work Pattern (Office vs WFH Trend) */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-brand-slate uppercase tracking-wider flex justify-between items-center">
                <span>Work Location Preference Trend ({selectedYear})</span>
                <div className="flex gap-4 text-[10px] font-mono font-bold">
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-brand-blue rounded-sm" /> Office</span>
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-teal-500 rounded-sm" /> WFH</span>
                </div>
              </h4>
              <p className="text-xs text-slate-500 leading-normal">
                Side-by-side density comparison of your logged corporate days vs in-home desks.
              </p>

              <div className="space-y-3">
                {monthlyStats.slice(0, 6).map((stat, idx) => {
                  const totalDays = stat.office + stat.wfh;
                  const officeOffsetPct = totalDays > 0 ? Math.round((stat.office / totalDays) * 100) : 50;
                  const wfhOffsetPct = totalDays > 0 ? Math.round((stat.wfh / totalDays) * 100) : 50;

                  return (
                    <div key={idx} className="flex items-center gap-4 text-xs font-mono">
                      <span className="w-8 text-slate-500 font-bold">{stat.monthLabel}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden flex border border-slate-205">
                        {stat.office > 0 && (
                          <div style={{ width: `${officeOffsetPct}%` }} className="bg-brand-blue h-full hover:brightness-105 transition-all" />
                        )}
                        {stat.wfh > 0 && (
                          <div style={{ width: `${wfhOffsetPct}%` }} className="bg-teal-500 h-full hover:brightness-105 transition-all" />
                        )}
                      </div>
                      <span className="w-16 text-[11px] text-slate-505 font-bold text-right">
                        {stat.office} : {stat.wfh}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
