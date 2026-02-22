"use client";

import { MapPin, Navigation, Trash2 } from "lucide-react";

interface CourseStop {
  stop_order: number;
  bakery: {
    id: string;
    name: string;
    address: string;
  };
}

interface CourseCardProps {
  id: string;
  title: string;
  region: string | null;
  totalDistanceM: number | null;
  stops: CourseStop[];
  onDelete: (id: string) => void;
}

export function CourseCard({
  id,
  title,
  region,
  totalDistanceM,
  stops,
  onDelete,
}: CourseCardProps) {
  const formatDistance = (m: number) => {
    if (m < 1000) return `${m}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {region && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {region}
              </span>
            )}
            {totalDistanceM && (
              <span className="flex items-center gap-0.5">
                <Navigation className="h-3 w-3" />
                {formatDistance(totalDistanceM)}
              </span>
            )}
            <span>{stops.length}곳</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(id)}
          className="rounded-lg p-1.5 hover:bg-muted"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">
        {stops.map((stop, i) => (
          <div key={stop.stop_order} className="flex items-center gap-1.5">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="whitespace-nowrap text-xs font-medium">
                {stop.bakery.name}
              </span>
            </div>
            {i < stops.length - 1 && (
              <span className="text-xs text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
