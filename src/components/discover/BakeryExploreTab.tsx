"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { searchBakeries, type KakaoPlace } from "@/lib/kakao/search";
import { openKakaoNavi } from "@/lib/kakao/navigation";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Star, MapPin, Navigation, Search, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type SortBy = "distance" | "checkins" | "rating";

interface DbBakeryInfo {
  kakao_place_id: string;
  avg_rating: number;
  checkin_count: number;
}

interface BakeryResult {
  id: string; // kakao_place_id
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number; // meters
  category: string;
  // DB enrichment (null if not in our DB)
  avgRating: number;
  checkinCount: number;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "distance", label: "거리순" },
  { value: "checkins", label: "체크인순" },
  { value: "rating", label: "별점순" },
];

export function BakeryExploreTab() {
  const router = useRouter();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [bakeries, setBakeries] = useState<BakeryResult[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load user + visited bakeries
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const { data } = await supabase
          .from("checkins")
          .select("bakery:bakeries(kakao_place_id)")
          .eq("user_id", u.id);

        const ids = new Set<string>();
        for (const c of data || []) {
          const b = c.bakery as any;
          if (b?.kakao_place_id) ids.add(b.kakao_place_id);
        }
        setVisitedPlaceIds(ids);
      }
    };
    load();
  }, []);

  // Search and enrich bakeries
  const search = useCallback(
    async (keyword: string) => {
      setLoading(true);
      try {
        const searchOpts =
          !keyword && !geoLoading ? { lat, lng, radius: 5000 } : undefined;
        const searchQuery = keyword || "베이커리";

        const places = await searchBakeries(searchQuery, searchOpts);

        // Enrich with our DB data
        const placeIds = places.map((p) => p.id);
        let dbMap = new Map<string, DbBakeryInfo>();

        if (placeIds.length > 0) {
          const supabase = createClient();
          const { data: dbBakeries } = await supabase
            .from("bakeries")
            .select("kakao_place_id, avg_rating, checkin_count")
            .in("kakao_place_id", placeIds);

          for (const b of dbBakeries || []) {
            if (b.kakao_place_id) {
              dbMap.set(b.kakao_place_id, b as DbBakeryInfo);
            }
          }
        }

        const results: BakeryResult[] = places.map((p) => {
          const dbInfo = dbMap.get(p.id);
          return {
            id: p.id,
            name: p.place_name,
            address: p.road_address_name || p.address_name,
            lat: Number(p.y),
            lng: Number(p.x),
            distance: Number(p.distance || 0),
            category: p.category_name,
            avgRating: dbInfo?.avg_rating ?? 0,
            checkinCount: dbInfo?.checkin_count ?? 0,
          };
        });

        setBakeries(results);
      } catch {
        // keep existing results
      } finally {
        setLoading(false);
      }
    },
    [lat, lng, geoLoading]
  );

  // Initial search (nearby)
  useEffect(() => {
    if (!geoLoading) search("");
  }, [geoLoading, search]);

  // Debounced keyword search
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(value);
    }, 400);
  };

  // Sort and filter
  const filtered = useMemo(() => {
    let list = [...bakeries];

    if (unvisitedOnly) {
      list = list.filter((b) => !visitedPlaceIds.has(b.id));
    }

    list.sort((a, b) => {
      if (sortBy === "distance") return a.distance - b.distance;
      if (sortBy === "checkins") return b.checkinCount - a.checkinCount;
      return b.avgRating - a.avgRating;
    });

    return list;
  }, [bakeries, sortBy, unvisitedOnly, visitedPlaceIds]);

  const handleCheckin = (b: BakeryResult) => {
    const params = new URLSearchParams({
      name: b.name,
      address: b.address,
      lat: String(b.lat),
      lng: String(b.lng),
      kakao_place_id: b.id,
    });
    router.push(`/checkin?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="지역이나 빵집 이름으로 검색"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="h-11 rounded-xl pl-10"
        />
      </div>

      {/* Sort + Filter */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              sortBy === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setUnvisitedOnly(!unvisitedOnly)}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            unvisitedOnly
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {unvisitedOnly ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          안 가본 곳
        </button>
      </div>

      {/* Results */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm"
          >
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없어요"
          description={
            unvisitedOnly
              ? "필터를 해제하면 더 많은 빵집을 볼 수 있어요"
              : "다른 키워드로 검색해보세요"
          }
        />
      ) : (
        filtered.map((b, i) => {
          const visited = visitedPlaceIds.has(b.id);
          return (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm animate-count-up"
              style={{
                animationDelay: `${i * 30}ms`,
                animationFillMode: "both",
              }}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg",
                  visited ? "bg-primary/10" : "bg-secondary"
                )}
              >
                {visited ? "✅" : "🍞"}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  {b.avgRating > 0 && (
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-yellow-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {b.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{b.address}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {b.distance > 0 && (
                    <span>
                      {b.distance < 1000
                        ? `${b.distance}m`
                        : `${(b.distance / 1000).toFixed(1)}km`}
                    </span>
                  )}
                  {b.checkinCount > 0 && <span>{b.checkinCount}회 체크인</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => openKakaoNavi(b.name, b.lat, b.lng)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground active:scale-95 transition-transform"
                  title="길찾기"
                >
                  <Navigation className="h-4 w-4" />
                </button>
                {user && !visited && (
                  <button
                    onClick={() => handleCheckin(b)}
                    className="flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground active:scale-95 transition-transform"
                  >
                    체크인
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
