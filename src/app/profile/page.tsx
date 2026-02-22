"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LogOut, Star, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { MonthlyChart } from "@/components/stats/MonthlyChart";
import { TopBreads } from "@/components/stats/TopBreads";
import { FavoriteBakeries } from "@/components/stats/FavoriteBakeries";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface CheckinItem {
  id: string;
  visited_at: string;
  bakery_id: string;
  bakery: { name: string; address: string };
  breads: { name: string; rating: number }[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bakeries: 0, breads: 0, courses: 0 });
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [topBreads, setTopBreads] = useState<{ name: string; rating: number; bakeryName: string }[]>([]);
  const [favBakeries, setFavBakeries] = useState<{ name: string; visitCount: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      const { data: checkinData } = await supabase
        .from("checkins")
        .select("bakery_id")
        .eq("user_id", u.id);

      const uniqueBakeries = new Set(checkinData?.map((c) => c.bakery_id));

      const { count: breadCount } = await supabase
        .from("breads")
        .select("*, checkin:checkins!inner(user_id)", {
          count: "exact",
          head: true,
        })
        .eq("checkin.user_id", u.id);

      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id);

      setStats({
        bakeries: uniqueBakeries.size,
        breads: breadCount || 0,
        courses: courseCount || 0,
      });

      const { data: list } = await supabase
        .from("checkins")
        .select(
          `id, visited_at, bakery_id, bakery:bakeries(name, address), breads(name, rating)`
        )
        .eq("user_id", u.id)
        .order("visited_at", { ascending: false })
        .limit(20);

      if (list) {
        const typed = list as unknown as CheckinItem[];
        setCheckins(typed);

        // 월별 체크인 통계 (최근 6개월)
        const now = new Date();
        const months: { month: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getMonth() + 1}월`;
          const count = typed.filter((c) => {
            const cd = new Date(c.visited_at);
            return (
              cd.getFullYear() === d.getFullYear() &&
              cd.getMonth() === d.getMonth()
            );
          }).length;
          months.push({ month: key, count });
        }
        setMonthlyData(months);

        // 최고의 빵 (높은 별점 순)
        const allBreads: { name: string; rating: number; bakeryName: string }[] = [];
        for (const c of typed) {
          for (const b of c.breads || []) {
            if (b.rating > 0) {
              allBreads.push({
                name: b.name,
                rating: b.rating,
                bakeryName: c.bakery?.name || "",
              });
            }
          }
        }
        allBreads.sort((a, b) => b.rating - a.rating);
        setTopBreads(allBreads.slice(0, 3));

        // 자주 가는 빵집
        const bakeryVisits = new Map<string, { name: string; count: number }>();
        for (const c of typed) {
          if (c.bakery?.name) {
            const existing = bakeryVisits.get(c.bakery.name);
            if (existing) {
              existing.count++;
            } else {
              bakeryVisits.set(c.bakery.name, { name: c.bakery.name, count: 1 });
            }
          }
        }
        const sorted = Array.from(bakeryVisits.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((b) => ({ name: b.name, visitCount: b.count }));
        setFavBakeries(sorted);
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const getBadge = () => {
    if (stats.bakeries >= 50) return { emoji: "👑", title: "빵집 마스터" };
    if (stats.bakeries >= 20) return { emoji: "🏆", title: "빵 매니아" };
    if (stats.bakeries >= 10) return { emoji: "🔥", title: "빵 탐험가" };
    if (stats.bakeries >= 3) return { emoji: "🌱", title: "빵 새싹" };
    return { emoji: "🐣", title: "빵린이" };
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center px-4 py-3">
            <h1 className="text-lg font-bold">마이</h1>
          </div>
        </header>
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-sm">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="mt-2 flex w-full justify-around">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center px-4 py-3">
            <h1 className="text-lg font-bold">마이</h1>
          </div>
        </header>
        <div className="flex flex-col items-center gap-4 px-6 py-20">
          <div className="text-5xl">🍞</div>
          <p className="font-bold">로그인하고 빵 기록 시작해요!</p>
          <p className="text-center text-sm text-muted-foreground">
            카카오 계정으로 바로 시작할 수 있어요
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="mt-2 rounded-xl"
          >
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  const nickname =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "빵순이";
  const avatarUrl = user.user_metadata?.avatar_url;
  const badge = getBadge();

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">마이</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1 text-xs text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-5 p-4 page-enter">
        {/* Profile card */}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-sm">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={nickname} />
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              {nickname[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-xl font-bold">{nickname}</p>
            <Badge variant="secondary" className="mt-1 px-3 py-1 text-xs font-semibold">
              {badge.emoji} {badge.title}
            </Badge>
          </div>

          {/* Inline stats */}
          <div className="mt-2 flex w-full justify-around">
            <div className="flex flex-col items-center">
              <p className="text-xl font-bold">{stats.bakeries}</p>
              <p className="text-[11px] text-muted-foreground">정복 빵집</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <p className="text-xl font-bold">{stats.breads}</p>
              <p className="text-[11px] text-muted-foreground">먹은 빵</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <p className="text-xl font-bold">{stats.courses}</p>
              <p className="text-[11px] text-muted-foreground">코스</p>
            </div>
          </div>
        </div>

        {/* 통계 섹션 */}
        {checkins.length > 0 && (
          <div className="flex flex-col gap-4">
            <SectionHeading title="나의 빵 통계 📊" />
            <MonthlyChart data={monthlyData} />
            <TopBreads breads={topBreads} />
            <FavoriteBakeries bakeries={favBakeries} />
          </div>
        )}

        {checkins.length > 0 && <Separator />}

        {/* 체크인 기록 */}
        <div>
          <SectionHeading title="체크인 기록 📋" className="mb-3" />
          {checkins.length > 0 ? (
            <div className="flex flex-col gap-2">
              {checkins.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/bakery/${c.bakery_id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-3 shadow-sm active:scale-[0.98] transition-all hover:shadow-md animate-count-up"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
                    🍞
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {c.bakery?.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.visited_at)}
                      </span>
                      {c.breads?.length > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {c.breads.map((b) => b.name).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {c.breads?.[0]?.rating > 0 && (
                    <div className="flex items-center gap-0.5 rounded-lg bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {c.breads[0].rating}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="🥖"
              title="아직 기록이 없어요!"
              action={{
                label: "첫 체크인하러 가기",
                onClick: () => router.push("/checkin"),
              }}
            />
          )}
        </div>

        <Separator />

        {/* Settings */}
        <div className="pb-4">
          <div className="flex flex-col">
            <button className="flex items-center justify-between rounded-xl px-2 py-3.5 text-left text-sm hover:bg-muted active:bg-muted">
              서비스 소개
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="flex items-center justify-between rounded-xl px-2 py-3.5 text-left text-sm hover:bg-muted active:bg-muted">
              문의하기
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between px-2 py-3.5 text-sm">
              <span>버전</span>
              <span className="text-muted-foreground">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
