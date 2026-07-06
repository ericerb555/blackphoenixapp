import React, { useMemo } from 'react';

interface RevenueChartProps {
  data: Array<{
    id?: string;
    month: string;
    revenue: number;
  }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartMetrics = useMemo(() => {
    if (!data.length) return null;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 800;
    const height = 300;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const minRevenue = Math.min(...data.map(d => d.revenue));
    const revenueRange = maxRevenue - minRevenue;
    const yScale = chartHeight / (maxRevenue * 1.1); // 10% padding at top

    // Create points for the line
    const points = data.map((item, index) => {
      const x = padding.left + (index * chartWidth) / (data.length - 1);
      const y = padding.top + chartHeight - (item.revenue * yScale);
      return { x, y, ...item };
    });

    // Create path for the line
    const linePath = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    // Create Y-axis labels
    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks }, (_, i) => {
      const value = (maxRevenue * 1.1) * (1 - i / (yTicks - 1));
      const y = padding.top + (i * chartHeight) / (yTicks - 1);
      return { value, y };
    });

    return { points, linePath, yLabels, padding, width, height, chartWidth, chartHeight };
  }, [data]);

  if (!chartMetrics) return null;

  const { points, linePath, yLabels, padding, width, height, chartWidth, chartHeight } = chartMetrics;

  return (
    <div className="w-full h-[300px] relative">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full"
        style={{ maxWidth: '100%' }}
      >
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={`grid-${i}-${label.value}`}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            stroke="#333"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#888"
          strokeWidth="1"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#888"
          strokeWidth="1"
        />

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={`ylabel-${i}-${label.value}`}
            x={padding.left - 10}
            y={label.y + 4}
            textAnchor="end"
            fill="#888"
            fontSize="12"
          >
            ${Math.round(label.value).toLocaleString()}
          </text>
        ))}

        {/* X-axis labels */}
        {points.map((point, i) => (
          <text
            key={`xlabel-${i}-${point.month}`}
            x={point.x}
            y={padding.top + chartHeight + 20}
            textAnchor="middle"
            fill="#888"
            fontSize="12"
          >
            {point.month}
          </text>
        ))}

        {/* Line path */}
        <path
          d={linePath}
          fill="none"
          stroke="#ea580c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <g key={`point-group-${i}-${point.month}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#ea580c"
              className="cursor-pointer"
            />
            <title>${point.revenue.toLocaleString()}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}