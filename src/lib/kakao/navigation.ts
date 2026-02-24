/**
 * Map navigation utilities.
 *
 * Kakao: /link/to/name,lat,lng (single destination)
 * Naver: nmap://route/car with v1~v5 waypoints (multi-stop, max 5)
 */

const NAVER_APP_NAME = "com.breadmap.app";

/** Open Kakao Map navigation to a single destination */
export function openKakaoNavi(name: string, lat: number, lng: number) {
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  window.open(url, "_blank");
}

/**
 * Open Naver Map with full multi-stop course route.
 * Uses nmap:// deep link (first stop = start, last = destination, middle = waypoints).
 * Supports up to 5 waypoints (v1~v5) — perfect for 2~7 stop courses.
 * Falls back to Naver Map web on desktop.
 */
export function openNaverNaviCourse(
  stops: { name: string; lat: number; lng: number }[]
) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    return openKakaoNavi(stops[0].name, stops[0].lat, stops[0].lng);
  }

  const first = stops[0];
  const last = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1); // middle stops as waypoints

  const params = new URLSearchParams({
    slat: String(first.lat),
    slng: String(first.lng),
    sname: first.name,
    dlat: String(last.lat),
    dlng: String(last.lng),
    dname: last.name,
    appname: NAVER_APP_NAME,
  });

  waypoints.slice(0, 5).forEach((wp, i) => {
    const n = i + 1;
    params.set(`v${n}lat`, String(wp.lat));
    params.set(`v${n}lng`, String(wp.lng));
    params.set(`v${n}name`, wp.name);
  });

  const appUrl = `nmap://route/car?${params.toString()}`;

  // nmap:// opens Naver Map app on mobile.
  // On desktop or if app is not installed, fall back to web.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = appUrl;
  } else {
    // Naver Map web — no official multi-waypoint web URL, open route search page
    const webUrl = `https://map.naver.com/p/directions/${first.lng},${first.lat},${encodeURIComponent(first.name)}/${last.lng},${last.lat},${encodeURIComponent(last.name)}/car`;
    window.open(webUrl, "_blank");
  }
}
