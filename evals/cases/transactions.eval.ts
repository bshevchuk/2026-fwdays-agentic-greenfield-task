// @trace FR-TX-01, FR-TX-02, FR-TX-03

/**
 * Eval cases for transaction API response quality.
 *
 * Dimension: api-contract
 * These cases grade qualitative properties of the HTTP responses:
 * correct shape on success, human-readable error surfacing on validation
 * failure, and graceful handling of query parameters.
 *
 * produce() functions use fetch() against the running dev server.
 * Dev server must be running at http://localhost:3000.
 */

import { EvalCase } from './shell.eval';

export const cases: EvalCase[] = [
  {
    id: 'eval-tx-api-empty-list',
    trace: ['FR-TX-01', 'FR-TX-06'],
    dimension: 'api-contract',
    capability: 'transactions',
    scenario:
      'GET /api/transactions with no query parameters returns the current-month ' +
      'transaction list. Even with an empty database the response must have the ' +
      'correct envelope shape: transactions array, total number, page number.',
    produce: async () => {
      const res = await fetch('http://localhost:3000/api/transactions');
      const body = await res.json();
      return JSON.stringify({ status: res.status, body });
    },
    rubric: [
      'CRITICAL: HTTP status is 200, not 500',
      'CRITICAL: response body has a "transactions" field that is an array',
      'CRITICAL: response body has a "total" field that is a number',
      'CRITICAL: response body has a "page" field that is a number',
      'response body has a "pageSize" field',
      'no stack trace or internal error message is visible in the response',
    ],
  },
  {
    id: 'eval-tx-validation-error-surface',
    trace: ['FR-TX-02', 'FR-TX-03'],
    dimension: 'api-contract',
    capability: 'transactions',
    scenario:
      'POST /api/transactions with an invalid negative amount. The route must ' +
      'reject the input with a 4xx status and return a human-readable error ' +
      'string — not a raw stack trace, exception class name, or empty body.',
    produce: async () => {
      const res = await fetch('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: -1,
          currency: 'USD',
          date: '2026-06-01',
          type: 'expense',
        }),
      });
      const body = await res.json();
      return JSON.stringify({ status: res.status, body });
    },
    rubric: [
      'CRITICAL: HTTP status is 422 or 400, not 200 and not 500',
      'CRITICAL: response body has an "error" field that is a non-empty string',
      'the "error" string is written in plain English (not a stack trace, not "Error: ...")',
      'the "error" string mentions the amount or explains why the input was rejected',
      'no stack trace, file path, or internal module name is visible in the response',
    ],
  },
  {
    id: 'eval-tx-api-filter-by-month',
    trace: ['FR-TX-01', 'FR-TX-07'],
    dimension: 'api-contract',
    capability: 'transactions',
    scenario:
      'GET /api/transactions?month=2026-06 must be accepted without error and ' +
      'return the same envelope shape as the unfiltered endpoint. The month ' +
      'filter must not cause a crash or validation rejection.',
    produce: async () => {
      const res = await fetch('http://localhost:3000/api/transactions?month=2026-06');
      const body = await res.json();
      return JSON.stringify({ status: res.status, body });
    },
    rubric: [
      'CRITICAL: HTTP status is 200, not 422 or 500',
      'CRITICAL: response body has a "transactions" array',
      'CRITICAL: response body has "total" and "page" numeric fields',
      'the month=2026-06 filter parameter is accepted without rejection',
      'no error field is present in a successful response',
    ],
  },
];
