"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BakerySelector, type SelectedBakery } from "@/components/course/BakerySelector";
import { RoutePreview } from "@/components/course/RoutePreview";
import { CourseMap } from "@/components/course/CourseMap";
import { CourseCard } from "@/components/course/CourseCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { optimizeOrder } from "@/lib/optimize-route";
import { upsertBakery } from "@/lib/bakery-upsert";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Step = "list" | "select" | "preview" | "map";

interface SavedCourse {
  id: string;
  title: string;
  region: string | null;
  total_distance_m: number | null;
  stops: {
    stop_order: number;
    bakery: { id: string; name: string; address: string };
  }[];
}

export default function CoursePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [step, setStep] = useState<Step>("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<SavedCourse[]>([]);

  // 코스 빌더 state
  const [selected, setSelected] = useState<SelectedBakery[]>([]);
  const [optimized, setOptimized] = useState<SelectedBakery[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const res = await fetch(`/api/courses?user_id=${u.id}`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleAdd = (bakery: SelectedBakery) => {
    setSelected((prev) => [...prev, bakery]);
  };

  const handleRemove = (id: string) => {
    setSelected((prev) => prev.filter((b) => b.id !== id));
  };

  const handleOptimize = () => {
    if (selected.length < 2) {
      toast.error("최소 2곳을 선택해주세요!");
      return;
    }

    const places = selected.map((b) => ({
      id: b.id,
      name: b.name,
      lat: b.lat,
      lng: b.lng,
    }));

    const result = optimizeOrder(places);
    const orderedBakeries = result.order.map((p) => {
      const orig = selected.find((b) => b.id === p.id)!;
      return orig;
    });

    setOptimized(orderedBakeries);
    setTotalDistance(result.totalDistance);
    setStep("preview");
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error("코스 이름을 입력해주세요!");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // 각 빵집을 DB에 upsert
      const bakeryIds: string[] = [];
      for (const stop of optimized) {
        if (stop.bakery_id) {
          bakeryIds.push(stop.bakery_id);
        } else {
          const result = await upsertBakery(supabase, {
            kakao_place_id: stop.id,
            name: stop.name,
            address: stop.address,
            lat: stop.lat,
            lng: stop.lng,
          });
          if (result.error) throw new Error(result.error);
          bakeryIds.push(result.id);
        }
      }

      const stops = bakeryIds.map((bakeryId, i) => ({
        bakery_id: bakeryId,
        stop_order: i + 1,
      }));

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          total_distance_m: totalDistance,
          stops,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success("코스가 저장되었어요! 🎉");

      // Reset & reload
      setStep("list");
      setSelected([]);
      setOptimized([]);
      setTitle("");

      const listRes = await fetch(`/api/courses?user_id=${user.id}`);
      if (listRes.ok) {
        setCourses(await listRes.json());
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "코스 저장에 실패했어요"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    const res = await fetch(`/api/courses?id=${courseId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      toast.success("코스가 삭제되었어요");
    }
  };

  const goBack = () => {
    if (step === "select") {
      setStep("list");
      setSelected([]);
    } else if (step === "preview") {
      setStep("select");
    } else if (step === "map") {
      setStep("preview");
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center px-4 py-3">
            <h1 className="text-lg font-bold">빵지순례 코스</h1>
          </div>
        </header>
        <div className="flex flex-col items-center gap-4 px-6 py-20">
          <div className="text-5xl">🗺️</div>
          <p className="font-bold">로그인하고 순례 코스를 만들어보세요!</p>
          <Button onClick={() => router.push("/login")} className="rounded-xl">
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {step !== "list" && (
            <button
              onClick={goBack}
              className="rounded-xl p-1.5 hover:bg-muted active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-bold">
            {step === "list" && "빵지순례 코스"}
            {step === "select" && "빵집 고르기 🔍"}
            {step === "preview" && "최적 순서 확인"}
            {step === "map" && "코스 지도"}
          </h1>
        </div>
      </header>

      <div className="flex flex-col gap-5 p-4">
        {/* Step: List */}
        {step === "list" && (
          <>
            <button
              onClick={() => setStep("select")}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              새 코스 만들기
            </button>

            {courses.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="font-bold">내 코스 📋</h2>
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    region={course.region}
                    totalDistanceM={course.total_distance_m}
                    stops={course.stops}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="text-5xl">🗺️</div>
                <p className="font-bold">아직 코스가 없어요!</p>
                <p className="text-center text-sm text-muted-foreground">
                  가고 싶은 빵집들을 골라서
                  <br />
                  최단거리 코스를 만들어보세요
                </p>
              </div>
            )}
          </>
        )}

        {/* Step: Select bakeries */}
        {step === "select" && (
          <>
            <p className="text-sm text-muted-foreground">
              빵집을 2~5곳 선택하면 최적 순서를 계산해드려요!
            </p>
            <BakerySelector
              selected={selected}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
            {selected.length >= 2 && (
              <Button
                onClick={handleOptimize}
                className="h-12 rounded-2xl text-base font-bold"
              >
                최적 경로 계산하기 🚀
              </Button>
            )}
          </>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <>
            <RoutePreview stops={optimized} totalDistance={totalDistance} />
            <Button
              onClick={() => setStep("map")}
              variant="outline"
              className="rounded-2xl"
            >
              지도에서 보기 🗺️
            </Button>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold">코스 이름</label>
              <input
                type="text"
                placeholder="예: 성수동 빵집 투어"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 rounded-2xl bg-secondary px-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="h-12 rounded-2xl text-base font-bold"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "코스 저장하기 ✨"
              )}
            </Button>
          </>
        )}

        {/* Step: Map */}
        {step === "map" && (
          <>
            <CourseMap stops={optimized} className="h-[400px] w-full" />
            <RoutePreview stops={optimized} totalDistance={totalDistance} />
          </>
        )}
      </div>
    </div>
  );
}
