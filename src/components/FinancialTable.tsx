import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { FIELD_TOOLTIPS } from '../data/learningContent';
import type {
  BalanceSheetYear,
  CashFlowYear,
  FinancialStatementsBundle,
  IncomeStatementYear,
} from '../types/financial';
import { InfoTooltip } from './InfoTooltip';

type StatementTab = 'income' | 'balance' | 'cashflow' | 'ratios';

interface FinancialTableProps {
  historical: FinancialStatementsBundle;
  forecast: FinancialStatementsBundle;
  currencyUnit: string;
  onEditHistoricalCell: (
    statement: 'income' | 'balance' | 'cashflow',
    yearIndex: number,
    field: string,
    newValue: number
  ) => void;
}

function fmtAccounting(n: number, decimals = 1, prefix = ''): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return n < 0 ? `(${prefix}${abs})` : `${prefix}${abs}`;
}

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function FinancialTable({
  historical,
  forecast,
  currencyUnit,
  onEditHistoricalCell,
}: FinancialTableProps) {
  const [activeTab, setActiveTab] = useState<StatementTab>('income');
  const [editingCell, setEditingCell] = useState<{ key: string; val: string } | null>(null);

  const allIs = [...historical.incomeStatement, ...forecast.incomeStatement];
  const allBs = [...historical.balanceSheet, ...forecast.balanceSheet];
  const allCf = [...historical.cashFlow, ...forecast.cashFlow];
  const allRatios = [...historical.ratios, ...forecast.ratios];

  const histLen = historical.incomeStatement.length;

  const commitEdit = (
    statement: 'income' | 'balance' | 'cashflow',
    yearIndex: number,
    field: string
  ) => {
    if (!editingCell) return;
    const num = Number(editingCell.val.replace(/[,$\s]/g, ''));
    if (Number.isFinite(num)) {
      onEditHistoricalCell(statement, yearIndex, field, num);
    }
    setEditingCell(null);
  };

  const renderEditableOrValue = (
    statement: 'income' | 'balance' | 'cashflow',
    colIdx: number,
    field: string,
    value: number,
    editable: boolean,
    decimals = 1,
    prefix = '$'
  ) => {
    const cellKey = `${statement}-${colIdx}-${field}`;
    const isEditing = editingCell?.key === cellKey;

    if (editable && colIdx < histLen) {
      if (isEditing) {
        return (
          <input
            type="text"
            autoFocus
            aria-label={`Edit ${field} for period ${colIdx + 1}`}
            value={editingCell.val}
            onChange={(e) => setEditingCell({ key: cellKey, val: e.target.value })}
            onBlur={() => commitEdit(statement, colIdx, field)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(statement, colIdx, field);
              if (e.key === 'Escape') setEditingCell(null);
            }}
            className="w-24 rounded border border-[#1A1A2E] bg-white px-1.5 py-0.5 text-right font-mono-tabular text-xs text-slate-900 focus:outline-none"
          />
        );
      }

      return (
        <button
          type="button"
          onClick={() => setEditingCell({ key: cellKey, val: String(value) })}
          title="Click to override extracted value"
          className="group inline-flex items-center justify-end gap-1 rounded px-1 py-0.5 hover:bg-slate-100 transition-colors"
        >
          <Pencil className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className={value < 0 ? 'text-red-700' : ''}>{fmtAccounting(value, decimals, prefix)}</span>
        </button>
      );
    }

    return <span className={value < 0 ? 'text-red-700' : ''}>{fmtAccounting(value, decimals, prefix)}</span>;
  };

  const years =
    activeTab === 'income'
      ? allIs.map((x) => ({ label: x.year, isForecast: !!x.isForecast, note: x.driverNote }))
      : activeTab === 'balance'
        ? allBs.map((x) => ({ label: x.year, isForecast: !!x.isForecast, note: undefined }))
        : activeTab === 'cashflow'
          ? allCf.map((x) => ({ label: x.year, isForecast: !!x.isForecast, note: undefined }))
          : allRatios.map((x) => ({ label: x.year, isForecast: !!x.isForecast, note: undefined }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-lg font-bold text-[#1A1A2E]">
            Financial Statements & Ratios
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Units: {currencyUnit} (except EPS & ratios) · Click any historical input cell to override · Blue tint = Forecast
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
          {(
            [
              ['income', 'Income Statement'],
              ['balance', 'Balance Sheet'],
              ['cashflow', 'Cash Flow'],
              ['ratios', 'Key Ratios'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === id ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="sticky left-0 z-10 min-w-[200px] bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                Line Item
              </th>
              {years.map((y, idx) => (
                <th
                  key={`${y.label}-${idx}`}
                  title={y.note}
                  className={`min-w-[92px] px-3 py-3 text-right font-mono-tabular font-semibold ${
                    y.isForecast ? 'bg-sky-50/90 text-sky-950' : 'text-slate-700'
                  }`}
                >
                  {y.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono-tabular">
            {activeTab === 'income' && (
              <>
                {(
                  [
                    { label: 'Revenue', field: 'revenue', editable: true, bold: true, prefix: '$', tip: FIELD_TOOLTIPS.revenue, showGrowth: true },
                    { label: 'Cost of Goods Sold (COGS)', field: 'cogs', editable: true, indent: true, prefix: '$', tip: FIELD_TOOLTIPS.cogs },
                    { label: 'Gross Profit', field: 'grossProfit', editable: false, bold: true, prefix: '$', tip: FIELD_TOOLTIPS.grossProfit },
                    { label: 'SG&A Expense', field: 'sga', editable: true, indent: true, prefix: '$' },
                    { label: 'Research & Development (R&D)', field: 'rd', editable: true, indent: true, prefix: '$' },
                    { label: 'Depreciation & Amortization (D&A)', field: 'da', editable: true, indent: true, prefix: '$' },
                    { label: 'Operating Income (EBIT)', field: 'ebit', editable: false, bold: true, prefix: '$', tip: FIELD_TOOLTIPS.ebit },
                    { label: 'Interest Expense', field: 'interestExpense', editable: true, indent: true, prefix: '$' },
                    { label: 'Pre-Tax Income', field: 'preTaxIncome', editable: false, bold: true, prefix: '$' },
                    { label: 'Income Tax Expense', field: 'taxExpense', editable: true, indent: true, prefix: '$' },
                    { label: 'Net Income', field: 'netIncome', editable: false, bold: true, prefix: '$', tip: FIELD_TOOLTIPS.netIncome },
                    { label: 'EBITDA', field: 'ebitda', editable: false, bold: true, prefix: '$', tip: FIELD_TOOLTIPS.ebitda },
                    { label: 'Diluted Shares (M)', field: 'sharesOutstanding', editable: true, prefix: '' },
                    { label: 'Diluted EPS', field: 'epsDiluted', editable: false, bold: true, decimals: 2, prefix: '$' },
                  ] as const
                ).map((row) => (
                  <tr key={row.field} className={'bold' in row && row.bold ? 'bg-slate-50/40 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50/60'}>
                    <td className="sticky left-0 z-10 bg-white px-5 py-2.5 font-sans">
                      <div className={`flex items-center gap-1.5 ${'indent' in row && row.indent ? 'pl-3 text-slate-600' : ''}`}>
                        <span>{row.label}</span>
                        {'tip' in row && row.tip && <InfoTooltip label={row.label} text={row.tip} />}
                      </div>
                    </td>
                    {allIs.map((yr, idx) => {
                      const val = yr[row.field as keyof IncomeStatementYear] as number;
                      const prevVal = idx > 0 ? (allIs[idx - 1].revenue as number) : null;
                      const growth =
                        'showGrowth' in row && row.showGrowth && prevVal && prevVal > 0
                          ? (yr.revenue - prevVal) / prevVal
                          : null;
                      return (
                        <td
                          key={`${row.field}-${idx}`}
                          title={yr.isForecast ? yr.driverNote : undefined}
                          className={`px-4 py-2.5 text-right ${yr.isForecast ? 'bg-sky-50/60' : ''}`}
                        >
                          <div>
                            {renderEditableOrValue(
                              'income',
                              idx,
                              row.field,
                              val,
                              row.editable,
                              'decimals' in row ? row.decimals : 1,
                              row.prefix
                            )}
                          </div>
                          {growth !== null && (
                            <div className={`text-[10px] font-normal ${growth >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {growth >= 0 ? '+' : ''}
                              {(growth * 100).toFixed(1)}% YoY
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {activeTab === 'balance' && (
              <>
                {(
                  [
                    { label: 'Cash & Equivalents', field: 'cashAndEquivalents', editable: true },
                    { label: 'Accounts Receivable', field: 'accountsReceivable', editable: true },
                    { label: 'Inventory', field: 'inventory', editable: true },
                    { label: 'Total Current Assets', field: 'totalCurrentAssets', editable: false, bold: true },
                    { label: 'PP&E (Net)', field: 'ppeNet', editable: true },
                    { label: 'Goodwill', field: 'goodwill', editable: true },
                    { label: 'Intangible Assets', field: 'intangibles', editable: true },
                    { label: 'Total Assets', field: 'totalAssets', editable: false, bold: true },
                    { label: 'Accounts Payable', field: 'accountsPayable', editable: true },
                    { label: 'Short-Term Debt', field: 'shortTermDebt', editable: true },
                    { label: 'Total Current Liabilities', field: 'totalCurrentLiabilities', editable: false, bold: true },
                    { label: 'Long-Term Debt', field: 'longTermDebt', editable: true },
                    { label: 'Total Liabilities', field: 'totalLiabilities', editable: false, bold: true },
                    { label: 'Shareholders Equity', field: 'shareholdersEquity', editable: true, bold: true },
                  ] as const
                ).map((row) => (
                  <tr key={row.field} className={'bold' in row && row.bold ? 'bg-slate-50/40 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50/60'}>
                    <td className="sticky left-0 z-10 bg-white px-5 py-2.5 font-sans">{row.label}</td>
                    {allBs.map((yr, idx) => (
                      <td key={`${row.field}-${idx}`} className={`px-4 py-2.5 text-right ${yr.isForecast ? 'bg-sky-50/60' : ''}`}>
                        {renderEditableOrValue(
                          'balance',
                          idx,
                          row.field,
                          yr[row.field as keyof BalanceSheetYear] as number,
                          row.editable
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {activeTab === 'cashflow' && (
              <>
                {(
                  [
                    { label: 'Cash Flow from Operations (CFO)', field: 'cfo', editable: true, bold: true },
                    { label: 'Capital Expenditures (CapEx)', field: 'capex', editable: true },
                    { label: 'Free Cash Flow (FCF)', field: 'fcf', editable: false, bold: true },
                    { label: 'Acquisitions', field: 'acquisitions', editable: true },
                    { label: 'Dividends Paid', field: 'dividends', editable: true },
                    { label: 'Share Repurchases', field: 'shareRepurchases', editable: true },
                    { label: 'Debt Issuance / (Repayment)', field: 'debtIssuanceRepayment', editable: true },
                    { label: 'Net Change in Cash', field: 'netChangeInCash', editable: false, bold: true },
                  ] as const
                ).map((row) => (
                  <tr key={row.field} className={'bold' in row && row.bold ? 'bg-slate-50/40 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50/60'}>
                    <td className="sticky left-0 z-10 bg-white px-5 py-2.5 font-sans">{row.label}</td>
                    {allCf.map((yr, idx) => (
                      <td key={`${row.field}-${idx}`} className={`px-4 py-2.5 text-right ${yr.isForecast ? 'bg-sky-50/60' : ''}`}>
                        {renderEditableOrValue(
                          'cashflow',
                          idx,
                          row.field,
                          yr[row.field as keyof CashFlowYear] as number,
                          row.editable
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {activeTab === 'ratios' && (
              <>
                {(
                  [
                    { label: 'Revenue Growth (YoY)', field: 'revenueGrowthYoY', format: 'pct' },
                    { label: 'Gross Margin', field: 'grossMargin', format: 'pct' },
                    { label: 'Operating Margin (EBIT)', field: 'operatingMargin', format: 'pct' },
                    { label: 'EBITDA Margin', field: 'ebitdaMargin', format: 'pct' },
                    { label: 'Net Profit Margin', field: 'netMargin', format: 'pct' },
                    { label: 'Return on Equity (ROE)', field: 'roe', format: 'pct' },
                    { label: 'Return on Assets (ROA)', field: 'roa', format: 'pct' },
                    { label: 'Return on Invested Capital (ROIC)', field: 'roic', format: 'pct', tip: FIELD_TOOLTIPS.roic },
                    { label: 'Current Ratio', field: 'currentRatio', format: 'mult' },
                    { label: 'Debt / Equity', field: 'debtToEquity', format: 'mult' },
                    { label: 'Interest Coverage (x)', field: 'interestCoverage', format: 'mult' },
                  ] as const
                ).map((row) => (
                  <tr key={row.field} className="text-slate-700 hover:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white px-5 py-2.5 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span>{row.label}</span>
                        {'tip' in row && row.tip && <InfoTooltip label={row.label} text={row.tip} />}
                      </div>
                    </td>
                    {allRatios.map((yr, idx) => {
                      const val = yr[row.field];
                      return (
                        <td key={`${row.field}-${idx}`} className={`px-4 py-2.5 text-right ${yr.isForecast ? 'bg-sky-50/60' : ''}`}>
                          {row.format === 'pct'
                            ? fmtPct(val as number | null)
                            : val === null
                              ? '—'
                              : `${Number(val).toFixed(2)}x`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
