/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayEntry, VacationCycle, UserSettings, WorkCategory } from '../types';

/**
 * Generates default vacation cycles around a given year.
 * Earning period: September 1 to August 31 of the next year.
 * Holding/usage period: September 1 to December 31 of the following year (16 months).
 */
export function generateDefaultCycles(year: number, defaultEntitlement: number): VacationCycle[] {
  const cycles: VacationCycle[] = [];
  // Generate cycles from year-2 to year+2 to ensure coverage of past, active, and upcoming periods
  for (let y = year - 2; y <= year + 2; y++) {
    const nextYear = y + 1;
    const followingYear = y + 2;
    cycles.push({
      id: `vacation-cycle-${y}`,
      startDate: `${y}-09-01`,
      endDate: `${nextYear}-12-31`,
      earningStartDate: `${y}-09-01`,
      earningEndDate: `${nextYear}-08-31`,
      entitlementDays: defaultEntitlement,
      carriedOverDays: 0,
    });
  }
  return cycles;
}

/**
 * Calculates current active cycle based on today's date.
 * If month >= September, cycle starts this year Sep 1, ends Dec 31 next year.
 * If month < September, cycle started previous year Sep 1, ends Dec 31 this year.
 */
export function getCurrentCycleId(today: Date): string {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const startYear = month >= 9 ? year : year - 1;
  return `vacation-cycle-${startYear}`;
}

/**
 * Checks if a date falls within the validity window of a cycle (inclusive).
 */
export function isDateInCycle(dateStr: string, cycle: VacationCycle): boolean {
  return dateStr >= cycle.startDate && dateStr <= cycle.endDate;
}

/**
 * Calculates vacation balances (used, remaining, expired/lost) for all cycles.
 * We process vacation entries chronologically to correctly handle overlap windows (Sep 1 to Dec 31).
 * If multiple cycles are valid for a vacation entry, we deduct from the older cycle first.
 */
export function calculateVacationBalances(
  entries: DayEntry[],
  cycles: VacationCycle[],
  todayStr: string = new Date().toISOString().split('T')[0]
): Record<string, { used: number; remaining: number; lost: number; isExpired: boolean }> {
  const balances: Record<string, { used: number; remaining: number; lost: number; isExpired: boolean }> = {};

  // Initialize balances
  for (const cycle of cycles) {
    balances[cycle.id] = {
      used: 0,
      remaining: cycle.entitlementDays + cycle.carriedOverDays,
      lost: 0,
      isExpired: todayStr > cycle.endDate,
    };
  }

  // Filter and sort vacation entries (category Vacation, and not marked as feriefridag)
  const vacationEntries = entries
    .filter((e) => e.category === WorkCategory.Vacation && !e.isFeriefridag)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Process entries chronologically to allocate them to cycles
  for (const entry of vacationEntries) {
    // Find all cycles covering this entry's date
    const validCycles = cycles.filter((c) => isDateInCycle(entry.date, c));

    if (validCycles.length === 0) {
      continue;
    }

    // Sort valid cycles by startDate ascending (oldest first)
    validCycles.sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Try to find a cycle with remaining days
    let allocated = false;
    for (const cycle of validCycles) {
      const bal = balances[cycle.id];
      if (bal.remaining > 0) {
        bal.used += 1;
        bal.remaining -= 1;
        allocated = true;
        break;
      }
    }

    // If all valid cycles are exhausted, spill over into the newest valid cycle
    if (!allocated) {
      const newestCycle = validCycles[validCycles.length - 1];
      const bal = balances[newestCycle.id];
      bal.used += 1;
      bal.remaining -= 1;
    }
  }

  // Calculate lost (expired) days for cycles that have passed their endDate
  for (const cycle of cycles) {
    const bal = balances[cycle.id];
    if (bal.isExpired && bal.remaining > 0) {
      bal.lost = bal.remaining;
      bal.remaining = 0;
    }
  }

  return balances;
}

/**
 * Calculates Feriefridage hours balance.
 * Total hours are either customized in settings or proportional to standardWorkdayHours.
 * Deducted when category is Vacation and isFeriefridag is true.
 */
export function calculateFeriefridageBalance(
  entries: DayEntry[],
  settings: UserSettings
): { totalHours: number; usedHours: number; remainingHours: number } {
  const stdHours = settings.standardWorkdayHours || 7.4;
  
  // Default entitlement is 37 hours, or proportional if standardWorkdayHours < 7.4
  const defaultHours = settings.vacationFeriefridageHours !== undefined
    ? settings.vacationFeriefridageHours
    : Math.round((stdHours / 7.4) * 37 * 10) / 10;

  // Find all feriefridage entries
  const feriefridageEntries = entries.filter(
    (e) => e.category === WorkCategory.Vacation && e.isFeriefridag
  );

  const usedHours = feriefridageEntries.reduce((sum, e) => {
    // Use the actual logged hours, defaulting to standard workday if not set
    return sum + (e.finalCountedHours ?? stdHours);
  }, 0);

  const remainingHours = Math.max(0, defaultHours - usedHours);

  return {
    totalHours: defaultHours,
    usedHours: Math.round(usedHours * 100) / 100,
    remainingHours: Math.round(remainingHours * 100) / 100,
  };
}

/**
 * Returns the number of days until a cycle's expiry date.
 */
export function getDaysUntilCycleExpiry(cycle: VacationCycle, today: Date): number {
  const expiryDate = new Date(cycle.endDate);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
