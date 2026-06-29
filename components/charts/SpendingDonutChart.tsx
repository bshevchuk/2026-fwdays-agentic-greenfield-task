'use client';
// @trace FR-CHART-01, FR-CHART-03, FR-CHART-05, NFR-I18N-01

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { en } from '@/lib/i18n/en';
import type { DonutSlice } from '@/lib/charts/types';

interface Props {
  slices: DonutSlice[];
  currency: string;
}

function LegendItem({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {name}
    </span>
  );
}

export default function SpendingDonutChart({ slices, currency }: Props) {
  if (slices.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">{en.CHART_DONUT_EMPTY}</p>
      </div>
    );
  }

  return (
    <div>
      <PieChart width={320} height={260}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="categoryName"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {slices.map((entry) => (
            <Cell key={`cell-${entry.categoryId}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const slice = payload[0].payload as DonutSlice;
            return (
              <div className="rounded border border-border bg-background p-2 text-sm shadow">
                <p className="font-medium">{slice.categoryName}</p>
                <p>
                  {en.CHART_TOOLTIP_AMOUNT}: {slice.value.toFixed(2)} {currency}
                </p>
                <p>{slice.percent.toFixed(1)}%</p>
              </div>
            );
          }}
        />
        <Legend
          content={() => (
            <ul className="mt-2 flex flex-wrap gap-3 justify-center">
              {slices.map((s) => (
                <li key={s.categoryId}>
                  <LegendItem color={s.color} name={s.categoryName} />
                </li>
              ))}
            </ul>
          )}
        />
      </PieChart>
    </div>
  );
}
