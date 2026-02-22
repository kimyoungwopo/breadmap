"use client";

import { useState, useCallback } from "react";
import { Search, X, MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchBakeries, type KakaoPlace } from "@/lib/kakao/search";
import { useGeolocation } from "@/hooks/useGeolocation";

interface SelectedBakery {
  id: string; // kakao_place_id
  name: string;
  address: string;
  lat: number;
  lng: number;
  bakery_id?: string; // DB bakery id (if exists)
}

interface BakerySelectorProps {
  selected: SelectedBakery[];
  onAdd: (bakery: SelectedBakery) => void;
  onRemove: (id: string) => void;
  maxCount?: number;
}

export type { SelectedBakery };

export function BakerySelector({
  selected,
  onAdd,
  onRemove,
  maxCount = 5,
}: BakerySelectorProps) {
  const { lat, lng } = useGeolocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const selectedIds = new Set(selected.map((b) => b.id));

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const places = await searchBakeries(query, { lat, lng, radius: 20000 });
      setResults(places);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, lat, lng]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSelect = (place: KakaoPlace) => {
    if (selectedIds.has(place.id)) return;
    onAdd({
      id: place.id,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat: Number(place.y),
      lng: Number(place.x),
    });
    if (selected.length + 1 >= maxCount) {
      setShowSearch(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Selected List */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-2">
          {selected.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.address}
                </p>
              </div>
              <button
                onClick={() => onRemove(b.id)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {selected.length < maxCount && !showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/30 py-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          빵집 추가 ({selected.length}/{maxCount})
        </button>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="빵집 이름으로 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-10 rounded-xl pl-9"
                autoFocus
              />
            </div>
            <button
              onClick={() => {
                setShowSearch(false);
                setQuery("");
                setResults([]);
              }}
              className="rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              닫기
            </button>
          </div>

          {/* Results */}
          {searching && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              검색 중...
            </p>
          )}
          {results.length > 0 && (
            <div className="mt-2 flex max-h-[240px] flex-col gap-1 overflow-y-auto">
              {results.map((place) => {
                const isSelected = selectedIds.has(place.id);
                return (
                  <button
                    key={place.id}
                    disabled={isSelected}
                    onClick={() => handleSelect(place)}
                    className="flex items-center gap-2.5 rounded-xl p-2.5 text-left hover:bg-secondary disabled:opacity-40 transition-colors"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {place.place_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {place.road_address_name || place.address_name}
                        {place.distance && ` · ${(Number(place.distance) / 1000).toFixed(1)}km`}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-primary font-semibold">
                        추가됨
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
