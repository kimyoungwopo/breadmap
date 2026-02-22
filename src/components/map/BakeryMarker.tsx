"use client";

import { useEffect, useRef } from "react";

interface BakeryMarkerProps {
  map: any;
  lat: number;
  lng: number;
  name: string;
  visited?: boolean;
  order?: number;
  onClick?: () => void;
}

export function BakeryMarker({
  map,
  lat,
  lng,
  name,
  visited = false,
  order,
  onClick,
}: BakeryMarkerProps) {
  const markerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(lat, lng);

    // 마커 이미지
    const innerContent = order
      ? `<circle cx="16" cy="15" r="10" fill="white"/><text x="16" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="${visited ? '#E8853D' : '#78716C'}">${order}</text>`
      : `<circle cx="16" cy="15" r="8" fill="white"/><text x="16" y="19" text-anchor="middle" font-size="12">${visited ? '🍞' : '🏪'}</text>`;

    const markerImage = new window.kakao.maps.MarkerImage(
      `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${visited ? '#E8853D' : '#78716C'}"/>
          ${innerContent}
        </svg>`
      )}`,
      new window.kakao.maps.Size(32, 40),
      { offset: new window.kakao.maps.Point(16, 40) }
    );

    const marker = new window.kakao.maps.Marker({
      position,
      map,
      image: markerImage,
      title: name,
    });

    if (onClick) {
      window.kakao.maps.event.addListener(marker, "click", onClick);
    }

    markerRef.current = marker;

    return () => {
      marker.setMap(null);
      if (overlayRef.current) overlayRef.current.setMap(null);
    };
  }, [map, lat, lng, name, visited, order, onClick]);

  return null;
}
