"use client";

import { useEffect, useRef, useCallback } from "react";

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

// Generate marker SVG as data URI (36x48)
function createMarkerSvg(
  visited: boolean,
  order?: number
): string {
  const pinColor = visited ? "#E8853D" : "#FFFFFF";
  const pinStroke = visited ? "none" : "#A8A29E";
  const pinStrokeWidth = visited ? 0 : 1.5;

  let innerContent: string;
  if (order != null) {
    // Course order marker: white circle with bold number
    innerContent = `
      <circle cx="18" cy="17" r="11" fill="white"/>
      <text x="18" y="22" text-anchor="middle" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" fill="#E8853D">${order}</text>
    `;
  } else if (visited) {
    // Visited marker: white circle with bread emoji
    innerContent = `
      <circle cx="18" cy="17" r="10" fill="white"/>
      <text x="18" y="22" text-anchor="middle" font-size="13">🍞</text>
    `;
  } else {
    // Unvisited marker: white circle with shop emoji
    innerContent = `
      <circle cx="18" cy="17" r="10" fill="#F5F0EB"/>
      <text x="18" y="22" text-anchor="middle" font-size="13">🏪</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
    <ellipse cx="18" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.15)"/>
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 27 18 27s18-13.5 18-27C36 8.06 27.94 0 18 0z" fill="${pinColor}" stroke="${pinStroke}" stroke-width="${pinStrokeWidth}"/>
    ${innerContent}
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Build InfoWindow HTML
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

  // Stable callback refs to avoid re-creating markers on every render
  const onClickRef = useRef(onClick);
  const onCheckinRef = useRef(onCheckin);
  useEffect(() => {
    onClickRef.current = onClick;
    onCheckinRef.current = onCheckin;
  }, [onClick, onCheckin]);

  useEffect(() => {
    if (!map || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(lat, lng);

    // Create marker image
    const markerImage = new window.kakao.maps.MarkerImage(
      createMarkerSvg(visited, order),
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

    // Name label (CustomOverlay below the marker)
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

    // InfoWindow (CustomOverlay on click)
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

      // Delegate click events
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
      // No info window — direct click handler
      window.kakao.maps.event.addListener(marker, "click", () => {
        onClickRef.current?.();
      });
    }

    return () => {
      marker.setMap(null);
      labelOverlay?.setMap(null);
      infoOverlay?.setMap(null);
    };
  }, [map, lat, lng, name, visited, order, rating, checkinCount, showLabel, showInfoWindow]);

  return null;
}

// Export SVG generator for use in BakeryCluster
export { createMarkerSvg };
