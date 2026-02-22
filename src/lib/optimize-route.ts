import type { Place, OptimizedRoute } from "@/types";

/**
 * Haversine 공식으로 두 좌표 간 직선거리 계산 (미터)
 */
function haversine(a: Place, b: Place): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * 배열의 모든 순열 생성
 * 5개 이하 → 최대 120가지 → 브루트포스로 충분
 */
function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permute(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * 경유지 최적 순서 계산 (TSP 브루트포스)
 * - 5곳 이하: 모든 순열 탐색 (최대 120가지, <10ms)
 * - 직선거리 기반으로 순서 결정 후 카카오 API로 실제 경로 조회
 */
export function optimizeOrder(places: Place[]): OptimizedRoute {
  if (places.length <= 1) {
    return { order: places, totalDistance: 0 };
  }

  const perms = permute(places);
  let bestOrder = places;
  let bestDist = Infinity;

  for (const perm of perms) {
    let dist = 0;
    for (let i = 0; i < perm.length - 1; i++) {
      dist += haversine(perm[i], perm[i + 1]);
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestOrder = perm;
    }
  }

  return { order: bestOrder, totalDistance: Math.round(bestDist) };
}
