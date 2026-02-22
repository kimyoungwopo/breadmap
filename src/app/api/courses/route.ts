import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { title, region, stops, total_distance_m } = body;

    if (!title || !stops || stops.length < 2) {
      return NextResponse.json(
        { error: "코스에는 최소 2곳의 빵집이 필요합니다." },
        { status: 400 }
      );
    }

    // 코스 생성
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        title,
        region: region || null,
        total_distance_m: total_distance_m || null,
      })
      .select("id")
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: `코스 생성 실패: ${courseError?.message}` },
        { status: 500 }
      );
    }

    // 경유지 저장
    const stopRows = stops.map(
      (
        stop: {
          bakery_id: string;
          stop_order: number;
          distance_to_next_m?: number;
        },
        _i: number
      ) => ({
        course_id: course.id,
        bakery_id: stop.bakery_id,
        stop_order: stop.stop_order,
        distance_to_next_m: stop.distance_to_next_m || null,
      })
    );

    const { error: stopError } = await supabase
      .from("course_stops")
      .insert(stopRows);

    if (stopError) {
      console.error("Course stop insert error:", stopError);
    }

    return NextResponse.json({
      id: course.id,
      title,
      stop_count: stops.length,
    });
  } catch (err) {
    console.error("Course API error:", err);
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
    return NextResponse.json(
      { error: "user_id가 필요합니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("courses")
    .select(`
      *,
      stops:course_stops(
        id,
        stop_order,
        distance_to_next_m,
        bakery:bakeries(id, name, address, lat, lng, avg_rating)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // stops를 stop_order 순으로 정렬
  const sorted = (data || []).map((course) => ({
    ...course,
    stops: (course.stops || []).sort(
      (a: any, b: any) => a.stop_order - b.stop_order
    ),
  }));

  return NextResponse.json(sorted);
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("id");

    if (!courseId) {
      return NextResponse.json(
        { error: "코스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // course_stops는 CASCADE로 삭제되도록 DB 설정되어 있어야 함
    // 안전을 위해 먼저 stops 삭제
    await supabase
      .from("course_stops")
      .delete()
      .eq("course_id", courseId);

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Course delete error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
