"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KakaoMap } from "@/components/map/KakaoMap";
import { BakeryMarker } from "@/components/map/BakeryMarker";
import { BakeryCluster, type BakeryPin } from "@/components/map/BakeryCluster";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Plus, ChevronRight, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { searchNearbyBakeries, type KakaoPlace } from "@/lib/kakao/search";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface HomeBakeryPin extends BakeryPin {
  kakao_place_id?: string;
}

interface RecentCheckin {
  id: string;
  visited_at: string;
  bakery_id: string;
  bakery: { name: string; address: string };
  breads: { name: string; rating: number }[];
}

export default function HomePage() {
  const router = useRouter();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [map, setMap] = useState<any>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [stats, setStats] = useState({ bakeries: 0, breads: 0, courses: 0 });
  const [pins, setPins] = useState<HomeBakeryPin[]>([]);
  const [nearbyPins, setNearbyPins] = useState<KakaoPlace[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<RecentCheckin[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (!u) {
        setLoading(false);
        return;
      }

      // 체크인한 빵집들 (마커용 + 통계)
      const { data: checkins } = await supabase
        .from("checkins")
        .select("bakery:bakeries(id, name, lat, lng, kakao_place_id, avg_rating, checkin_count)")
        .eq("user_id", u.id);

      const placeIdSet = new Set<string>();
      if (checkins) {
        const bakeryMap = new Map<string, HomeBakeryPin>();
        for (const c of checkins) {
          const b = c.bakery as any;
          if (b && !bakeryMap.has(b.id)) {
            bakeryMap.set(b.id, {
              ...b,
              rating: b.avg_rating,
              checkinCount: b.checkin_count,
            });
            if (b.kakao_place_id) placeIdSet.add(b.kakao_place_id);
          }
        }
        setPins(Array.from(bakeryMap.values()));
        setVisitedPlaceIds(placeIdSet);
        setStats((prev) => ({ ...prev, bakeries: bakeryMap.size }));
      }

      // 빵 수
      const { count: breadCount } = await supabase
        .from("breads")
        .select("*, checkin:checkins!inner(user_id)", {
          count: "exact",
          head: true,
        })
        .eq("checkin.user_id", u.id);

      setStats((prev) => ({ ...prev, breads: breadCount || 0 }));

      // 코스 수
      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id);

      setStats((prev) => ({ ...prev, courses: courseCount || 0 }));

      // 최근 체크인 3개
      const { data: recentData } = await supabase
        .from("checkins")
        .select(
          `id, visited_at, bakery_id, bakery:bakeries(name, address), breads(name, rating)`
        )
        .eq("user_id", u.id)
        .order("visited_at", { ascending: false })
        .limit(3);

      if (recentData) {
        setRecents(recentData as unknown as RecentCheckin[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  // 주변 빵집 검색 (위치 확보 후)
  useEffect(() => {
    if (geoLoading || !user) return;
    const loadNearby = async () => {
      try {
        const nearby = await searchNearbyBakeries(lat, lng, 3000);
        setNearbyPins(nearby);
      } catch {
        // 검색 실패 시 무시
      }
    };
    loadNearby();
  }, [geoLoading, lat, lng, user]);

  const nickname =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "빵순이";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍞</span>
            <h1 className="text-lg font-bold text-primary">빵지순례</h1>
          </div>
          {user && (
            <span className="text-xs text-muted-foreground">
              {nickname}님의 빵지도
            </span>
          )}
        </div>
      </header>

      {/* Map */}
      {geoLoading ? (
        <div className="flex h-[45vh] items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">위치 찾는 중...</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <KakaoMap
            lat={lat}
            lng={lng}
            level={5}
            className="h-[45vh] w-full"
            onMapReady={handleMapReady}
          />
          <div className="map-gradient-overlay pointer-events-none absolute bottom-0 left-0 right-0 h-8" />
        </div>
      )}

      {/* 방문 빵집 — 클러스터 */}
      {map && pins.length > 0 && (
        <BakeryCluster
          map={map}
          pins={pins}
          onPinClick={(pin) => router.push(`/bakery/${pin.id}`)}
        />
      )}

      {/* 주변 미방문 빵집 마커 */}
      {map &&
        nearbyPins
          .filter((p) => !visitedPlaceIds.has(p.id))
          .map((pin) => (
            <BakeryMarker
              key={`nearby-${pin.id}`}
              map={map}
              lat={Number(pin.y)}
              lng={Number(pin.x)}
              name={pin.place_name}
              showInfoWindow
              onCheckin={() => {
                const params = new URLSearchParams({
                  name: pin.place_name,
                  address: pin.road_address_name || pin.address_name,
                  lat: pin.y,
                  lng: pin.x,
                  kakao_place_id: pin.id,
                });
                router.push(`/checkin?${params.toString()}`);
              }}
            />
          ))}

      <div className="flex flex-col gap-5 p-4 page-enter">
        {/* 로딩 스켈레톤 */}
        {loading && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-sm">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 비로그인 시 */}
        {!loading && !user && (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-orange-500 p-5 text-white">
            <p className="text-xl font-bold">빵 좋아하세요? 🍞</p>
            <p className="mt-1 text-sm opacity-85">
              전국 빵집 도장깨기, 지금 시작해봐요!
            </p>
            <Button
              onClick={() => router.push("/login")}
              variant="secondary"
              size="sm"
              className="mt-3 rounded-xl font-semibold"
            >
              3초만에 시작하기 ✨
            </Button>
          </div>
        )}

        {/* Stats */}
        {user && (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-orange-50 p-3 shadow-sm animate-count-up" style={{ animationDelay: "0ms" }}>
              <span className="text-xl">📍</span>
              <p className="text-2xl font-bold">{stats.bakeries}</p>
              <p className="text-[11px] text-muted-foreground">정복 빵집</p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-50 p-3 shadow-sm animate-count-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
              <span className="text-xl">🥐</span>
              <p className="text-2xl font-bold">{stats.breads}</p>
              <p className="text-[11px] text-muted-foreground">먹은 빵</p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-50 p-3 shadow-sm animate-count-up" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
              <span className="text-xl">🗺️</span>
              <p className="text-2xl font-bold">{stats.courses}</p>
              <p className="text-[11px] text-muted-foreground">순례 코스</p>
            </div>
          </div>
        )}

        {/* Quick checkin CTA */}
        {user && (
          <Button
            onClick={() => router.push("/checkin")}
            size="cta"
            className="w-full"
          >
            <Plus className="h-5 w-5" />
            오늘의 빵집 체크인하기!
          </Button>
        )}

        {/* Recent checkins */}
        {recents.length > 0 && (
          <div>
            <SectionHeading
              title="최근 먹은 빵 🍰"
              className="mb-3"
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => router.push("/profile")}
                  className="text-xs font-medium text-primary"
                >
                  더보기
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <div className="flex flex-col gap-2">
              {recents.map((checkin, i) => (
                <div
                  key={checkin.id}
                  onClick={() => router.push(`/bakery/${checkin.bakery_id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-3 shadow-sm active:scale-[0.98] transition-all hover:shadow-md animate-count-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
                    🍞
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {checkin.bakery?.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(checkin.visited_at)}
                      </span>
                      {checkin.breads?.length > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {checkin.breads.map((b) => b.name).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {checkin.breads?.[0]?.rating > 0 && (
                    <div className="flex items-center gap-0.5 rounded-lg bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {checkin.breads[0].rating}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {user && recents.length === 0 && !loading && (
          <EmptyState
            emoji="🥖"
            title="아직 빵집 기록이 없어요!"
            description={"가까운 빵집에 가서\n첫 체크인을 찍어보세요 ✌️"}
            action={{
              label: "첫 체크인하러 가기",
              onClick: () => router.push("/checkin"),
            }}
          />
        )}
      </div>
    </div>
  );
}
