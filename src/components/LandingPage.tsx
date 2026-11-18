import { ArrowRight, Check, FileSpreadsheet, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AuthModalMode } from './AuthModal';

interface LandingPageProps {
  onOpenAuth: (mode: AuthModalMode) => void;
  onDemoEnter: () => void;
}

const PREVIEW_REVENUE_DATA = [
  { year: 'FY23', rev: 383.3 },
  { year: 'FY24', rev: 391.0 },
  { year: 'FY25', rev: 416.2 },
  { year: 'FY26E', rev: 451.5 },
  { year: 'FY27E', rev: 488.6 },
  { year: 'FY28E', rev: 526.7 },
];

export function LandingPage({ onOpenAuth, onDemoEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-[#1A1A2E] whitespace-nowrap shrink-0"
          >
            Fynance Bro
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#workflow" className="hover:text-[#1A1A2E] transition-colors whitespace-nowrap shrink-0">
              Workflow
            </a>
            <a href="#capabilities" className="hover:text-[#1A1A2E] transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#proof" className="hover:text-[#1A1A2E] transition-colors whitespace-nowrap shrink-0">
              Benchmarks
            </a>
            <a href="#pricing" className="hover:text-[#1A1A2E] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] transition-colors whitespace-nowrap shrink-0"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-medium tracking-wide text-emerald-800">
                Institutional Equity Research · SEC Form 10-K Automation
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#1A1A2E] sm:text-5xl text-balance leading-[1.1]">
                From 10-K to Financial Model in Minutes.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                Upload any SEC Form 10-K filing and receive a fully linked three-statement historical model,
                three-scenario forecast, DCF valuation with WACC sensitivity heatmap, and formula-driven Excel or
                equity research PDF exports.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A2E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors whitespace-nowrap"
                >
                  <span>Sign Up Free</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={onDemoEnter}
                  className="px-3 py-3 text-sm font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-4 whitespace-nowrap"
                >
                  Launch Interactive Demo
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-200 pt-5">
                <span>Live Excel formulas</span>
                <span aria-hidden="true">·</span>
                <span>3 Risk-adjusted DCF scenarios</span>
                <span aria-hidden="true">·</span>
                <span>PDF equity research reports</span>
              </div>
            </div>

            {/* Interactive Model Preview Card */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs text-slate-500">AAPL · NASDAQ · Technology</div>
                      <div className="mt-0.5 font-display text-lg font-bold text-[#1A1A2E]">
                        Apple Inc. — Base Case DCF Model
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Implied Share Price</div>
                      <div className="font-mono-tabular text-xl font-bold text-emerald-700">$236.53</div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="text-xs text-slate-500">Market Price</div>
                      <div className="mt-1 font-mono-tabular text-base font-semibold text-slate-900">$224.50</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Implied Upside</div>
                      <div className="mt-1 font-mono-tabular text-base font-semibold text-emerald-700">+5.4%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">WACC / TGR</div>
                      <div className="mt-1 font-mono-tabular text-base font-semibold text-slate-900">7.4% / 3.4%</div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Historical & Projected Revenue ($B)</span>
                      <span className="font-mono-tabular text-slate-700">7Y Forecast Horizon</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={PREVIEW_REVENUE_DATA} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(val: unknown) => [`$${Number(val).toFixed(1)}B`, 'Revenue']}
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="rev" fill="#1A1A2E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>8-Tab Formula Workbook Ready</span>
                  <span className="font-mono-tabular text-slate-700">Gross Profit = B5-B6</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Triad (Editorial Numbered) */}
        <section id="workflow" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E] sm:text-3xl text-balance">
                Upload. Model. Export.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Built to replace 8 to 20 hours of manual SEC statement spreading without sacrificing auditability or
                formula transparency.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>01. Upload 10-K</span>
                  <FileText className="h-4 w-4 text-slate-700" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-[#1A1A2E]">
                  Structured Statement Extraction
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Drop any SEC Form 10-K PDF or EDGAR HTML filing up to 30 MB. Gemini AI extracts multi-year Income
                  Statement, Balance Sheet, Cash Flow, and Item 1 business context.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>02. Model & Value</span>
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-[#1A1A2E]">
                  Three-Scenario Forecasting & DCF
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Edit any historical cell inline, toggle Low, Medium, or High risk assumptions across 1 to 10 years,
                  and examine WACC and Terminal Growth sensitivity in real time.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>03. Export</span>
                  <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-[#1A1A2E]">
                  Live-Formula Excel & PDF Reports
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Download an 8-sheet Wall Street workbook where every output traces to dynamic Excel formulas—or export
                  a sell-side equity research PDF report.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Asymmetric Bento */}
        <section id="capabilities" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-7">
              <div className="text-xs font-medium text-emerald-800">Analyst-Grade Excel Architecture</div>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
                Every output cell traces to a live formula.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Unlike static CSV dumps, Fynance Bro generates an 8-tab Excel workbook with named ranges for WACC and
                Terminal Growth, blue input fonts, black same-sheet formulas, green cross-sheet links, and dynamic
                sensitivity formulas.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-xs text-slate-600 sm:grid-cols-4">
                <div>
                  <div className="font-mono-tabular font-semibold text-slate-900">Cover & Assumptions</div>
                  <div className="mt-0.5">Named drivers</div>
                </div>
                <div>
                  <div className="font-mono-tabular font-semibold text-slate-900">IS / BS / CF</div>
                  <div className="mt-0.5">3-statement links</div>
                </div>
                <div>
                  <div className="font-mono-tabular font-semibold text-slate-900">DCF Valuation</div>
                  <div className="mt-0.5">CAPM WACC & PV</div>
                </div>
                <div>
                  <div className="font-mono-tabular font-semibold text-slate-900">Sensitivity</div>
                  <div className="mt-0.5">49 dynamic scenarios</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 lg:col-span-5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Auditability & Control</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-[#1A1A2E]">
                Full override control with version history.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Override any extracted historical line item or custom forecast margin, save version snapshots before
                testing aggressive assumptions, and revert anytime. Every metric includes plain-English contextual
                tooltips.
              </p>
            </div>
          </div>
        </section>

        {/* Proof & Testimonials */}
        <section id="proof" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
              Trusted across research workflows
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-6">
                <div className="font-mono-tabular text-sm font-semibold text-emerald-800">
                  11 hrs saved per coverage initiation
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  “Spreading 5 years of 10-K tables used to take my entire Sunday. Now I upload the filing, verify two
                  footnotes, and spend my time on competitive moat analysis.”
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Marcus Chen · Junior Equity Analyst, Northbridge Capital
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-6">
                <div className="font-mono-tabular text-sm font-semibold text-emerald-800">
                  3× faster earnings-season screening
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  “Switching between Low, Medium, and High risk presets immediately shows how much WACC and margin
                  expansion are already priced into the stock.”
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Priya Nair · Portfolio Manager, Meridian Value Fund
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-6">
                <div className="font-mono-tabular text-sm font-semibold text-emerald-800">
                  Zero broken Excel formulas on export
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  “Our managing director expects clean blue inputs and linked DCF tabs. Fynance Bro exports a workbook
                  I can send directly to the investment committee.”
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Hannah Brooks · Independent Equity Researcher
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E] sm:text-3xl">
              Transparent analyst pricing
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Start building models for free. Upgrade when you need unlimited coverage and equity research PDFs.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-7">
              <div>
                <div className="text-xs font-medium text-slate-500">For Students & Trial Screening</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-[#1A1A2E]">$0</span>
                  <span className="text-sm text-slate-500">Free tier</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>3 lifetime 10-K financial analyses</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Historical 3-statement model, forecasting & DCF</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Interactive 49-cell sensitivity matrix</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Formula-driven Excel export (tier notice on cover)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1A1A2E] hover:bg-slate-50 transition-colors"
              >
                Start Free
              </button>
            </div>

            {/* Pro Tier */}
            <div className="flex flex-col justify-between rounded-xl border border-[#1A1A2E] bg-white p-7 shadow-sm">
              <div>
                <div className="text-xs font-medium text-emerald-800">For Equity Analysts & Portfolio Managers</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-[#1A1A2E]">$5</span>
                  <span className="text-sm text-slate-500">/ month</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Unlimited 10-K analyses and saved models</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Clean, unwatermarked institutional Excel exports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Sell-side Equity Research PDF report exports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Multi-model AI selection (Gemini + Claude) & full Learning Center</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="mt-8 w-full rounded-lg bg-[#1A1A2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2A2A48] transition-colors"
              >
                Get Started with Pro
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer with Legal Disclaimer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <span className="font-display text-base font-bold text-[#1A1A2E]">Fynance Bro</span>
            <div className="text-xs text-slate-500">© 2026 Fynance Bro. All rights reserved.</div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Disclaimer: This analysis was generated by AI and is provided for informational purposes only. It does not
            constitute financial advice, investment recommendations, or an offer to buy or sell securities. Users
            should independently verify all data and consult with qualified financial advisors before making investment
            decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
