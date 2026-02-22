"use client";

import { useEffect, useRef } from "react";
import { createMarkerImage, loadTossface } from "./BakeryMarker";

export interface BakeryPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  checkinCount?: number;
}

interface BakeryClusterProps {
  map: any;
  pins: BakeryPin[];
  onPinClick?: (pin: BakeryPin) => void;
  onPinCheckin?: (pin: BakeryPin) => void;
}

function createClusterInfoHtml(pin: BakeryPin): string {
  const ratingStr =
    pin.rating && pin.rating > 0 ? pin.rating.toFixed(1) : null;

  return `<div class="marker-info-window">
    <button class="marker-info-close" data-action="close">&times;</button>
    <p class="marker-info-name">${pin.name}</p>
    <div class="marker-info-meta">
      ${ratingStr ? `<span class="marker-info-rating"><span class="marker-info-star">&#9733;</span> ${ratingStr}</span>` : ""}
      ${pin.checkinCount != null && pin.checkinCount > 0 ? `<span class="marker-info-checkins">${pin.checkinCount}회 체크인</span>` : ""}
    </div>
    <div class="marker-info-actions">
      <button class="marker-info-btn marker-info-btn-detail" data-action="detail">자세히 보기</button>
    </div>
  </div>`;
}

export function BakeryCluster({
  map,
  pins,
  onPinClick,
}: BakeryClusterProps) {
  const clustererRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const labelsRef = useRef<any[]>([]);
  const onPinClickRef = useRef(onPinClick);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    if (!map || !window.kakao || pins.length === 0) return;

    let disposed = false;

    // Clean up previous
    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    for (const o of overlaysRef.current) o.setMap(null);
    for (const l of labelsRef.current) l.setMap(null);
    overlaysRef.current = [];
    labelsRef.current = [];

    const setup = async () => {
      await loadTossface();
      if (disposed) return;

      const clusterStyles = [
        {
          content: '<div class="cluster-marker cluster-marker-sm"></div>',
          width: 40,
          height: 40,
        },
        {
          content: '<div class="cluster-marker cluster-marker-md"></div>',
          width: 50,
          height: 50,
        },
        {
          content: '<div class="cluster-marker cluster-marker-lg"></div>',
          width: 60,
          height: 60,
        },
      ];

      const imageUrl = createMarkerImage(true);

      const markers = pins.map((pin) => {
        const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);

        const markerImage = new window.kakao.maps.MarkerImage(
          imageUrl,
          new window.kakao.maps.Size(36, 48),
          { offset: new window.kakao.maps.Point(18, 46) }
        );

        const marker = new window.kakao.maps.Marker({
          position,
          image: markerImage,
          title: pin.name,
        });

        // Name label
        const labelEl = document.createElement("div");
        labelEl.className = "marker-label";
        labelEl.textContent = pin.name;

        const labelOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: labelEl,
          yAnchor: -0.3,
          clickable: false,
        });
        labelOverlay.setMap(map);
        labelsRef.current.push(labelOverlay);

        // InfoWindow
        const infoContainer = document.createElement("div");
        infoContainer.innerHTML = createClusterInfoHtml(pin);

        const infoOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: infoContainer,
          yAnchor: 1.35,
          clickable: true,
        });
        overlaysRef.current.push(infoOverlay);

        infoContainer.addEventListener("click", (e) => {
          const target = (e.target as HTMLElement).closest("[data-action]");
          if (!target) return;
          const action = (target as HTMLElement).dataset.action;
          if (action === "close") {
            infoOverlay.setMap(null);
          } else if (action === "detail") {
            onPinClickRef.current?.(pin);
          }
        });

        window.kakao.maps.event.addListener(marker, "click", () => {
          for (const o of overlaysRef.current) o.setMap(null);
          infoOverlay.setMap(map);
        });

        return marker;
      });

      const clusterer = new window.kakao.maps.MarkerClusterer({
        map,
        markers,
        gridSize: 60,
        minLevel: 4,
        disableClickZoom: false,
        styles: clusterStyles,
        calculator: [9, 29, Infinity],
      });

      clustererRef.current = clusterer;
    };

    setup();

    return () => {
      disposed = true;
      clustererRef.current?.clear();
      for (const o of overlaysRef.current) o.setMap(null);
      for (const l of labelsRef.current) l.setMap(null);
      overlaysRef.current = [];
      labelsRef.current = [];
    };
  }, [map, pins]);

  return null;
}
