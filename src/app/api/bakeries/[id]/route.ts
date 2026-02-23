import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 빵집 정보
    const { data: bakery, error } = await supabase
      .from("bakeries")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !bakery) {
      return NextResponse.json(
        { error: "빵집을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 빵집의 체크인 목록 (최근 20개, 빵 정보 포함)
    const { data: checkins } = await supabase
      .from("checkins")
      .select(`
        id,
        user_id,
        visited_at,
        user:users(id, nickname, avatar_url),
        breads(id, name, photo_url, rating, memo)
      `)
      .eq("bakery_id", id)
      .order("visited_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      ...bakery,
      checkins: checkins || [],
    });
  } catch (err) {
    console.error("Bakery detail API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
