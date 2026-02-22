"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  lat: number;
  lng: number;
  level?: number;
  className?: string;
  onMapReady?: (map: any) => void;
  children?: React.ReactNode;
}

let sdkLoaded = false;

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.kakao?.maps) {
      resolve();
      return;
    }

    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) {
      reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다."));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services,clusterer`;
    script.onload = () => {
      window.kakao.maps.load(() => {
        sdkLoaded = true;
        resolve();
      });
    };
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

export function KakaoMap({
  lat,
  lng,
  level = 5,
  className = "",
  onMapReady,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKakaoSDK()
      .then(() => setReady(true))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const options = {
      center: new window.kakao.maps.LatLng(lat, lng),
      level,
    };
    const map = new window.kakao.maps.Map(containerRef.current, options);
    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      mapRef.current = null;
    };
  }, [ready, lat, lng, level, onMapReady]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted ${className}`}>
        <span className="text-3xl">🗺️</span>
        <p className="text-sm font-medium text-muted-foreground">
          지도를 불러올 수 없어요
        </p>
        <p className="text-xs text-muted-foreground/70">
          카카오맵 설정을 확인해주세요
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
