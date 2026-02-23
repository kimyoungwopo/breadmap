"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KakaoMap } from "@/components/map/KakaoMap";
import { BakeryMarker } from "@/components/map/BakeryMarker";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCourseClone } from "@/hooks/useCourseClone";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Star,
  ArrowDown,
  Loader2,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { FeedUser } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface StopBakery {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  avg_rating: number;
  checkin_count: number;
  category: string | null;
}

interface CourseStop {
  id: string;
  stop_order: number;
  distance_to_next_m: number | null;
  bakery: StopBakery;
}

interface CourseDetail {
  id: string;
  user_id: string;
  title: string;
  region: string | null;
  total_distance_m: number | null;
  total_duration_s: number | null;
  created_at: string;
  user?: FeedUser;
  stops: CourseStop[];
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const { cloneCourse, isCloning } = useCourseClone();

  const handleMapReady = useCallback((m: any) => {
    setMap(m);
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      setAuthUser(u);

      const res = await fetch(`/api/courses/${id}`);
      if (res.ok) {
        setCourse(await res.json());
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // 폴리라인 그리기
  useEffect(() => {
    if (!map || !window.kakao || !course || course.stops.length < 2) return;

    const path = course.stops.map(
      (s) => new window.kakao.maps.LatLng(s.bakery.lat, s.bakery.lng)
    );

    const polyline = new window.kakao.maps.Polyline({
      map,
      path,
      strokeWeight: 4,
      strokeColor: "#E8853D",
      strokeOpacity: 0.8,
      strokeStyle: "solid",
    });

    // 전체 경로가 보이도록 bounds 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    for (const s of course.stops) {
      bounds.extend(
        new window.kakao.maps.LatLng(s.bakery.lat, s.bakery.lng)
      );
    }
    map.setBounds(bounds, 50, 50, 50, 50);

    return () => {
      polyline.setMap(null);
    };
  }, [map, course]);

  const handleDelete = async () => {
    if (!course) return;
    const res = await fetch(`/api/courses?id=${course.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("코스가 삭제되었어요");
      router.push("/course");
    }
  };

  const formatDistance = (m: number) => {
    if (m < 1000) return `${m}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/course")} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <Skeleton className="h-[280px] w-full" />
        <div className="flex flex-col gap-5 p-4">
          <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <EmptyState
          emoji="😢"
          title="코스를 찾을 수 없어요"
          action={{
            label: "돌아가기",
            onClick: () => router.push("/course"),
          }}
        />
      </div>
    );
  }

  const center =
    course.stops.length > 0
      ? {
          lat:
            course.stops.reduce((s, st) => s + st.bakery.lat, 0) /
            course.stops.length,
          lng:
            course.stops.reduce((s, st) => s + st.bakery.lng, 0) /
            course.stops.length,
        }
      : { lat: 37.5665, lng: 126.978 };

  return (
    <div className="flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/course")}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 truncate text-lg font-bold">
            {course.title}
          </h1>
          {authUser?.id === course.user_id ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : authUser ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={isCloning}
              onClick={() => cloneCourse(course.id)}
            >
              {isCloning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          ) : null}
        </div>
      </header>

      {/* Map */}
      <div className="relative">
        <KakaoMap
          lat={center.lat}
          lng={center.lng}
          level={7}
          className="h-[280px] w-full"
          onMapReady={handleMapReady}
        />
        <div className="map-gradient-overlay pointer-events-none absolute bottom-0 left-0 right-0 h-6" />
      </div>
      {map &&
        course.stops.map((stop, i) => (
          <BakeryMarker
            key={stop.id}
            map={map}
            lat={stop.bakery.lat}
            lng={stop.bakery.lng}
            name={stop.bakery.name}
            visited
            order={i + 1}
            rating={stop.bakery.avg_rating}
            checkinCount={stop.bakery.checkin_count}
            showInfoWindow
            onClick={() => router.push(`/bakery/${stop.bakery.id}`)}
          />
        ))}

      <div className="flex flex-col gap-5 p-4 page-enter">
        {/* Course Info Card */}
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          {course.user && (
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar size="sm">
                {course.user.avatar_url && (
                  <AvatarImage src={course.user.avatar_url} alt={course.user.nickname} />
                )}
                <AvatarFallback>{course.user.nickname.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{course.user.nickname}</span>
              {authUser?.id === course.user_id && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  나
                </span>
              )}
            </div>
          )}
          <h2 className="text-xl font-bold">{course.title}</h2>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            {course.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {course.region}
              </span>
            )}
            {course.total_distance_m && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" />
                {formatDistance(course.total_distance_m)}
              </span>
            )}
            <span>{course.stops.length}곳</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(course.created_at)} 생성
          </p>
        </div>

        {/* Stops */}
        <div>
          <SectionHeading title="순례 코스 🚶" className="mb-3" />
          <div className="flex flex-col">
            {course.stops.map((stop, i) => (
              <div key={stop.id}>
                <button
                  onClick={() => router.push(`/bakery/${stop.bakery.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted active:scale-[0.98] transition-transform"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {stop.bakery.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {stop.bakery.address}
                    </p>
                    {stop.bakery.category && (
                      <span className="mt-0.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                        {stop.bakery.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {stop.bakery.avg_rating > 0 && (
                      <div className="flex items-center gap-0.5 text-xs font-semibold text-yellow-600">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {stop.bakery.avg_rating.toFixed(1)}
                      </div>
                    )}
                    {stop.bakery.checkin_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {stop.bakery.checkin_count}회 체크인
                      </span>
                    )}
                  </div>
                </button>

                {/* Connector */}
                {i < course.stops.length - 1 && (
                  <div className="ml-[27px] flex items-center gap-2 py-0.5">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-px bg-primary/30" />
                      <ArrowDown className="h-3 w-3 text-primary/40" />
                      <div className="h-2 w-px bg-primary/30" />
                    </div>
                    {stop.distance_to_next_m && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistance(stop.distance_to_next_m)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
