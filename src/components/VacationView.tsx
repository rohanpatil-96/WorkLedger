/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { DayEntry, UserSettings, VacationCycle, WorkCategory } from '../types';
import {
  calculateVacationBalances,
  calculateFeriefridageBalance,
  getDaysUntilCycleExpiry,
  generateDefaultCycles
} from '../utils/vacationBank';
import {
  Calendar,
  AlertTriangle,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  Info,
  Sliders,
  Sparkles,
  TreePalm,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface VacationViewProps {
  entries: DayEntry[];
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onNavigateToSettings: () => void;
}

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const dateStr = payload.value;
  if (!dateStr) return null;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = monthNames[mIdx];
  const formatted = `${monthName} ${day}`;

  const isSep1 = parts[1] === '09' && parts[2] === '01';
  const isDec31 = parts[1] === '12' && parts[2] === '31';

  if (isSep1) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fill="#0ea5e9"
          fontWeight="bold"
          fontSize={10}
          fontFamily="monospace"
        >
          Sep 1 🎯
        </text>
      </g>
    );
  }

  if (isDec31) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fill="#f59e0b"
          fontWeight="bold"
          fontSize={10}
          fontFamily="monospace"
        >
          Dec 31 🚨
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={9}
        fontFamily="sans-serif"
      >
        {formatted}
      </text>
    </g>
  );
};

