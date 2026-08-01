import React from 'react';

interface ProductBarChartProps {
  title: string;
  subtitle?: string;
  items: Array<{ name: string; value: number; detail?: string }>;
  valueLabel: (value: number) => string;
  barClassName?: string;
  emptyMessage?: string;
}

export const ProductBarChart: React.FC<ProductBarChartProps> = ({
  title,
  subtitle,
  items,
  valueLabel,
  barClassName = 'bg-brand-500',
  emptyMessage = 'Sin datos en el período seleccionado',
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="card p-5 space-y-4 h-full">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-600">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3 text-xs">
                <span className="text-slate-300 line-clamp-2 min-w-0 flex-1" title={item.name}>
                  {index + 1}. {item.name}
                </span>
                <span className="text-white font-semibold tabular-nums flex-shrink-0">
                  {valueLabel(item.value)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
                  style={{ width: `${Math.max(6, (item.value / maxValue) * 100)}%` }}
                />
              </div>
              {item.detail && <p className="text-[10px] text-slate-500">{item.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
