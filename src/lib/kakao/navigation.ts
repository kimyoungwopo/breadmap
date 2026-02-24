/**
 * Map navigation utilities.
 *
 * Kakao: /link/to/name,lat,lng (single destination)
 * Naver: https://map.naver.com/p/directions/ web URL (multi-stop)
 *   — works as Universal Link (opens app if installed, web otherwise)
 */

/** Open Kakao Map navigation to a single destination */
export function openKakaoNavi(name: string, lat: number, lng: number) {
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  window.open(url, "_blank");
}

/**
 * Open Naver Map with full multi-stop course route.
 * Uses web URL which acts as Universal Link — opens app if installed,
 * falls back to web gracefully (no Safari "invalid address" error).
 * Path format: /directions/{lng},{lat},{name}/{lng},{lat},{name}/.../walk
 */
export function openNaverNaviCourse(
  stops: { name: string; lat: number; lng: number }[]
) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    return openKakaoNavi(stops[0].name, stops[0].lat, stops[0].lng);
  }

  // Build path segments: each stop is {lng},{lat},{encodedName}
  const segments = stops.map(
    (s) => `${s.lng},${s.lat},${encodeURIComponent(s.name)}`
  );

  const webUrl = `https://map.naver.com/p/directions/${segments.join("/")}/walk`;
  window.open(webUrl, "_blank");
}
