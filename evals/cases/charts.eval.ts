// @trace FR-CHART-01, FR-CHART-02, FR-CHART-03

/**
 * Eval cases for chart aggregation API quality.
 *
 * Dimension: api-contract
 * These cases grade qualitative properties that unit tests can check in
 * isolation but a judge can assess holistically: correct empty-state shape,
 * exact 12-month bar array length, and absence of live FX calls in the
 * chart route source (FR-CHART-03 compliance).
 *
 * produce() functions use fetch() against the running dev server, except
 * eval-charts-no-live-fx which reads the route source file directly.
 *
 * Dev server must be running at http://localhost:3000.
 */

import { EvalCase } from './shell.eval';
import { readFileSync } from 'fs';
import { join } from 'path';

export const cases: EvalCase[] = [
  {
    id: 'eval-charts-api-empty-state',
    trace: ['FR-CHART-01', 'FR-CHART-02'],
    dimension: 'api-contract',
    capability: 'charts',
    scenario:
      'GET /api/charts/data?month=2026-06&currency=USD with an empty (or sparse) ' +
      'database returns a valid response. The donut array may be empty but the ' +
      'bar array must always have exactly 12 entries with the correct field shape.',
    produce: async () => {
      const res = await fetch(
        'http://localhost:3000/api/charts/data?month=2026-06&currency=USD',
      );
      const body = await res.json();
      return JSON.stringify({ status: res.status, body });
    },
    rubric: [
      'CRITICAL: HTTP status is 200, not 500',
      'CRITICAL: response body has a "donut" field that is an array (may be empty)',
      'CRITICAL: response body has a "bar" field that is an array of exactly 12 entries',
      'every entry in the bar array has a "month" string field (human-readable, e.g. "Jun 2026") and a "monthKey" field (YYYY-MM for sorting)',
      'every entry in the bar array has an "income" numeric field',
      'every entry in the bar array has an "expense" numeric field',
      'no error field is present in the response body',
    ],
  },
  {
    id: 'eval-charts-bar-twelve-months',
    trace: ['FR-CHART-02'],
    dimension: 'correctness',
    capability: 'charts',
    scenario:
      'The bar chart always represents exactly the trailing 12 calendar months ' +
      'ending at the requested month. Neither 11 nor 13 months is acceptable — ' +
      'the chart must fill every month slot even if there are no transactions.',
    produce: async () => {
      const res = await fetch(
        'http://localhost:3000/api/charts/data?month=2026-06&currency=USD',
      );
      const body = (await res.json()) as { bar?: unknown[] };
      const barLength = Array.isArray(body.bar) ? body.bar.length : -1;
      return JSON.stringify({ barLength, status: res.status });
    },
    rubric: [
      'CRITICAL: barLength is exactly 12 — not 11, not 13, not any other count',
      'CRITICAL: HTTP status is 200',
      'the 12-entry count holds even when the database is empty (zero-fill required)',
    ],
  },
  {
    id: 'eval-charts-no-live-fx',
    trace: ['FR-CHART-03'],
    dimension: 'correctness',
    capability: 'charts',
    scenario:
      'FR-CHART-03 forbids live FX calls at chart render time. The chart route ' +
      'must rely only on stored rate_to_usd values. This is verified by inspecting ' +
      'the route source for any reference to the live frankfurter.app API.',
    produce: async () => {
      return readFileSync(
        join(process.cwd(), 'app/api/charts/data/route.ts'),
        'utf-8',
      );
    },
    rubric: [
      'CRITICAL: the string "api.frankfurter" must NOT appear anywhere in the source',
      'CRITICAL: the string "frankfurter.app" must NOT appear anywhere in the source',
      'no fetch() call targeting an external FX provider is present in the route',
      'the route uses only in-memory or pre-stored rate data (rate_to_usd column)',
    ],
  },
];
