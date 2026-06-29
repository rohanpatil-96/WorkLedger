/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum WorkCategory {
  Office = 'Working from office',
  WFH = 'Working from home',
  Holiday = 'National holiday',
  Vacation = 'Vacation',
  Sick = 'Sick day',
  UnpaidFerie = 'Unpaid ferie',
  OtherOffice = 'Different office location'
}

export function getCategoryDisplayName(cat: WorkCategory | string): string {
  switch (cat) {
    case WorkCategory.Office:
    case 'Working from office':
      return 'Working from office';
    case WorkCategory.WFH:
    case 'Working from home':
      return 'Working from home';
    case WorkCategory.Holiday:
    case 'National holiday':
      return 'National holiday';
    case WorkCategory.Vacation:
    case 'Vacation':
      return 'Paid vacation';
    case WorkCategory.Sick:
    case 'Sick day':
      return 'Sick day';
    case WorkCategory.UnpaidFerie:
    case 'Unpaid ferie':
      return 'Unpaid vacation';
    case WorkCategory.OtherOffice:
    case 'Different office location':
      return 'Different office location';
    default:
      return String(cat);
  }
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  weekday: string; // Monday, Tuesday, etc.
  weekNumber: number;
  month: number; // 1-12
  year: number;
  category: WorkCategory;
  entryTime?: string; // HH:MM
  exitTime?: string; // HH:MM
  breakMinutes?: number; // default e.g. 30
  calculatedHours: number; // default 7.4
  overriddenTotalHours?: number; // optional manual override
  finalCountedHours: number; // calculatedHours or overriddenTotalHours
  overtime: number; // finalCountedHours - standardWorkday (calculated differently depending on category)
  notes: string;
  location?: string; // custom office location for Different Office Location
  createdUpdatedTimestamp: string;
}

export interface TaxRateSetting {
  year: number;
  thresholdKm: number; // default 24
  rate1: number; // default 2.28 (up to 120 km)
  rate2: number; // default 1.14 (above 120 km)
  limitKm: number; // default 120
}

export interface HolidaySetting {
  date: string; // MM-DD or YYYY-MM-DD
  name: string;
  isCustom?: boolean;
}

export interface DifferentOfficeLocation {
  id: string;
  name: string;
  roundTripDistanceKm: number;
  includeInCommute: boolean;
}

export interface UserSettings {
  standardWorkdayHours: number; // default 7.4
  roundTripDistanceKm: number | ''; // default 40
  taxRates: TaxRateSetting[];
  categoryColors: Record<WorkCategory, string>;
  holidays: HolidaySetting[];
  overtimeCreditRules: Record<WorkCategory, 'earned' | 'standard' | 'zero'>;
  enableManualOverride: boolean;
  preferredYearView: number;
  userName?: string; // customize user's name
  activeCompany?: string; // currently active corporate name
  companies?: string[]; // list of tracked corporate entities
  theme?: 'light' | 'dark' | 'system';
  differentOfficeLocations?: DifferentOfficeLocation[];
  defaultOfficeLocationName?: string;
}
