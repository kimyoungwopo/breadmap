export interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  category_name: string;
  phone: string;
  place_url: string;
  distance?: string;
}

interface SearchResult {
  documents: KakaoPlace[];
  meta: {
    total_count: number;
    is_end: boolean;
  };
}

/**
 * 카카오 로컬 API로 빵집/베이커리 검색
 */
export async function searchBakeries(
  query: string,
  options?: { lat?: number; lng?: number; radius?: number }
): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({
    query: query || "베이커리",
    category_group_code: "FD6", // 음식점
    size: "15",
  });

  if (options?.lat && options?.lng) {
    params.set("y", String(options.lat));
    params.set("x", String(options.lng));
    params.set("radius", String(options.radius || 5000));
    params.set("sort", "distance");
  }

  const res = await fetch(
    `/api/kakao/search?${params.toString()}`
  );

  if (!res.ok) throw new Error("검색에 실패했습니다.");

  const data: SearchResult = await res.json();
  return data.documents;
}

/**
 * 주변 빵집/카페 검색 (키워드 없이 카테고리 기반)
 */
export async function searchNearbyBakeries(
  lat: number,
  lng: number,
  radius: number = 3000
): Promise<KakaoPlace[]> {
  const queries = ["베이커리", "빵집", "제과"];
  const results: KakaoPlace[] = [];
  const seenIds = new Set<string>();

  for (const q of queries) {
    const places = await searchBakeries(q, { lat, lng, radius });
    for (const place of places) {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id);
        results.push(place);
      }
    }
  }

  return results.sort(
    (a, b) => Number(a.distance || 0) - Number(b.distance || 0)
  );
}
