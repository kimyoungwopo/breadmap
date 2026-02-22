"use client";

import { Star } from "lucide-react";

interface TopBread {
  name: string;
  rating: number;
  bakeryName: string;
}

interface TopBreadsProps {
  breads: TopBread[];
}

const medals = ["🥇", "🥈", "🥉"];
const bgColors = ["bg-yellow-50", "bg-gray-50", "bg-orange-50"];

export function TopBreads({ breads }: TopBreadsProps) {
  if (breads.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <h3 className="mb-3 font-bold">최고의 빵 TOP 3</h3>
      <div className="flex flex-col gap-2">
        {breads.slice(0, 3).map((bread, i) => (
          <div
            key={`${bread.name}-${bread.bakeryName}`}
            className={`flex items-center gap-3 rounded-xl p-2.5 ${bgColors[i] || ""}`}
          >
            <span className="text-xl">{medals[i]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{bread.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {bread.bakeryName}
              </p>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-yellow-600">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {bread.rating}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
