// @trace FR-CHART-01, FR-CHART-02
// Server Component — animated placeholder matching chart footprint.
// Used as the loading prop in next/dynamic calls (NFR-PERF-03).

export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return <div className={`animate-pulse bg-muted rounded-lg ${height}`} />;
}
