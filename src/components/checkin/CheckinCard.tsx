"use client";

import { Star, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckinCardProps {
  bakeryName: string;
  address: string;
  breads: { name: string; rating: number; photo_url: string | null }[];
  totalCheckins: number;
  onShare: () => void;
  onClose: () => void;
}

export function CheckinCard({
  bakeryName,
  address,
  breads,
  totalCheckins,
  onShare,
  onClose,
}: CheckinCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* 헤더 - 축하 */}
        <div className="bg-gradient-to-br from-primary to-orange-500 p-6 text-center text-white">
          <p className="text-5xl animate-celebrate">🎉</p>
          <h2 className="mt-2 text-xl font-bold">체크인 성공!</h2>
          <p className="mt-1 text-sm opacity-90">
            {totalCheckins}번째 빵집 정복 완료! 🔥
          </p>
        </div>

        <div className="p-5">
          {/* 빵집 정보 */}
          <div className="mb-4 flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm">
              📍
            </div>
            <div>
              <p className="font-bold">{bakeryName}</p>
              <p className="text-xs text-muted-foreground">{address}</p>
            </div>
          </div>

          {/* 먹은 빵들 */}
          <div className="mb-5 flex flex-col gap-2">
            {breads.map((bread, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-muted p-3"
              >
                {bread.photo_url && (
                  <img
                    src={bread.photo_url}
                    alt={bread.name}
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{bread.name}</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= bread.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2.5">
            <Button
              onClick={onShare}
              variant="outline"
              className="flex-1 rounded-2xl py-3 h-auto"
            >
              <Share2 className="h-4 w-4" />
              자랑하기
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 rounded-2xl py-3 h-auto font-bold"
            >
              좋아요! 👍
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
