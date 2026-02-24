/**
 * Kakao Map navigation utilities.
 * Uses web URL scheme which opens Kakao Map app on mobile if installed.
 *
 * Kakao Link API formats:
 *   /link/to/name,lat,lng          — single destination navigation
 *   /link/map/n1,lat,lng/n2,lat,lng — multi-marker map view
 */

/** Open turn-by-turn navigation to a single destination */
export function openKakaoNavi(name: string, lat: number, lng: number) {
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  window.open(url, "_blank");
}

/** Open Kakao Map showing all course stops as numbered markers */
export function openKakaoNaviCourse(
  stops: { name: string; lat: number; lng: number }[]
) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    return openKakaoNavi(stops[0].name, stops[0].lat, stops[0].lng);
  }

  // Kakao Map multi-marker: /link/map/name1,lat1,lng1/name2,lat2,lng2/...
  const markers = stops
    .map(
      (s, i) =>
        `${encodeURIComponent(`${i + 1}. ${s.name}`)},${s.lat},${s.lng}`
    )
    .join("/");

  window.open(`https://map.kakao.com/link/map/${markers}`, "_blank");
}
