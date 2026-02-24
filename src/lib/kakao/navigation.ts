/**
 * Kakao Map navigation utilities.
 * Uses web URL scheme which opens Kakao Map app on mobile if installed.
 */

/** Open turn-by-turn navigation to a single destination */
export function openKakaoNavi(name: string, lat: number, lng: number) {
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  window.open(url, "_blank");
}

/** Open Kakao Map showing a specific location */
export function openKakaoMap(name: string, lat: number, lng: number) {
  const url = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
  window.open(url, "_blank");
}
