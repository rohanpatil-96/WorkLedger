import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Milestone, 
  Share2, 
  Clock, 
  AlertCircle,
  HelpCircle,
  CheckSquare
} from 'lucide-react';

interface PitchViewProps {
  onNavigate?: (tab: 'home' | 'dashboard' | 'calendar' | 'entries' | 'reports' | 'settings') => void;
}

export default function PitchView({ onNavigate }: PitchViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'pitch' | 'guide'>('pitch');
  
  // Interactive testing checklist state
  const [checklist, setChecklist] = useState([
    { id: 't1', text: 'Check the real-time Dashboard to inspect the automatic overtime balances & SKAT commute refund metrics.', completed: false, category: 'Dashboard' },
    { id: 't2', text: 'Go to Settings and change standard workday hours (e.g. from 7.4 to 8.0) or update round-trip distance, then see the changes propagate.', completed: false, category: 'Settings' },
    { id: 't3', text: 'Use the "Copy Last Workday" shortcut on the Quick Entry page to replicate previous logged workday attributes instantly.', completed: false, category: 'Quick Entry' },
    { id: 't4', text: 'Perform a bulk-range log (e.g. log 2 weeks of Paid Holiday) and note how the app skips weekends and automatically maps it.', completed: false, category: 'Quick Entry' },
    { id: 't5', text: 'Go to the Interactive Calendar, click on a date, change its category to "WFH" or "Sick day", and see how colors & status update.', completed: false, category: 'Calendar' },
    { id: 't6', text: 'Inspect the "Strategic Long Weekends Planner" below the calendar to discover optimal days for booking holiday.', completed: false, category: 'Calendar' },
    { id: 't7', text: 'Go to the Reports page, filter by a specific month, and print or export the PDF time sheet to check the custom print-friendly layout.', completed: false, category: 'Reports' },
    { id: 't8', text: 'Check how WFH or Paid Holiday days do NOT accrue SKAT commuting refund km, proving the app\'s strict compliance guard rails.', completed: false, category: 'Dashboard' },
    { id: 't9', text: 'Tap your profile name/avatar in the sidebar 5 times to reveal hidden developer tools, then trigger a demo re-seed of 2026 data.', completed: false, category: 'Settings' },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  const pitchMessage = `Introducing WorkLedger — A Professional Workday Ledger & Danish SKAT Commute Tax Tracker

Managing hybrid working arrangements, tracking precise working hours, and computing Danish commuting tax deductions (Kørselsfradrag) requires tedious, error-prone manual calculations. 

WorkLedger automates and optimizes this entire tracking process. It is a secure, client-side web application designed to maintain your exact work logs and tax data in compliance with regulatory expectations.

Salient Features:

1. Smart Location Ledger: Effortlessly track your time across multiple working locations including Working from Office, WFH, Different Office Locations, Paid Holidays, Unpaid Holidays, and Sick Days.
2. Automatic Overtime Balance Engine: Automatically logs your expected versus actual hours based on your contract profile, tracking flextime and accrued overtime balances in real-time.
3. Danish SKAT Commute Tax Deduction Optimizer: Automatically calculates transport deductibles based on official SKAT tax rates, strictly excluding work-from-home, paid holidays, public holidays, and sick days. Tax-audit compliant.
4. Integrated Danish Public Holidays: Houses a pre-synchronized calendar that prevents double-claiming commute allowances on national non-working days.
5. Strategic Long Weekends Planner: Provides a tactical advisor that highlights bridge-days near public holidays to maximize your consecutive holiday rest days.
6. Bulk Logging & Rapid Copy Shortcuts: Speed up logging of recurring rotas by applying multi-day bulk entries or replicating previous workday details with a single click.
7. Professional Chronological Reports: Generates elegant, print-ready PDF statements to serve as official ledger documentation for tax authorities, payroll, or audit trails.
8. Hidden Developer Sandbox Tools: Tap your profile name in the left menu 5 times to reveal hidden developer settings and trigger realistic simulated 2026 data re-seeding instantly!

Access and test the live application here:
${window.location.origin}

Your feedback is highly valued. Try out the tool and share your constructive thoughts to help refine the experience further!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pitchMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="pitch-and-tester-guide-root">
      
      {/* Intro Header Card */}
      <div className="bg-gradient-to-r from-brand-slate to-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-400/30 text-blue-200 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" /> Product Pitch & Tester Center
            </div>
            <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-brand-bg" id="pitch-heading-title">
              Share WorkLedger & Gather Constructive Feedback
            </p>
            <p className="text-xs md:text-sm text-slate-200 font-semibold max-w-xl leading-relaxed">
              Showcase why WorkLedger is indispensable for professionals working flex-time, hybrid models, or claiming commuting tax deductions. Use this page to pitch to others and guide them on how to rigorously test the application.
            </p>
          </div>
          
          <div className="shrink-0">
            <button
              onClick={handleCopy}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs tracking-wider transition-all shadow-lg shadow-brand-blue/25 hover:scale-[1.02] active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>COPY SHAREABLE PITCH</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('pitch')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'pitch'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>PRODUCT PITCH & VALUE STATEMENT</span>
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-5 py-3 text-xs font-extrabold tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'guide'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>TESTER GUIDE & SCENARIOS</span>
          {completedCount > 0 && (
            <span className="ml-1 bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 text-[9px] rounded-full">
              {completedCount}/{checklist.length}
            </span>
          )}
        </button>
      </div>

      {/* View Content Switcher */}
      {activeSubTab === 'pitch' ? (
        <div className="space-y-6" id="pitch-pane-content">
          {/* Main Elevator Pitch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: The Core Value Pitch */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-brand-blue rounded-full" />
                  Why WorkLedger Exists
                </h3>
                <div className="text-slate-700 text-xs md:text-sm space-y-3.5 leading-relaxed font-semibold">
                  <p>
                    For hybrid employees, contractors, and corporate managers, time and location logging is a fragmented pain. You have standard work hours to fulfill, flex-time to claim, and commute deductions (like the Danish <strong>Kørselsfradrag</strong>) that demand extreme mathematical accuracy.
                  </p>
                  <p>
                    Claiming a travel refund for days you worked from home is tax fraud. Failing to claim for days you visited alternate corporate sites is throwing money away. 
                  </p>
                  <p className="font-semibold text-slate-800">
                    WorkLedger solves this with a pristine, cohesive, client-side application that transforms compliance into a delight.
                  </p>
                </div>
              </div>

              {/* Six Clever Features Showdown */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-brand-blue rounded-full" />
                  What Makes It Incredibly Clever?
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-teal-50 text-teal-700"><MapPin className="w-4 h-4" /></div>
                      <h4 className="text-xs font-extrabold text-slate-900">The SKAT Compliance Guard</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                      Only adds commute distances for physical office logs. Remote WFH, sick days, paid holidays, and national holidays are auto-filtered.
                    </p>
                  </div>

                  <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-50 text-indigo-700"><Calendar className="w-4 h-4" /></div>
                      <h4 className="text-xs font-extrabold text-slate-900">Strategic Holiday Planner</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                      Analyzes upcoming Danish public holidays and tells you exactly which bridge days to book to double your consecutive time off.
                    </p>
                  </div>

                  <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-brand-blue/10 text-brand-blue-700"><TrendingUp className="w-4 h-4" /></div>
                      <h4 className="text-xs font-extrabold text-slate-900">Flex & Overtime Tracking</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                      Maintains an automated running balance of your actual hours against your target contract obligations.
                    </p>
                  </div>

                  <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-brand-green/10 text-brand-green-700"><Clock className="w-4 h-4" /></div>
                      <h4 className="text-xs font-extrabold text-slate-900">Double-Entry Logging Speed</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                      Features like "Copy last workday" and "Log entire standard week" reduce the daily logging chores to an absolute zero.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Shareable Copy Widget */}
            <div className="space-y-6">
              <div className="bg-brand-slate text-white p-5 rounded-2xl shadow-md space-y-4 relative">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                    <Share2 className="w-4 h-4" /> Shareable Email / Message
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-all"
                    title="Copy Text"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="bg-black/25 rounded-xl p-3.5 font-mono text-[10px] text-slate-200 h-80 overflow-y-auto select-all leading-normal whitespace-pre-wrap border border-slate-700">
                  {pitchMessage}
                </div>

                <div className="text-[11px] text-slate-200 font-semibold text-center italic">
                  Tip: Copy this message and paste it directly into WhatsApp, Email, or LinkedIn!
                </div>
              </div>

              {/* Audience Targets Cards */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Perfect For:</h4>
                <ul className="space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue font-bold mt-0.5">•</span>
                    <span><strong>Friends & Family</strong> tracking their commute costs or hybrid rotas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue font-bold mt-0.5">•</span>
                    <span><strong>Corporate Buyers</strong> wanting to integrate localized compliance tools for teams.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue font-bold mt-0.5">•</span>
                    <span><strong>Freelancers/Contractors</strong> justifying hourly invoices with chronological statements.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-6" id="tester-guide-pane-content">
          
          {/* Interactive Gamified Progress Header */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-blue" />
                  Interactive Tester Checklist
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  Help optimize WorkLedger! Tick off these test scenarios as you explore to ensure 100% functional coverage.
                </p>
              </div>
              
              {/* Progress visualizer */}
              <div className="sm:text-right space-y-1 min-w-[140px]">
                <div className="text-xs font-extrabold text-slate-800">
                  Overall Completion: <span className="text-brand-blue">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-brand-blue h-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-600 font-extrabold">
                  {completedCount} of {checklist.length} tasks completed
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklist.map((item) => (
              <div 
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  item.completed 
                    ? 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50' 
                    : 'bg-white border-slate-250 hover:border-slate-400 hover:bg-slate-50/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  item.completed 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'border-slate-400 bg-white'
                }`}>
                  {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      item.completed 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed font-semibold ${
                    item.completed ? 'text-slate-500 line-through' : 'text-slate-850'
                  }`}>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Hidden Gem Walkthrough Guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700" /> Hidden App Gems to Highlight in Feedback
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-800 font-semibold leading-relaxed">
              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-900 block">1. The Print Media Styling</span>
                <p className="text-slate-700 font-medium text-[11px]">
                  When you print the PDF statement from the Reports tab, custom CSS overrides the app sidebar and header. Your exported document turns into a clean, physical A4 business report without screen clutter!
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-900 block">2. Bridge-Day Optimization</span>
                <p className="text-slate-700 font-medium text-[11px]">
                  Under the Interactive Calendar, we map Danish Public Holidays dynamically. If a holiday falls on a Tuesday or Thursday, the planner identifies it as an "Incredible bridge opportunity!" and advises you to book the single adjacent day.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-900 block">3. Company Profiles</span>
                <p className="text-slate-700 font-medium text-[11px]">
                  You can jump to the Settings tab, add a new employer company or change standard daily hours. It seamlessly recalculates expected hours even for older imported log sheets without breaking any data!
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-900 block">4. Hidden Developer Sandbox</span>
                <p className="text-slate-700 font-medium text-[11px]">
                  Tap your profile name/avatar in the sidebar 5 times to reveal hidden sandboxing tools. This lets you re-seed the application with realistic 2026 data, instantly syncing state and taking you back to the home view!
                </p>
              </div>
            </div>
          </div>

          {/* Navigation help */}
          {onNavigate && (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('home')}
                className="px-4 py-2 text-xs font-extrabold text-brand-blue bg-brand-blue/5 border border-brand-blue/15 hover:bg-brand-blue/10 rounded-xl transition-all"
              >
                Go to Quick Entry &rarr;
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 text-xs font-extrabold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
              >
                Go to Dashboard &rarr;
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
