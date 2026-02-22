"use client";

interface MonthlyChartProps {
  data: { month: string; count: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const lastIndex = data.length - 1;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <h3 className="mb-4 font-bold">월별 체크인 📊</h3>
      <div className="flex items-end gap-1.5">
        {data.map((item, i) => {
          const heightPct = (item.count / maxCount) * 100;
          const isCurrentMonth = i === lastIndex;
          return (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
              <span className={`text-[10px] font-semibold ${isCurrentMonth ? "text-primary" : "text-primary/70"}`}>
                {item.count > 0 ? item.count : ""}
              </span>
              <div className="relative w-full overflow-hidden rounded-t-md bg-muted/50" style={{ height: "80px" }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-md transition-all duration-700 ease-out ${
                    isCurrentMonth
                      ? "bg-gradient-to-t from-primary to-primary/70"
                      : "bg-gradient-to-t from-primary/60 to-primary/30"
                  }`}
                  style={{
                    height: `${Math.max(heightPct, item.count > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
              <span className={`text-[10px] ${isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
