'use client';
// @trace FR-CHART-02, FR-CHART-03, FR-CHART-05, NFR-I18N-01

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { en } from '@/lib/i18n/en';
import type { MonthBar } from '@/lib/charts/types';

interface Props {
  bars: MonthBar[];
  currency: string;
}

export default function MonthlyBarChart({ bars, currency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bars} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded border border-border bg-background p-2 text-sm shadow">
                <p className="font-medium">{String(label ?? '')}</p>
                {payload.map((entry, i) => (
                  <p key={i}>
                    {String(entry.name ?? '')}: {Number(entry.value ?? 0).toFixed(2)} {currency}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend />
        <Bar dataKey="income" name={en.CHART_INCOME_LABEL} fill="#22c55e" />
        <Bar dataKey="expense" name={en.CHART_EXPENSE_LABEL} fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}
