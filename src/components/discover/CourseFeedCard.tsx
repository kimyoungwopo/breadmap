"use client";

import { useRouter } from "next/navigation";
import { MapPin, Navigation, Loader2, Download } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CourseFeedItem } from "@/types";

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

function formatDistance(m: number) {
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

interface CourseFeedCardProps {
  item: CourseFeedItem;
  showClone?: boolean;
  isCloning?: boolean;
  onClone?: (courseId: string) => void;
}

export function CourseFeedCard({
  item,
  showClone,
  isCloning,
  onClone,
}: CourseFeedCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/course/${item.id}`)}
      className="cursor-pointer rounded-2xl bg-card p-4 shadow-sm active:scale-[0.98] transition-transform"
    >
      {/* User info */}
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          {item.user.avatar_url && (
            <AvatarImage src={item.user.avatar_url} alt={item.user.nickname} />
          )}
          <AvatarFallback>
            {item.user.nickname.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold">{item.user.nickname}</span>
        <span className="text-xs text-muted-foreground">
          {timeAgo(item.created_at)}
        </span>
      </div>

      {/* Course title & meta */}
      <h3 className="mt-2.5 font-bold">{item.title}</h3>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {item.region && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {item.region}
          </span>
        )}
        {item.total_distance_m && (
          <span className="flex items-center gap-0.5">
            <Navigation className="h-3 w-3" />
            {formatDistance(item.total_distance_m)}
          </span>
        )}
        <span>{item.stops.length}곳</span>
      </div>

      {/* Stop pills */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">
        {item.stops.map((stop, i) => (
          <div key={stop.stop_order} className="flex items-center gap-1.5">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="whitespace-nowrap text-xs font-medium">
                {stop.bakery.name}
              </span>
            </div>
            {i < item.stops.length - 1 && (
              <span className="text-xs text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Clone button */}
      {showClone && onClone && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full rounded-xl"
          disabled={isCloning}
          onClick={(e) => {
            e.stopPropagation();
            onClone(item.id);
          }}
        >
          {isCloning ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          내 코스로 담기
        </Button>
      )}
    </div>
  );
}
