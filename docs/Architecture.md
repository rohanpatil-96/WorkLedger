# Workledger Architecture Specification
Version: 3.1.0 (July 2026)

## 1. Executive Summary & Purpose
Workledger is a desktop-optimized, highly polished, privacy-first, client-side React + TypeScript application tailored for employees operating in Denmark. It streamlines tracking daily work entries, automatically factoring in local commuting thresholds, Danish vacation laws (including the complex 16-month September-to-December overlap system), standard overtime computations, and tax/export compliance.

This document serves as the absolute blueprint and single source of truth for the codebase, architecture, core business logic rules, and user flow.

---

## 2. Core Functional Requirements
1. **Interactive Calendar / Quick Entry**: Instant selection of dates to log, edit, or remove daily hours.
2. **Work Categories**: Support for distinct categories:
   - **Office / Other Office**: Daily commutes, lunch break offsets, commute threshold tax warnings (24km Danish tax-deductible threshold).
   - **WFH (Work From Home)**: Remote logging with zero commute tracking.
   - **Vacation / Feriefridage**: Specialized holiday banks tracking Danish vacation days (accruing at 2.08 days/month) and Feriefridage hours.
   - **Illness**: Tracking medical leave days.
   - **Public Holiday**: Support for Danish national holidays.
3. **Overtime Engine**: Dynamic tracking of balance compared to contracted target hours (e.g. 7.4 hrs/day).
4. **Vacation Bank & Overlap Timeline**: Implements Denmark's Holiday Act (Samtidighedsferie), featuring an interactive Recharts-powered timeline displaying the 4-month overlap (Sept 1 – Dec 31) where two cycle balances are active concurrently.
5. **Tax & PDF Reporting**: Instant Danish transport allowance (Kørselsfradrag) calculations and structured PDF reports.

---

## 3. Tech Stack & Engineering Decisions
- **Framework**: React 18+ bootstrapped with Vite.
- **Language**: TypeScript (with strict typing rules, explicitly matching data types).
- **Styling**: Tailwind CSS with custom thematic parameters (e.g. Slate/Teal color schemes, customized tables, high-contrast badges). No raw or inline style overrides.
- **Charts**: `recharts` for the interactive Vacation Overlap Timeline visualization.
- **Icons**: `lucide-react` exclusively for visual markers.
- **Data Persistence**: Single-source-of-truth client-side local storage engine syncing work entries, company branches, and vacation allocations across reloads.
- **HMR / Build Profile**: Static client build, self-contained, with zero dependencies on unstable third-party servers. Perfect for offline usage or wrapping into native app builders.

---

## 4. Folder Structure & Key Files
```
/
├── package.json              # App dependencies, scripts (vite, tsc, lint)
├── index.html                # Entry HTML mount point
├── docs/
│   ├── Architecture.md       # [This File] High-level architectural blueprint
│   └── README.md             # End-user guide and product features
└── src/
    ├── main.tsx              # React client bootstrapping
    ├── App.tsx               # Main application controller, navigation, & global state
    ├── types.ts              # Central TypeScript declarations & enumerations
    ├── index.css             # Tailwind imports & customized styling theme variables
    ├── components/
    │   ├── CalendarView.tsx  # Heatmap calendar grid with month shifting
    │   ├── DashboardView.tsx # KPIs, monthly overview, and commute summaries
    │   ├── EntriesView.tsx   # Sortable/filterable table of historic logs
    │   ├── PitchView.tsx     # Tester guide, product background, and showcase details
    │   ├── QuickEntry.tsx    # Responsive daily card logging panel
    │   ├── ReportsView.tsx   # Tax-offset (Kørselsfradrag) card and PDF reports generator
    │   ├── SettingsView.tsx  # Contract settings, public holidays, companies, & data seeding
    │   └── VacationView.tsx  # Danish Vacation Bank gauges & the Recharts overlap timeline
    └── utils/
        └── vacationBank.ts   # Core algorithms parsing vacations and Danish holiday cycles
```

---

## 5. Domain Logic & Calculations

