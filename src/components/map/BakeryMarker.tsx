"use client";

import { useEffect, useRef } from "react";

interface BakeryMarkerProps {
  map: any;
  lat: number;
  lng: number;
  name: string;
  visited?: boolean;
  order?: number;
  rating?: number;
  checkinCount?: number;
  onClick?: () => void;
  onCheckin?: () => void;
  showLabel?: boolean;
  showInfoWindow?: boolean;
}

// ── Canvas-based marker image with Tossface emoji ──────────────────

const markerImageCache = new Map<string, string>();
let tossfaceLoaded = false;

async function loadTossface(): Promise<void> {
  if (tossfaceLoaded) return;
  try {
    await document.fonts.load('1em Tossface');
    tossfaceLoaded = true;
  } catch {
    // Font unavailable — falls back to system emoji
  }
}

function createMarkerImage(visited: boolean, order?: number): string {
  const key = `${visited}-${order ?? "n"}`;
  const cached = markerImageCache.get(key);
  if (cached) return cached;

  const dpr = window.devicePixelRatio || 2;
  const W = 36, H = 48;

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Shadow ellipse
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(18, 46, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pin shape
  ctx.fillStyle = visited ? "#E8853D" : "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(8.06, 0, 0, 8.06, 0, 18);
  ctx.bezierCurveTo(0, 31.5, 18, 45, 18, 45);
  ctx.bezierCurveTo(18, 45, 36, 31.5, 36, 18);
  ctx.bezierCurveTo(36, 8.06, 27.94, 0, 18, 0);
  ctx.closePath();
  ctx.fill();

  if (!visited) {
    ctx.strokeStyle = "#A8A29E";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Inner circle
  ctx.fillStyle = visited ? "#FFFFFF" : "#F5F0EB";
  ctx.beginPath();
  ctx.arc(18, 17, 10, 0, Math.PI * 2);
  ctx.fill();

  // Content
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (order != null) {
    ctx.fillStyle = "#E8853D";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(String(order), 18, 17);
  } else {
    ctx.font =
      '15px Tossface, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(visited ? "\u{1F35E}" : "\u{1F3EA}", 18, 17);
  }

  const url = canvas.toDataURL("image/png");
  markerImageCache.set(key, url);
  return url;
}

// ── InfoWindow HTML ────────────────────────────────────────────────

function createInfoWindowHtml(
  name: string,
  rating?: number,
  checkinCount?: number,
  visited?: boolean,
  hasOnClick?: boolean,
  hasOnCheckin?: boolean
): string {
  const ratingStr =
    rating && rating > 0 ? rating.toFixed(1) : null;

  return `<div class="marker-info-window">
    <button class="marker-info-close" data-action="close">&times;</button>
    <p class="marker-info-name">${name}</p>
    <div class="marker-info-meta">
      ${ratingStr ? `<span class="marker-info-rating"><span class="marker-info-star">&#9733;</span> ${ratingStr}</span>` : ""}
      ${checkinCount != null && checkinCount > 0 ? `<span class="marker-info-checkins">${checkinCount}회 체크인</span>` : ""}
    </div>
    <div class="marker-info-actions">
      ${hasOnClick ? `<button class="marker-info-btn marker-info-btn-detail" data-action="detail">자세히 보기</button>` : ""}
      ${!visited && hasOnCheckin ? `<button class="marker-info-btn marker-info-btn-checkin" data-action="checkin">체크인하기</button>` : ""}
    </div>
  </div>`;
}

// ── Component ──────────────────────────────────────────────────────

export function BakeryMarker({
  map,
  lat,
  lng,
  name,
  visited = false,
  order,
  rating,
  checkinCount,
  onClick,
  onCheckin,
  showLabel = true,
  showInfoWindow = false,
}: BakeryMarkerProps) {
  const markerRef = useRef<any>(null);
  const labelRef = useRef<any>(null);
  const infoRef = useRef<any>(null);

  // Stable callback refs
  const onClickRef = useRef(onClick);
  const onCheckinRef = useRef(onCheckin);
  useEffect(() => {
    onClickRef.current = onClick;
    onCheckinRef.current = onCheckin;
  }, [onClick, onCheckin]);

  useEffect(() => {
    if (!map || !window.kakao) return;

    let disposed = false;

    const setup = async () => {
      // Wait for Tossface font before rendering canvas
      await loadTossface();
      if (disposed) return;

      const position = new window.kakao.maps.LatLng(lat, lng);

      const markerImage = new window.kakao.maps.MarkerImage(
        createMarkerImage(visited, order),
        new window.kakao.maps.Size(36, 48),
        { offset: new window.kakao.maps.Point(18, 46) }
      );

      const marker = new window.kakao.maps.Marker({
        position,
        map,
        image: markerImage,
        title: name,
      });

      markerRef.current = marker;

      // Name label
      let labelOverlay: any = null;
      if (showLabel) {
        const labelContent = document.createElement("div");
        labelContent.className = "marker-label";
        labelContent.textContent = name;

        labelOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: labelContent,
          yAnchor: -0.3,
          clickable: false,
        });
        labelOverlay.setMap(map);
        labelRef.current = labelOverlay;
      }

      // InfoWindow
      let infoOverlay: any = null;
      if (showInfoWindow) {
        const infoContainer = document.createElement("div");
        infoContainer.innerHTML = createInfoWindowHtml(
          name,
          rating,
          checkinCount,
          visited,
          !!onClickRef.current,
          !!onCheckinRef.current
        );

        infoContainer.addEventListener("click", (e) => {
          const target = (e.target as HTMLElement).closest("[data-action]");
          if (!target) return;
          const action = (target as HTMLElement).dataset.action;
          if (action === "close") {
            infoOverlay?.setMap(null);
          } else if (action === "detail") {
            onClickRef.current?.();
          } else if (action === "checkin") {
            onCheckinRef.current?.();
          }
        });

        infoOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: infoContainer,
          yAnchor: 1.35,
          clickable: true,
        });
        infoRef.current = infoOverlay;

        window.kakao.maps.event.addListener(marker, "click", () => {
          infoOverlay.setMap(map);
        });
      } else if (onClickRef.current) {
        window.kakao.maps.event.addListener(marker, "click", () => {
          onClickRef.current?.();
        });
      }
    };

    setup();

    return () => {
      disposed = true;
      markerRef.current?.setMap(null);
      labelRef.current?.setMap(null);
      infoRef.current?.setMap(null);
    };
  }, [map, lat, lng, name, visited, order, rating, checkinCount, showLabel, showInfoWindow]);

  return null;
}

export { createMarkerImage, loadTossface };