export default function VacationView({
  entries,
  settings,
  onUpdateSettings,
  onNavigateToSettings
}: VacationViewProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [today]);

  const yearlyEntitlement = settings.vacationYearlyEntitlementDays ?? 25;

  // Retrieve cycles, fallback to generated defaults if not set
  const cycles = useMemo(() => {
    return settings.vacationCycles || generateDefaultCycles(today.getFullYear(), yearlyEntitlement);
  }, [settings.vacationCycles, today, yearlyEntitlement]);

  // Balance calculations
  const balances = useMemo(() => {
    return calculateVacationBalances(entries, cycles, todayStr);
  }, [entries, cycles, todayStr]);

  const feriefridage = useMemo(() => {
    return calculateFeriefridageBalance(entries, settings);
  }, [entries, settings]);

  // Identify current active cycle
  const currentActiveCycle = useMemo(() => {
    // Current cycle starts in Sep 1 of previous year (if today is before Sep) or current year (if today is >= Sep)
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const activeStartYear = month >= 9 ? year : year - 1;
    const activeId = `vacation-cycle-${activeStartYear}`;
    return cycles.find((c) => c.id === activeId) || cycles[0];
  }, [cycles, today]);

  const [selectedOverlapYear, setSelectedOverlapYear] = useState<number | null>(null);

  const availableOverlapYears = useMemo(() => {
    const years = cycles.map((c) => {
      const parts = c.endDate.split('-');
      return parseInt(parts[0], 10);
    });
    return Array.from(new Set(years)).sort((a: number, b: number) => a - b);
  }, [cycles]);

  const activeOverlapYear = useMemo(() => {
    if (selectedOverlapYear !== null) return selectedOverlapYear;
    if (currentActiveCycle) {
      return parseInt(currentActiveCycle.endDate.split('-')[0], 10);
    }
    return today.getFullYear();
  }, [selectedOverlapYear, currentActiveCycle, today]);

  const activeExpiringCycle = useMemo(() => {
    return cycles.find(c => c.id === `vacation-cycle-${activeOverlapYear - 1}`);
  }, [cycles, activeOverlapYear]);

  const activeNewCycle = useMemo(() => {
    return cycles.find(c => c.id === `vacation-cycle-${activeOverlapYear}`);
  }, [cycles, activeOverlapYear]);

  const chartData = useMemo(() => {
    const data: any[] = [];
    const startYear = activeOverlapYear - 1;
    const expiringCycleId = `vacation-cycle-${startYear}`;
    const newCycleId = `vacation-cycle-${activeOverlapYear}`;

    const expiringCycle = cycles.find(c => c.id === expiringCycleId);
    const newCycle = cycles.find(c => c.id === newCycleId);

    if (!expiringCycle || !newCycle) {
      return [];
    }

    const getEarningMonthEnds = (cycle: VacationCycle) => {
      const yr = parseInt(cycle.earningStartDate.split('-')[0], 10);
      const nextYr = yr + 1;
      const isLeap = (nextYr % 4 === 0 && nextYr % 100 !== 0) || (nextYr % 400 === 0);
      return [
        `${yr}-09-30`,
        `${yr}-10-31`,
        `${yr}-11-30`,
        `${yr}-12-31`,
        `${nextYr}-01-31`,
        `${nextYr}-02-${isLeap ? '29' : '28'}`,
        `${nextYr}-03-31`,
        `${nextYr}-04-30`,
        `${nextYr}-05-31`,
        `${nextYr}-06-30`,
        `${nextYr}-07-31`,
        `${nextYr}-08-31`
      ];
    };

    const expiringEarningMonthEnds = getEarningMonthEnds(expiringCycle);
    const newEarningMonthEnds = getEarningMonthEnds(newCycle);

    const startDate = new Date(Date.UTC(activeOverlapYear, 7, 1)); // August 1 UTC
    const endDate = new Date(Date.UTC(activeOverlapYear, 11, 31)); // December 31 UTC

    let cur = new Date(startDate.getTime());
    while (cur <= endDate) {
      const yr = cur.getUTCFullYear();
      const mo = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(cur.getUTCDate()).padStart(2, '0');
      const dStr = `${yr}-${mo}-${dy}`;

      // Calculate earned days for expiring cycle up to dStr
      let expiringEarned = expiringCycle.carriedOverDays;
      if (dStr >= expiringCycle.earningEndDate) {
        expiringEarned += expiringCycle.entitlementDays;
      } else if (dStr >= expiringCycle.earningStartDate) {
        const passedMonths = expiringEarningMonthEnds.filter(m => dStr >= m).length;
        expiringEarned += passedMonths * (expiringCycle.entitlementDays / 12);
      }

      // Calculate earned days for new cycle up to dStr
      let newEarned = newCycle.carriedOverDays;
      if (dStr >= newCycle.earningEndDate) {
        newEarned += newCycle.entitlementDays;
      } else if (dStr >= newCycle.earningStartDate) {
        const passedMonths = newEarningMonthEnds.filter(m => dStr >= m).length;
        newEarned += passedMonths * (newCycle.entitlementDays / 12);
      } else {
        newEarned = 0;
      }

      const validEntries = entries
        .filter(e => e.category === WorkCategory.Vacation && !e.isFeriefridag && e.date <= dStr)
        .sort((a, b) => a.date.localeCompare(b.date));

      const simBalances = {
        [expiringCycleId]: { used: 0, remaining: expiringEarned },
        [newCycleId]: { used: 0, remaining: newEarned }
      };

      for (const entry of validEntries) {
        const isEntryInExpiring = entry.date >= expiringCycle.startDate && entry.date <= expiringCycle.endDate;
        const isEntryInNew = entry.date >= newCycle.startDate && entry.date <= newCycle.endDate;

        if (isEntryInExpiring && simBalances[expiringCycleId].remaining > 0) {
          simBalances[expiringCycleId].used += 1;
          simBalances[expiringCycleId].remaining -= 1;
        } else if (isEntryInNew) {
          simBalances[newCycleId].used += 1;
          simBalances[newCycleId].remaining -= 1;
        }
      }

      const expiringRemaining = Math.max(0, Math.round(simBalances[expiringCycleId].remaining * 100) / 100);
      const newRemaining = Math.max(0, Math.round(simBalances[newCycleId].remaining * 100) / 100);

      const formattedLabel = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

      data.push({
        dateStr: dStr,
        label: formattedLabel,
        expiring: expiringRemaining,
        newCycle: dStr >= newCycle.startDate ? newRemaining : 0
      });

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return data;
  }, [activeOverlapYear, cycles, entries]);

  const chartTicks = useMemo(() => {
    return [
      `${activeOverlapYear}-08-01`,
      `${activeOverlapYear}-09-01`,
      `${activeOverlapYear}-10-01`,
      `${activeOverlapYear}-11-01`,
      `${activeOverlapYear}-12-01`,
      `${activeOverlapYear}-12-31`
    ];
  }, [activeOverlapYear]);

  const tickFormatter = (tickValue: string) => {
    const d = new Date(tickValue);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate stats for current active cycle
  const activeStats = useMemo(() => {
    if (!currentActiveCycle) return { total: 0, used: 0, remaining: 0, lost: 0, daysLeft: 0 };
    const bal = balances[currentActiveCycle.id] || { used: 0, remaining: 0, lost: 0 };
    const daysLeft = getDaysUntilCycleExpiry(currentActiveCycle, today);
    return {
      total: currentActiveCycle.entitlementDays + currentActiveCycle.carriedOverDays,
      used: bal.used,
      remaining: bal.remaining,
      lost: bal.lost,
      daysLeft
    };
  }, [currentActiveCycle, balances, today]);

  // Warning threshold rules (under 60 days left, and balance > 5 days)
  const showExpiryWarning = activeStats.daysLeft > 0 && activeStats.daysLeft <= 60 && activeStats.remaining > 5;

  // Progress percentage
  const progressPercent = activeStats.total > 0
    ? Math.min(100, Math.round((activeStats.used / activeStats.total) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="vacation-bank-panel">
      {/* Expiry Warning Banner */}
      {showExpiryWarning && (
        <div className="bg-rose-50 border border-rose-200 text-slate-800 p-4 rounded-2xl flex items-start gap-3.5 shadow-sm animate-pulse" id="vacation-expiry-critical-warning">
          <AlertTriangle className="w-5.5 h-5.5 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider mb-0.5">Use-It-or-Lose-It Period Approaching</h4>
            <p className="text-xs text-rose-900 leading-relaxed font-semibold">
              You have <strong className="text-rose-950 font-bold">{activeStats.remaining} remaining days</strong> expiring in just <strong className="text-rose-950 font-bold">{activeStats.daysLeft} days</strong> (Dec 31 deadline)! Standard Danish SKAT & holiday rules state these unused entitlement days will expire unless flagged as carried-over.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner if everything is healthy */}
      {!showExpiryWarning && activeStats.remaining > 0 && activeStats.daysLeft > 0 && activeStats.daysLeft <= 120 && (
        <div className="bg-amber-50 border border-amber-200 text-slate-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm" id="vacation-expiry-info-banner">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-normal font-semibold">
            {activeStats.daysLeft} days remaining to utilize your {activeStats.remaining} remaining vacation days of the current cycle expiring on Dec 31.
          </p>
        </div>
      )}

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs" id="vacation-overview-grid">
        {/* Total Entitlement Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-blue/5 rounded-full blur-xl" />
          <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <span>Total Entitlement</span>
            <span className="p-1.5 bg-brand-blue/10 text-brand-blue rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="font-mono text-3xl font-black text-slate-800">{activeStats.total}</div>
          <p className="text-[10px] text-slate-400 italic">
            Entitlement + carried over
          </p>
        </div>

        {/* Used Days Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-green/5 rounded-full blur-xl" />
          <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <span>Used Days</span>
            <span className="p-1.5 bg-brand-green/10 text-brand-green rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="font-mono text-3xl font-black text-slate-800">{activeStats.used}</div>
          <p className="text-[10px] text-slate-400 italic">
            Logged as Vacation
          </p>
        </div>

        {/* Remaining Days Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <span>Remaining Days</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className={`font-mono text-3xl font-black ${activeStats.remaining > 5 ? 'text-emerald-600' : 'text-slate-800'}`}>
            {activeStats.remaining}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Available to request/use
          </p>
        </div>

        {/* Days Until Expiry Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl ${showExpiryWarning ? 'bg-rose-500/5' : 'bg-amber-500/5'}`} />
          <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <span>Days Until Expiry</span>
            <span className={`p-1.5 rounded-lg ${showExpiryWarning ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className={`font-mono text-3xl font-black ${showExpiryWarning ? 'text-rose-600' : 'text-slate-800'}`}>
            {activeStats.daysLeft > 0 ? activeStats.daysLeft : 0}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Expiring on Dec 31
          </p>
        </div>
      </div>

      {/* Vacation Overlap Chart Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="vacation-overlap-chart-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <TreePalm className="w-4 h-4 text-emerald-600" />
              Vacation Balance Timeline & Year-End Overlap
            </h3>
            <p className="text-xs text-slate-400 leading-normal font-medium">
              Tracks the remaining balance of your expiring cycle alongside the gradual 2.08 days/month accumulation of your new cycle.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overlap Year:</span>
            <select
              value={activeOverlapYear}
              onChange={(e) => setSelectedOverlapYear(parseInt(e.target.value, 10))}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
            >
              {availableOverlapYears.map((year) => (
                <option key={year} value={year}>
                  {year} (Ends Dec 31)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Short Educational Note */}
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-start gap-3 text-xs leading-normal font-medium text-slate-600">
          <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1 font-semibold">
            <p>
              In Denmark, the holiday earning year runs Sep 1 – Aug 31, but you have 16 months (until Dec 31 of the next year) to spend those days.
            </p>
            <p className="text-[10px] text-slate-400 font-medium leading-normal">
              This creates a 4-month <strong>September 1 – December 31 overlap window</strong>. The system automatically spends your expiring days first, protecting you from use-it-or-lose-it expirations!
            </p>
          </div>
        </div>

        {(!activeExpiringCycle || !activeNewCycle || chartData.length === 0) ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-xs">
            <AlertTriangle className="w-8 h-8 text-slate-300" />
            <p className="font-bold text-slate-500">Cycles Configuration Incomplete</p>
            <p className="text-[11px] text-slate-400">Verify that you have defined cycles for years {activeOverlapYear - 1} and {activeOverlapYear} in Settings.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-72 w-full font-mono text-[10px] pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ReferenceLine
                    x={`${activeOverlapYear}-09-01`}
                    stroke="#0ea5e9"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    x={`${activeOverlapYear}-12-31`}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="dateStr"
                    ticks={chartTicks}
                    tick={<CustomXAxisTick />}
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const dateVal = payload[0].payload.dateStr;
                        const dateFormatted = new Date(dateVal).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        return (
                          <div className="bg-slate-900 text-white p-3 border border-slate-800 rounded-xl shadow-xl space-y-1.5 text-[11px] font-sans">
                            <p className="font-extrabold border-b border-slate-800 pb-1 font-mono text-slate-400 text-[10px]">{dateFormatted}</p>
                            {payload.map((entry: any, i: number) => {
                              if (entry.value === null || entry.value === undefined) return null;
                              return (
                                <div key={i} className="flex justify-between items-center gap-5">
                                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    {entry.name}
                                  </span>
                                  <span className="font-mono font-black text-slate-100 text-xs">{entry.value} d</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 'bold', color: '#475569' }}
                  />
                  <Line
                    name={`Expiring Days (Cycle ${activeOverlapYear - 1} - ${activeOverlapYear})`}
                    type="stepAfter"
                    dataKey="expiring"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    name={`New Days (Cycle ${activeOverlapYear} - ${activeOverlapYear + 1})`}
                    type="stepAfter"
                    dataKey="newCycle"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Context / Dynamic Summary Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold pt-1">
              <div className="border border-amber-100 bg-amber-500/[0.03] p-3 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider">Expiring Cycle Outlook</span>
                <p className="text-slate-500 font-medium leading-relaxed">
                  These days expire on December 31, {activeOverlapYear}. Taking vacation between September and December will automatically consume these days first.
                </p>
              </div>
              <div className="border border-sky-100 bg-sky-500/[0.03] p-3 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-sky-700 tracking-wider">New Cycle Outlook</span>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Accrual begins Sep 1, {activeOverlapYear} at 2.08 days/month. This balance remains valid for taking vacation all the way until Dec 31, {activeOverlapYear + 1}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress & Feriefridage Sub-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Main Active Cycle Progress */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Cycle Usage Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Used {activeStats.used} of {activeStats.total} total days</span>
              <span className="font-bold font-mono text-brand-blue">{progressPercent}%</span>
            </div>
            {/* Progress Track */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
              <div
                className="bg-brand-blue h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0% (Empty)</span>
              <span>Remaining: {activeStats.remaining} days</span>
              <span>100% (Fully Used)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Feriefridage Hours Sub-card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
            <span>Feriefridage Hours Bank</span>
            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-mono">37 hrs standard</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center font-mono py-1 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Total</span>
                <span className="text-slate-800 font-bold">{feriefridage.totalHours}h</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Used</span>
                <span className="text-brand-blue font-bold">{feriefridage.usedHours}h</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Remaining</span>
                <span className="text-emerald-600 font-bold">{feriefridage.remainingHours}h</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug">
              Feriefridage (6th vacation week) is tracked in hours. Check "Feriefridag" checkbox when logging a vacation day to deduct from this bank instead of standard days.
            </p>
          </div>
        </div>
      </div>

      {/* Table of all cycles */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-brand-slate uppercase tracking-widest">Historical & Upcoming Vacation Cycles</h3>
          <button
            onClick={onNavigateToSettings}
            className="text-xs text-brand-blue font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" /> Adjust in Settings
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px] tracking-wider bg-slate-55">
                <th className="py-3 px-4 font-bold">Cycle Period</th>
                <th className="py-3 px-4 font-bold">Validity Period</th>
                <th className="py-3 px-4 font-bold text-center">Entitlement</th>
                <th className="py-3 px-4 text-center font-bold">Carried Over</th>
                <th className="py-3 px-4 text-center font-bold">Total Days</th>
                <th className="py-3 px-4 text-center font-bold">Days Used</th>
                <th className="py-3 px-4 text-center font-bold">Remaining</th>
                <th className="py-3 px-4 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {cycles.map((cycle) => {
                const bal = balances[cycle.id] || { used: 0, remaining: 0, lost: 0, isExpired: false };
                const isCurrent = cycle.id === currentActiveCycle?.id;
                const total = cycle.entitlementDays + cycle.carriedOverDays;
                
                let statusLabel = 'Active';
                let statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (bal.isExpired) {
                  statusLabel = 'Expired';
                  statusClass = 'bg-slate-100 text-slate-500 border-slate-200';
                } else if (isCurrent) {
                  statusLabel = 'Current Active';
                  statusClass = 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
                } else {
                  if (cycle.startDate > todayStr) {
                    statusLabel = 'Upcoming';
                    statusClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  }
                }

                const startYear = parseInt(cycle.earningStartDate.split('-')[0], 10);
                const endYear = parseInt(cycle.earningEndDate.split('-')[0], 10);

                return (
                  <tr
                    key={cycle.id}
                    className={`hover:bg-slate-50/50 transition-colors ${isCurrent ? 'bg-brand-blue/[0.02]' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      Cycle {startYear} - {endYear}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {cycle.startDate} to {cycle.endDate}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{cycle.entitlementDays} d</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">+{cycle.carriedOverDays} d</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-800 font-bold">{total} d</td>
                    <td className="py-3.5 px-4 text-center font-mono text-brand-blue">{bal.used} d</td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {bal.lost > 0 ? (
                        <span className="text-slate-400 line-through" title={`${bal.lost} unused days expired`}>0 d</span>
                      ) : (
                        <span className={bal.remaining > 0 ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}>
                          {bal.remaining} d
                        </span>
                      )}
                      {bal.lost > 0 && (
                        <span className="text-[10px] text-rose-500 ml-1.5 font-sans" title="Expired/Lost">
                          ({bal.lost} lost)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
