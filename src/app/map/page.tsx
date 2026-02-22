"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KakaoMap } from "@/components/map/KakaoMap";
import { BakeryMarker } from "@/components/map/BakeryMarker";
import { useGeolocation } from "@/hooks/useGeolocation";
import { searchNearbyBakeries, type KakaoPlace } from "@/lib/kakao/search";
import { Loader2 } from "lucide-react";

interface BakeryPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kakao_place_id?: string;
}

export default function MapPage() {
  const router = useRouter();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [map, setMap] = useState<any>(null);
  const [pins, setPins] = useState<BakeryPin[]>([]);
  const [nearbyPins, setNearbyPins] = useState<KakaoPlace[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<string>>(new Set());

  const handleMapReady = useCallback((m: any) => {
    setMap(m);
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: checkins } = await supabase
        .from("checkins")
        .select("bakery:bakeries(id, name, lat, lng, kakao_place_id)")
        .eq("user_id", user.id);

      const placeIdSet = new Set<string>();
      if (checkins) {
        const bakeryMap = new Map<string, BakeryPin>();
        for (const c of checkins) {
          const b = c.bakery as any;
          if (b && !bakeryMap.has(b.id)) {
            bakeryMap.set(b.id, b);
            if (b.kakao_place_id) placeIdSet.add(b.kakao_place_id);
          }
        }
        setPins(Array.from(bakeryMap.values()));
        setVisitedPlaceIds(placeIdSet);
      }
    };

    load();
  }, []);

  // 주변 빵집 검색
  useEffect(() => {
    if (geoLoading) return;
    const loadNearby = async () => {
      try {
        const nearby = await searchNearbyBakeries(lat, lng, 5000);
        setNearbyPins(nearby);
      } catch {
        // ignore
      }
    };
    loadNearby();
  }, [geoLoading, lat, lng]);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">나의 빵지도 🗺️</h1>
          {pins.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {pins.length}곳 정복!
            </span>
          )}
        </div>
      </header>

      {/* 전체 화면 지도 */}
      {geoLoading ? (
        <div className="flex h-[calc(100dvh-120px)] items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">위치 찾는 중...</p>
          </div>
        </div>
      ) : (
        <KakaoMap
          lat={lat}
          lng={lng}
          level={7}
          className="h-[calc(100dvh-120px)] w-full"
          onMapReady={handleMapReady}
        />
      )}

      {/* 방문 빵집 마커 */}
      {map &&
        pins.map((pin) => (
          <BakeryMarker
            key={pin.id}
            map={map}
            lat={pin.lat}
            lng={pin.lng}
            name={pin.name}
            visited
            onClick={() => router.push(`/bakery/${pin.id}`)}
          />
        ))}

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
              onClick={() => {
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

      {/* 빈 상태 오버레이 */}
      {pins.length === 0 && !geoLoading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
          <div className="pointer-events-auto rounded-2xl bg-card/95 px-5 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-center text-sm font-medium">
              체크인하면 여기에 핀이 찍혀요! 📍
            </p>
            <button
              onClick={() => router.push("/checkin")}
              className="mt-2 w-full rounded-xl bg-primary py-2 text-center text-sm font-bold text-white"
            >
              첫 체크인하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
