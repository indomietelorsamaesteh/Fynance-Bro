import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedAppleModel } from '../src/data/seedModels';
import { buildFinancialModelWorkbook } from './excelExport';

test('buildFinancialModelWorkbook creates all 8 required sheets with live Excel formulas', async () => {
  const model = createSeedAppleModel('user-1');
  const wb = await buildFinancialModelWorkbook(model, 'Alex Analyst', false);

  const sheetNames = wb.worksheets.map((ws) => ws.name);
  assert.deepEqual(sheetNames, [
    'Cover Page',
    'Assumptions',
    'Income Statement',
    'Balance Sheet',
    'Cash Flow Statement',
    'DCF Model',
    'Sensitivity',
    'Key Ratios',
  ]);

  const isSheet = wb.getWorksheet('Income Statement')!;
  const grossProfitCell = isSheet.getCell('B7').value as { formula: string; result: number };
  assert.equal(grossProfitCell.formula, 'B5-B6');

  // Forecast revenue cell in F5 (first forecast year after 4 historical years B..E) links to Assumptions!B5
  const fcstRevCell = isSheet.getCell('F5').value as { formula: string; result: number };
  assert.ok(fcstRevCell.formula.includes('Assumptions!B5'));

  const dcfSheet = wb.getWorksheet('DCF Model')!;
  const evCell = dcfSheet.getCell('B34').value as { formula: string; result: number };
  assert.equal(evCell.formula, 'B31+B33');
  const impliedPriceCell = dcfSheet.getCell('B39').value as { formula: string; result: number };
  assert.equal(impliedPriceCell.formula, 'B37/B38');

  const sensSheet = wb.getWorksheet('Sensitivity')!;
  const sensCell = sensSheet.getCell('B5').value as { formula: string; result: number };
  assert.ok(sensCell.formula.includes("'DCF Model'!"));

  const buffer = await wb.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 5000);
});

test('generateEquityResearchPdf renders a valid multi-page Equity Research PDF', async () => {
  const { generateEquityResearchPdf } = await import('./pdfExport');
  const model = createSeedAppleModel('user-1');
  const pdfBuffer = await generateEquityResearchPdf(model, 'Alex Analyst');
  assert.ok(pdfBuffer.byteLength > 4000);
  assert.equal(pdfBuffer.subarray(0, 5).toString('utf8'), '%PDF-');
});
