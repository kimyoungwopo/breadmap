"use client";

import { useRouter } from "next/navigation";
import { Star, MapPin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ReviewFeedItem } from "@/types";

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

export function ReviewCard({ item }: { item: ReviewFeedItem }) {
  const router = useRouter();
  const photoBbreads = item.breads.filter((b) => b.photo_url);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
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

      {/* Photo scroll */}
      {photoBbreads.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photoBbreads.map((bread) => (
            <img
              key={bread.id}
              src={bread.photo_url!}
              alt={bread.name}
              className="h-28 w-28 shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Bakery info */}
      <button
        onClick={() => router.push(`/bakery/${item.bakery.id}`)}
        className="mt-3 flex items-center gap-2 text-left"
      >
        <span className="text-base">🍞</span>
        <span className="font-bold">{item.bakery.name}</span>
        {item.bakery.avg_rating > 0 && (
          <div className="flex items-center gap-0.5 text-xs font-semibold text-yellow-600">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {item.bakery.avg_rating.toFixed(1)}
          </div>
        )}
      </button>

      {item.bakery.address && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{item.bakery.address}</span>
        </div>
      )}

      {/* Bread ratings */}
      {item.breads.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.breads.map((bread) => (
            <span
              key={bread.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
            >
              {bread.name}
              {bread.rating > 0 && (
                <span className="flex items-center gap-0.5 text-yellow-600">
                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  {bread.rating}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
