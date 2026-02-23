import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReviewFeedItem, CourseFeedItem, FeedItem } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const offset = Number(searchParams.get("offset") || "0");
    const limit = Number(searchParams.get("limit") || "10");

    const supabase = await createClient();

    let reviews: ReviewFeedItem[] = [];
    let courses: CourseFeedItem[] = [];

    if (type === "all" || type === "reviews") {
      const { data } = await supabase
        .from("checkins")
        .select(`
          id, user_id, visited_at, created_at,
          user:users(id, nickname, avatar_url),
          bakery:bakeries(id, name, address, avg_rating),
          breads(id, name, photo_url, rating, memo, checkin_id, created_at)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      reviews = (data || []).map((item: any) => ({
        type: "review" as const,
        id: item.id,
        user: item.user,
        bakery: item.bakery,
        breads: item.breads || [],
        visited_at: item.visited_at,
        created_at: item.created_at,
      }));
    }

    if (type === "all" || type === "courses") {
      const { data } = await supabase
        .from("courses")
        .select(`
          id, user_id, title, region, total_distance_m, created_at,
          user:users(id, nickname, avatar_url),
          stops:course_stops(stop_order, bakery:bakeries(id, name))
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      courses = (data || []).map((item: any) => ({
        type: "course" as const,
        id: item.id,
        user: item.user,
        title: item.title,
        region: item.region,
        total_distance_m: item.total_distance_m,
        stops: (item.stops || []).sort(
          (a: any, b: any) => a.stop_order - b.stop_order
        ),
        created_at: item.created_at,
      }));
    }

    let items: FeedItem[];
    let hasMore: boolean;

    if (type === "all") {
      // Merge and sort by created_at
      items = [...reviews, ...courses].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      // For "all", hasMore is true if either source returned full page
      hasMore = reviews.length === limit || courses.length === limit;
    } else if (type === "reviews") {
      items = reviews;
      hasMore = reviews.length === limit;
    } else {
      items = courses;
      hasMore = courses.length === limit;
    }

    return NextResponse.json({
      items,
      hasMore,
      nextOffset: offset + limit,
    });
  } catch (err) {
    console.error("Feed API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
