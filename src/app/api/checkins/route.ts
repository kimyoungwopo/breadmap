import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertBakery } from "@/lib/bakery-upsert";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bakery, breads, visited_at } = body;

    if (!bakery?.kakao_place_id || !bakery?.name) {
      return NextResponse.json(
        { error: "빵집 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 1. 빵집 upsert (kakao_place_id 기준)
    const { id: bakeryId, error: bakeryError } = await upsertBakery(supabase, {
      kakao_place_id: bakery.kakao_place_id,
      name: bakery.name,
      address: bakery.address,
      lat: bakery.lat,
      lng: bakery.lng,
      category: bakery.category,
    });

    if (bakeryError) {
      return NextResponse.json(
        { error: `빵집 등록 실패: ${bakeryError}` },
        { status: 500 }
      );
    }

    // 2. 체크인 생성
    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        bakery_id: bakeryId,
        visited_at: visited_at || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (checkinError || !checkin) {
      console.error("Checkin insert error:", checkinError);
      return NextResponse.json(
        { error: `체크인 실패: ${checkinError?.message || "알 수 없는 오류"}` },
        { status: 500 }
      );
    }

    // 3. 빵 기록 저장
    if (breads && breads.length > 0) {
      const breadRows = breads.map(
        (b: {
          name: string;
          rating: number;
          memo: string;
          photo_url: string | null;
        }) => ({
          checkin_id: checkin.id,
          name: b.name,
          rating: b.rating,
          memo: b.memo || null,
          photo_url: b.photo_url || null,
        })
      );

      const { error: breadError } = await supabase
        .from("breads")
        .insert(breadRows);

      if (breadError) {
        console.error("Bread insert error:", breadError);
      }
    }

    // 4. 사용자의 총 체크인 수
    const { count } = await supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      id: checkin.id,
      bakery_id: bakeryId,
      bakery_name: bakery.name,
      total_checkins: count || 1,
    });
  } catch (err) {
    console.error("Checkin API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("checkins")
    .select(`
      *,
      bakery:bakeries(*),
      breads(*)
    `)
    .eq("user_id", userId)
    .order("visited_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
