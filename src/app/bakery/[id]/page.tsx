"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KakaoMap } from "@/components/map/KakaoMap";
import { BakeryMarker } from "@/components/map/BakeryMarker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Loader2,
  Camera,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Bakery, Bread } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface CheckinWithBreads {
  id: string;
  user_id: string;
  visited_at: string;
  breads: Bread[];
}

interface BakeryDetail extends Bakery {
  checkins: CheckinWithBreads[];
}

export default function BakeryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bakery, setBakery] = useState<BakeryDetail | null>(null);
  const [map, setMap] = useState<any>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [myCheckins, setMyCheckins] = useState<string[]>([]);

  const handleMapReady = useCallback((m: any) => {
    setMap(m);
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      const res = await fetch(`/api/bakeries/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data: BakeryDetail = await res.json();
      setBakery(data);

      if (u) {
        setMyCheckins(
          data.checkins
            .filter((c) => c.user_id === u.id)
            .map((c) => c.id)
        );
      }

      setLoading(false);
    };

    load();
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const handleCheckin = () => {
    if (!bakery) return;
    const params = new URLSearchParams({
      name: bakery.name,
      address: bakery.address,
      lat: String(bakery.lat),
      lng: String(bakery.lng),
      kakao_place_id: bakery.kakao_place_id || "",
    });
    router.push(`/checkin?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <Skeleton className="h-[200px] w-full" />
        <div className="flex flex-col gap-5 p-4">
          <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
            <div className="flex justify-around border-t border-border pt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!bakery) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <EmptyState
          emoji="😢"
          title="빵집을 찾을 수 없어요"
          action={{
            label: "돌아가기",
            onClick: () => router.back(),
          }}
        />
      </div>
    );
  }

  const totalBreads = bakery.checkins.reduce(
    (sum, c) => sum + c.breads.length,
    0
  );
  const allBreads = bakery.checkins.flatMap((c) => c.breads);
  const hasVisited = myCheckins.length > 0;

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold">{bakery.name}</h1>
          {hasVisited && (
            <Badge variant="secondary" className="shrink-0 text-primary bg-primary/10">
              방문완료
            </Badge>
          )}
        </div>
      </header>

      {/* Mini Map */}
      <div className="relative">
        <KakaoMap
          lat={bakery.lat}
          lng={bakery.lng}
          level={3}
          className="h-[200px] w-full"
          onMapReady={handleMapReady}
        />
        <div className="map-gradient-overlay pointer-events-none absolute bottom-0 left-0 right-0 h-6" />
      </div>
      {map && (
        <BakeryMarker
          map={map}
          lat={bakery.lat}
          lng={bakery.lng}
          name={bakery.name}
          visited={hasVisited}
        />
      )}

      <div className="flex flex-col gap-5 p-4 page-enter">
        {/* Info Card */}
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="text-xl font-bold">{bakery.name}</h2>
          <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{bakery.address}</span>
          </div>
          {bakery.category && (
            <Badge variant="secondary" className="mt-2">
              {bakery.category}
            </Badge>
          )}

          {/* Stats Row */}
          <div className="mt-4 flex justify-around border-t border-border pt-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold">
                  {bakery.avg_rating > 0 ? bakery.avg_rating.toFixed(1) : "-"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">평균 별점</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{bakery.checkin_count}</span>
              <p className="text-[11px] text-muted-foreground">체크인</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{totalBreads}</span>
              <p className="text-[11px] text-muted-foreground">기록된 빵</p>
            </div>
          </div>
        </div>

        {/* Top Breads */}
        {allBreads.length > 0 && (
          <div>
            <SectionHeading title="기록된 빵 🍞" className="mb-3" />
            <div className="flex flex-col gap-2">
              {allBreads.slice(0, 10).map((bread) => (
                <div
                  key={bread.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {bread.photo_url ? (
                    <img
                      src={bread.photo_url}
                      alt={bread.name}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {bread.name}
                    </p>
                    {bread.memo && (
                      <p className="truncate text-xs text-muted-foreground">
                        {bread.memo}
                      </p>
                    )}
                  </div>
                  {bread.rating > 0 && (
                    <div className="flex items-center gap-0.5 rounded-lg bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {bread.rating}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkin History */}
        {bakery.checkins.length > 0 && (
          <div>
            <SectionHeading title="체크인 기록 📋" className="mb-3" />
            <div className="flex flex-col gap-2">
              {bakery.checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="rounded-2xl bg-card p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(checkin.visited_at)}
                    </span>
                    {checkin.user_id === user?.id && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        나
                      </span>
                    )}
                  </div>
                  {checkin.breads.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {checkin.breads.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs"
                        >
                          {b.name}
                          {b.rating > 0 && (
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating CTA */}
      {user && (
        <div className="fixed inset-x-0 bottom-16 z-30 p-4">
          <Button
            onClick={handleCheckin}
            size="cta"
            className="w-full"
          >
            {hasVisited ? "다시 체크인하기! 🍞" : "여기도 체크인! 🍞"}
          </Button>
        </div>
      )}
    </div>
  );
}
