import { Box, Stack, Typography } from '@mui/material';
import type { DashboardWidgetPayload } from '../../types/dashboard.js';

interface ChartRendererProps {
  payload: DashboardWidgetPayload;
}

function normalizePoints(data: any): Array<{ label: string; value: number }> {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((row) => ({
      label: String(row.label ?? row.name ?? ''),
      value: Number(row.value ?? 0),
    }))
    .filter((row) => row.label.length > 0);
}

function LineChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 480;
  const height = 180;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / max) * (height - 16) - 8;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <Box>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="190" role="img" aria-label="Line chart">
        <path d={path} fill="none" stroke="#0078D4" strokeWidth="3" />
      </svg>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {points.map((point) => (
          <Typography key={point.label} variant="caption" color="text.secondary">
            {point.label}: {point.value}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

function BarChart({ points, horizontal = false }: { points: Array<{ label: string; value: number }>; horizontal?: boolean }) {
  const max = Math.max(1, ...points.map((point) => point.value));

  if (horizontal) {
    return (
      <Stack spacing={1.25}>
        {points.map((point) => (
          <Box key={point.label}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2">{point.label}</Typography>
              <Typography variant="body2" fontWeight={600}>
                {point.value}
              </Typography>
            </Stack>
            <Box sx={{ height: 10, borderRadius: 999, backgroundColor: '#EAF1F8', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.max(4, (point.value / max) * 100)}%`,
                  backgroundColor: '#0F3B68',
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ minHeight: 180 }}>
      {points.map((point) => (
        <Box key={point.label} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <Box
            sx={{
              height: `${Math.max(8, (point.value / max) * 140)}px`,
              borderRadius: '8px 8px 0 0',
              backgroundColor: '#0078D4',
              mx: 'auto',
              width: '80%',
            }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }} noWrap>
            {point.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {point.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function PieChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const palette = ['#0078D4', '#106EBE', '#0F3B68', '#59A5F5', '#82C8FF', '#005A9E'];

  let cursor = 0;
  const segments = points.map((point, index) => {
    const percentage = total <= 0 ? 0 : (point.value / total) * 100;
    const start = cursor;
    cursor += percentage;
    return `${palette[index % palette.length]} ${start}% ${cursor}%`;
  });

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
      <Box
        sx={{
          width: 170,
          height: 170,
          borderRadius: '50%',
          background: `conic-gradient(${segments.join(', ')})`,
          border: '8px solid #F5F7FA',
        }}
      />
      <Stack spacing={0.75} sx={{ width: '100%' }}>
        {points.map((point, index) => (
          <Stack key={point.label} direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: palette[index % palette.length] }} />
              <Typography variant="body2">{point.label}</Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600}>
              {point.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function Gauge({ data }: { data: Record<string, number> }) {
  const ratio = Math.max(0, Math.min(100, Number(data.cache_hit_ratio ?? 0)));
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        Cache Hit Ratio
      </Typography>
      <Box sx={{ height: 14, borderRadius: 999, backgroundColor: '#EAF1F8', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${ratio}%`, backgroundColor: ratio > 80 ? '#107C10' : '#D13438' }} />
      </Box>
      <Typography variant="h6">{ratio.toFixed(2)}%</Typography>
      <Typography variant="caption" color="text.secondary">
        Connections: {Number(data.connections ?? 0)} | Commits: {Number(data.commits ?? 0)} | Rollbacks: {Number(data.rollbacks ?? 0)}
      </Typography>
    </Stack>
  );
}

export default function WidgetCharts({ payload }: ChartRendererProps) {
  const points = normalizePoints(payload.data);

  if (payload.widget_type === 'line_chart' || payload.widget_type === 'area_chart') {
    return <LineChart points={points} />;
  }

  if (payload.widget_type === 'bar_chart') {
    return <BarChart points={points} />;
  }

  if (payload.widget_type === 'horizontal_bar_chart') {
    return <BarChart points={points} horizontal />;
  }

  if (payload.widget_type === 'pie_chart') {
    return <PieChart points={points} />;
  }

  if (payload.widget_type === 'gauge') {
    return <Gauge data={(payload.data ?? {}) as Record<string, number>} />;
  }

  return (
    <Typography variant="body2" color="text.secondary">
      Chart data is not available.
    </Typography>
  );
}
