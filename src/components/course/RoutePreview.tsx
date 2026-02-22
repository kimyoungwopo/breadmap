"use client";

import { ArrowDown, Navigation } from "lucide-react";
import type { SelectedBakery } from "./BakerySelector";

interface RoutePreviewProps {
  stops: SelectedBakery[];
  totalDistance: number; // meters
}

export function RoutePreview({ stops, totalDistance }: RoutePreviewProps) {
  const formatDistance = (m: number) => {
    if (m < 1000) return `${m}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">최적 순서 🚶</h3>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Navigation className="h-3 w-3" />
          총 {formatDistance(totalDistance)}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-sm">
        {stops.map((stop, i) => (
          <div key={stop.id}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{stop.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {stop.address}
                </p>
              </div>
            </div>
            {i < stops.length - 1 && (
              <div className="ml-[15px] flex items-center gap-2 py-1.5">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-px bg-muted-foreground/30" />
                  <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                  <div className="h-3 w-px bg-muted-foreground/30" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
