# Workledger — Danish Commute & Holiday Organizer
*Your offline-first companion for tracking working hours, commute tax-deductions, and Danish vacation cycles.*

---

## What is Workledger?
Workledger is a privacy-first, fully client-side work tracking utility specifically optimized for individuals working in Denmark. It takes the guesswork out of daily time logging, commuting allowances (**Kørselsfradrag**), and complex Danish vacation rules (**Samtidighedsferie**).

---

## Core Features At A Glance

### 1. Interactive Heatmap Calendar
- Easily log hours with category presets: **Office**, **WFH** (Work From Home), **Other Office**, **Vacation**, **Illness**, and **Public Holiday**.
- Visual indicators guide you on target completion, helping you balance your contracted hours effortlessly.

### 2. Danish Commute (Kørselsfradrag) Tax Calculator
- **The 24km Limit**: In Denmark, tax credits apply only for commutes exceeding 24 km daily.
- Workledger automatically tracks your trips to **Office** and **Other Office** locations, filters out invalid short commutes, and outputs ready-to-use figures for your Danish annual tax return (*Årsopgørelse*).

### 3. Danish Vacation Bank & Timeline
- Supports Denmark’s standard 16-month holiday spending period (September 1 – December 31 of the next year).
- Displays a state-of-the-art **Vacation Balance Timeline & Overlap Chart** showing how your expiring days and newly accrued days coexist during the 4-month autumn overlap.
- Automatically prioritizes spending expiring days first so you never lose unused holiday days.

### 4. Overtime & Flex Tracker
- Compares logged hours against your custom weekly contract target (e.g. 37 hours).
- Provides real-time calculation of your current accumulated overtime/flex balance.

### 5. PDF & Tax Reporting
- Instantly generate beautifully formatted PDFs of your work logs or export data for your employer or tax records.

### 6. Seamless Time Tracking Import Wizard
- Easily upload legacy spreadsheet time-tracking files in `.csv` or `.json` formats.
- **Fuzzy Header Mapping**: Gracefully matches column header styles like `"Description/Notes"`, `"Comments"`, `"Week"`, etc.
- **Danish Workday Defaults**: If `"x"` or `"0"` is detected in the Time IN/OUT columns, the app automatically logs standard workday hours (default `7.4` hours).
- **Comprehensive Notes Import**: Extracts complete descriptions, notes, and comments to append them to daily calendar schedules.

---

## Quick Start Guide for New Users

### Step 1: Configure Your Contract & Workplace
1. Head over to the **Workday Settings** tab.
2. Enter your weekly contracted hours (e.g., `37.0` hours).
3. Set your **Home-to-Work Distance** in km.
4. Add or manage your registered employer branch offices.

### Step 2: Set Up Your Vacation Accrual
- In the same Settings tab, verify or customize your **Vacation Carryover** and entitlement rates. Default parameters are pre-set to Danish standard values (`25` entitlement days accruing at `2.08` days/month).

### Step 3: Start Logging Hours
- Use the **Quick Entry / Home** panel for instant, single-click hour logging.
- Use the **Interactive Calendar** to review or backdate past entries.

### Step 4: Generate Reports
- At the end of the month, open the **Tax & PDF Reports** tab to view your commuting tax offsets and download complete, clean timesheet printouts.

---

## Privacy & Offline Security
- **No Remote Servers**: Your data is stored entirely on your local device via local storage. No trackers, no external databases, and no cloud logins.
- **100% Client-Side**: All PDFs, charts, and summaries are generated securely inside your browser. Your work history remains your private business.
