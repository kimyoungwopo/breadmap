"use client";

import { useCallback, useState, useEffect } from "react";
import { KakaoMap } from "@/components/map/KakaoMap";
import { BakeryMarker } from "@/components/map/BakeryMarker";
import type { SelectedBakery } from "./BakerySelector";

interface CourseMapProps {
  stops: SelectedBakery[];
  className?: string;
}

export function CourseMap({ stops, className = "h-[300px] w-full" }: CourseMapProps) {
  const [map, setMap] = useState<any>(null);

  const center =
    stops.length > 0
      ? {
          lat: stops.reduce((s, b) => s + b.lat, 0) / stops.length,
          lng: stops.reduce((s, b) => s + b.lng, 0) / stops.length,
        }
      : { lat: 37.5665, lng: 126.978 };

  const handleMapReady = useCallback((m: any) => {
    setMap(m);
  }, []);

  // 폴리라인 그리기
  useEffect(() => {
    if (!map || !window.kakao || stops.length < 2) return;

    const path = stops.map(
      (s) => new window.kakao.maps.LatLng(s.lat, s.lng)
    );

    const polyline = new window.kakao.maps.Polyline({
      map,
      path,
      strokeWeight: 3,
      strokeColor: "#E8853D",
      strokeOpacity: 0.8,
      strokeStyle: "solid",
    });

    // 전체 경로가 보이도록 bounds 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    for (const s of stops) {
      bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng));
    }
    map.setBounds(bounds, 50, 50, 50, 50);

    return () => {
      polyline.setMap(null);
    };
  }, [map, stops]);

  return (
    <div className="overflow-hidden rounded-2xl">
      <KakaoMap
        lat={center.lat}
        lng={center.lng}
        level={7}
        className={className}
        onMapReady={handleMapReady}
      />
      {map &&
        stops.map((stop, i) => (
          <BakeryMarker
            key={stop.id}
            map={map}
            lat={stop.lat}
            lng={stop.lng}
            name={stop.name}
            visited
            order={i + 1}
            showLabel
            showInfoWindow={false}
          />
        ))}
    </div>
  );
}
