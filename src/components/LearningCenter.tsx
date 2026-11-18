import { useState } from 'react';
import { BookOpen, Calculator, Search } from 'lucide-react';
import { GLOSSARY_ENTRIES, LEARNING_ARTICLES } from '../data/learningContent';

export function LearningCenter() {
  const [selectedArticleId, setSelectedArticleId] = useState(LEARNING_ARTICLES[0].id);
  const [glossaryQuery, setGlossaryQuery] = useState('');

  // Interactive WACC Mini-Calculator state
  const [rf, setRf] = useState(4.25);
  const [beta, setBeta] = useState(1.1);
  const [erp, setErp] = useState(5.0);
  const [costDebt, setCostDebt] = useState(4.5);
  const [taxRate, setTaxRate] = useState(21);
  const [equityWeight, setEquityWeight] = useState(85);

  const ke = rf + beta * erp;
  const afterTaxKd = costDebt * (1 - taxRate / 100);
  const debtWeight = 100 - equityWeight;
  const wacc = (equityWeight / 100) * ke + (debtWeight / 100) * afterTaxKd;

  const activeArticle =
    LEARNING_ARTICLES.find((a) => a.id === selectedArticleId) ?? LEARNING_ARTICLES[0];

  const filteredGlossary = GLOSSARY_ENTRIES.filter((entry) => {
    const q = glossaryQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.term.toLowerCase().includes(q) ||
      entry.definition.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#1A1A2E]">
          Learning Center
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Practical guides on SEC Form 10-K reading, three-statement modeling, WACC, DCF valuation, and sensitivity
          analysis.
        </p>
      </div>

      {/* Articles Browser + Reader */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-4">
          {LEARNING_ARTICLES.map((article) => {
            const active = article.id === activeArticle.id;
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => setSelectedArticleId(article.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-[#1A1A2E] bg-white shadow-sm'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="text-[11px] font-medium text-slate-500">
                  {article.category} · {article.readTime}
                </div>
                <div className="mt-1 font-display text-sm font-bold text-[#1A1A2E]">{article.title}</div>
              </button>
            );
          })}
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <BookOpen className="h-4 w-4" />
            <span>
              {activeArticle.category} · {activeArticle.readTime}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#1A1A2E]">{activeArticle.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeArticle.summary}</p>

          <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
            {activeArticle.sections.map((sec) => (
              <div key={sec.heading}>
                <h3 className="font-display text-base font-semibold text-[#1A1A2E]">{sec.heading}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{sec.body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Interactive WACC Calculator */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-[#1A1A2E]" />
          <h2 className="font-display text-lg font-bold text-[#1A1A2E]">Interactive WACC Calculator</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Experiment with CAPM inputs and capital weights to see how Cost of Equity and WACC respond.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="calc-rf" className="block text-xs font-medium text-slate-700 mb-1">
              Risk-Free (%)
            </label>
            <input
              id="calc-rf"
              type="number"
              step="0.25"
              value={rf}
              onChange={(e) => setRf(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
          <div>
            <label htmlFor="calc-beta" className="block text-xs font-medium text-slate-700 mb-1">
              Beta (β)
            </label>
            <input
              id="calc-beta"
              type="number"
              step="0.1"
              value={beta}
              onChange={(e) => setBeta(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
          <div>
            <label htmlFor="calc-erp" className="block text-xs font-medium text-slate-700 mb-1">
              ERP (%)
            </label>
            <input
              id="calc-erp"
              type="number"
              step="0.25"
              value={erp}
              onChange={(e) => setErp(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
          <div>
            <label htmlFor="calc-kd" className="block text-xs font-medium text-slate-700 mb-1">
              Pre-Tax Debt (%)
            </label>
            <input
              id="calc-kd"
              type="number"
              step="0.25"
              value={costDebt}
              onChange={(e) => setCostDebt(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
          <div>
            <label htmlFor="calc-tax" className="block text-xs font-medium text-slate-700 mb-1">
              Tax Rate (%)
            </label>
            <input
              id="calc-tax"
              type="number"
              step="1"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
          <div>
            <label htmlFor="calc-ew" className="block text-xs font-medium text-slate-700 mb-1">
              Equity Weight (%)
            </label>
            <input
              id="calc-ew"
              type="number"
              min="0"
              max="100"
              step="5"
              value={equityWeight}
              onChange={(e) => setEquityWeight(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Cost of Equity (Re)</div>
            <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">{ke.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">After-Tax Cost of Debt</div>
            <div className="mt-1 font-mono-tabular text-lg font-bold text-slate-900">{afterTaxKd.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Resulting WACC</div>
            <div className="mt-1 font-mono-tabular text-lg font-bold text-emerald-800">{wacc.toFixed(2)}%</div>
          </div>
        </div>
      </section>

      {/* Searchable Financial Glossary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="font-display text-lg font-bold text-[#1A1A2E]">Financial Modeling Glossary</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={glossaryQuery}
              onChange={(e) => setGlossaryQuery(e.target.value)}
              placeholder="Search terms (e.g., WACC, ROIC)"
              aria-label="Search glossary terms"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-[#1A1A2E] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGlossary.map((entry) => (
            <div key={entry.term} className="rounded-lg border border-slate-200 p-4">
              <div className="text-[11px] font-medium text-slate-500">{entry.category}</div>
              <div className="mt-0.5 font-display text-sm font-bold text-[#1A1A2E]">{entry.term}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{entry.definition}</p>
              {entry.formula && (
                <div className="mt-2 font-mono-tabular text-[11px] text-emerald-800">
                  Formula: {entry.formula}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
