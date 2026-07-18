import { ReactNode, useEffect, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  children: ReactNode;
  height?: number;
  minHeight?: number;
  width?: number | string;
  className?: string;
  dependencies?: any[];
}

export function ChartContainer({ 
  children, 
  height = 300, 
  minHeight, 
  width = '100%',
  className = '',
  dependencies = []
}: ChartContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, dependencies);

  if (!mounted) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: minHeight || height, minHeight: minHeight || height }}
      >
        <div className="text-gray-500 text-sm">Loading chart...</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer 
      width={width} 
      height={height}
      minHeight={minHeight || height}
      className={className}
    >
      {children}
    </ResponsiveContainer>
  );
}
