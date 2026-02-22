"use client";

interface MonthlyChartProps {
  data: { month: string; count: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <h3 className="mb-4 font-bold">월별 체크인 📊</h3>
      <div className="flex items-end gap-1.5">
        {data.map((item) => {
          const heightPct = (item.count / maxCount) * 100;
          return (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-primary">
                {item.count > 0 ? item.count : ""}
              </span>
              <div className="w-full rounded-t-md bg-muted" style={{ height: "80px" }}>
                <div
                  className="w-full rounded-t-md bg-primary/80 transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPct, item.count > 0 ? 8 : 0)}%`,
                    marginTop: `${100 - Math.max(heightPct, item.count > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
