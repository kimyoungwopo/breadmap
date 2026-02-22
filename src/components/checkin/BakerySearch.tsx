"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchBakeries, type KakaoPlace } from "@/lib/kakao/search";
import { useGeolocation } from "@/hooks/useGeolocation";

interface BakerySearchProps {
  onSelect: (place: KakaoPlace) => void;
}

export function BakerySearch({ onSelect }: BakerySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const { lat, lng } = useGeolocation();

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const places = await searchBakeries(q, { lat, lng });
        setResults(places);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [lat, lng]
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="flex flex-col gap-3">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="빵집 이름으로 검색! 🔍"
          className="h-12 rounded-2xl pl-10 text-[15px]"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* 결과 */}
      <div className="flex flex-col gap-1.5">
        {results.map((place) => (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className="flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all hover:bg-muted active:scale-[0.98]"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm">
              🏪
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{place.place_name}</span>
              <span className="text-xs text-muted-foreground">
                {place.road_address_name || place.address_name}
              </span>
              {place.distance && (
                <span className="text-xs font-medium text-primary">
                  {Number(place.distance) >= 1000
                    ? `${(Number(place.distance) / 1000).toFixed(1)}km`
                    : `${place.distance}m`}
                  {Number(place.distance) < 500 && " 근처에요!"}
                </span>
              )}
            </div>
          </button>
        ))}

        {query && !loading && results.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="text-3xl">🤔</div>
            <p className="text-sm text-muted-foreground">
              검색 결과가 없어요
            </p>
            <p className="text-xs text-muted-foreground">
              다른 키워드로 다시 찾아보세요
            </p>
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="text-3xl">🍰</div>
            <p className="text-sm text-muted-foreground">
              오늘 다녀온 빵집을 검색해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