### A. The Commute Tax Warning & Deductions
- **Danish Commute Rule (Kørselsfradrag)**: Tax credit is only given for commutes exceeding **24 km per day** (round trip).
- **App Logic**:
  - WFH or Vacation entries generate 0 commute km.
  - Office commutes are calculated dynamically. If a user logs an Office day but their configured home-to-work distance is $\le 12\text{ km}$ (making the round trip $\le 24\text{ km}$), the app displays warning triggers and omits these days from tax-deductible summaries while calculating correct allowances for valid routes.

### B. Danish Holiday Act (Samtidighedsferie)
- **Earning Period**: Sept 1 to Aug 31 of the next year (12 months).
- **Spending Period**: Sept 1 to Dec 31 of the next year (16 months).
- **The Overlap Window**: From **Sept 1 to Dec 31**, a user is spending remaining days from the previous cycle (which expire Dec 31) while already earning new days for the new cycle (at 2.08 days per month).
- **Deduction Priority**: The app implements automatic consumption priority: when vacation is taken during the overlap window, the algorithm first depletes the older expiring cycle balance before taking days from the new cycle, eliminating manual tracking errors.

---

## 6. Component-by-Component Guide

### 1. App.tsx (The Core State Orchestrator)
Handles global reactive states, central local storage synchronization, navigation drawer menus, and modal gates.
- **Key States**: `entries`, `settings` (targets, branches, distances, carryovers), `activeTab`.
- **Integrity Guarantee**: All deletions and re-seeding operations run through customized, beautiful Tailwind modal gates rather than standard web alerts to prevent app crashes in native wrappers.

### 2. VacationView.tsx (Vacation Bank & Timeline)
Houses circular radial progress gauges representing vacation day assets and Feriefridage hours.
- **The Timeline Component**: Integrates a `recharts` Line Chart tracking the double-line balance trajectories from Aug 1 to Dec 31.
- **Dynamic Simulation**: Simulates day-by-day vacation spending, calculating remaining days and visualizing the cross-over pattern where the old cycle dips to zero while the new cycle rises.

### 3. EntriesView.tsx (Historical Logs)
A heavy-duty, spreadsheet-style data table with customizable headers, inline editing forms, and sorting options.
- **Modals**: Houses the customized "Delete Working Log Entry?" confirmation modal, completely replacing browser-level confirmations.

### 4. SettingsView.tsx (Contract & Seeding Control)
Allows editing weekly target hours (e.g., 37.0 hrs), home-to-work travel distances, and company profiles. Includes the **CSV & JSON Time-Tracking Import Wizard**.
- **Time-Tracking Import Engine**: Parses uploaded JSON backups or standard time-tracking CSV files (matching columns: Week, Date, Time IN, Time OUT, Hours, Location/Day type, Description/Notes).
  - *Fuzzy Header Resolution*: Resolves columns using both strict matches and intelligent fallback matches (e.g. matching 'Description/comments' or 'Dato'/'Uge' in Danish).
  - *Special Workday Override Rule*: Detects characters `'x'` or `'0'` in `Time IN`/`Time OUT` columns and automatically interprets them as standard workday hours (default 7.4), bypassing raw clock-time requirements.
  - *Description Parsing*: Seamlessly parses description comment rows and maps them to the respective entry's notes.
- **Developer Tools**: Gated behind tapping the avatar 5 times, it houses:
  - **Clear & Seed Demo Data**: Resets all configuration to baseline and seeds rich mock logs.
  - **Erase All Entries**: Drops all user-registered work logs while preserving core databases (holidays, settings, company structures, and contract metadata), guarded by a high-visibility Tailwind confirm modal.

---

## 7. State Synchronization & Local Storage Rules
- All states are serialized into `localStorage` keys under custom, namespace-protected tags (`workledger_entries_v3`, `workledger_settings_v3`).
- Changes instantly trigger component-wide re-renders, ensuring full responsiveness.
- Empty states are auto-populated with pre-defined defaults to maintain a rich, fully populated UI from the very first visit.
