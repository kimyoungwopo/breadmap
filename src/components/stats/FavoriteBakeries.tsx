"use client";

interface FavoriteBakery {
  name: string;
  visitCount: number;
}

interface FavoriteBakeriesProps {
  bakeries: FavoriteBakery[];
}

export function FavoriteBakeries({ bakeries }: FavoriteBakeriesProps) {
  if (bakeries.length === 0) return null;

  const maxCount = Math.max(...bakeries.map((b) => b.visitCount), 1);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <h3 className="mb-3 font-bold">자주 가는 빵집 🏠</h3>
      <div className="flex flex-col gap-3">
        {bakeries.slice(0, 5).map((bakery) => {
          const pct = (bakery.visitCount / maxCount) * 100;
          return (
            <div key={bakery.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{bakery.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {bakery.visitCount}회
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
