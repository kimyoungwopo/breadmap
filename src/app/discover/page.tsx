"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReviewCard } from "@/components/discover/ReviewCard";
import { CourseFeedCard } from "@/components/discover/CourseFeedCard";
import { BakeryExploreTab } from "@/components/discover/BakeryExploreTab";
import { useCourseClone } from "@/hooks/useCourseClone";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type TabType = "all" | "reviews" | "courses" | "bakeries";

const SUB_TABS: { value: TabType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "reviews", label: "후기" },
  { value: "courses", label: "코스" },
  { value: "bakeries", label: "빵집" },
];

const LIMIT = 10;

export default function DiscoverPage() {
  const [tab, setTab] = useState<TabType>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { cloneCourse, isCloning } = useCourseClone();

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
  }, []);

  const fetchFeed = useCallback(
    async (feedTab: TabType, feedOffset: number, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(
          `/api/feed?type=${feedTab}&offset=${feedOffset}&limit=${LIMIT}`
        );
        if (res.ok) {
          const data = await res.json();
          setItems((prev) => (append ? [...prev, ...data.items] : data.items));
          setHasMore(data.hasMore);
          setOffset(data.nextOffset);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial fetch & tab change (skip for bakeries tab)
  useEffect(() => {
    if (tab === "bakeries") return;
    setItems([]);
    fetchFeed(tab, 0);
  }, [tab, fetchFeed]);

  const handleLoadMore = () => {
    fetchFeed(tab, offset, true);
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">빵지순례 탐색</h1>
        </div>

        {/* Sub tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {SUB_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      {tab === "bakeries" ? (
        <div className="p-4 page-enter">
          <BakeryExploreTab />
        </div>
      ) : (
      <div className="flex flex-col gap-3 p-4 page-enter">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="아직 올라온 글이 없어요"
            description="첫 번째 빵집 후기를 남겨보세요!"
          />
        ) : (
          <>
            {items.map((item) =>
              item.type === "review" ? (
                <ReviewCard key={`review-${item.id}`} item={item} />
              ) : (
                <CourseFeedCard
                  key={`course-${item.id}`}
                  item={item}
                  showClone={!!user && user.id !== item.user.id}
                  isCloning={isCloning}
                  onClone={cloneCourse}
                />
              )
            )}

            {/* Load more */}
            {hasMore && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                더 보기
              </Button>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}
