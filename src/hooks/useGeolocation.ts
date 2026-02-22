"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
}

const DEFAULT_POSITION = { lat: 37.5665, lng: 126.978 }; // 서울 시청

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    ...DEFAULT_POSITION,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "위치 서비스를 지원하지 않는 브라우저입니다.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error.code === 1
              ? "위치 권한을 허용해주세요."
              : "위치를 가져올 수 없습니다.",
        }));
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  return state;
}
