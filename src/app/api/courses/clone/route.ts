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

    const { source_course_id } = await request.json();

    if (!source_course_id) {
      return NextResponse.json(
        { error: "원본 코스 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Fetch source course + stops
    const { data: source, error: sourceError } = await supabase
      .from("courses")
      .select(`
        title, region, total_distance_m, total_duration_s,
        stops:course_stops(bakery_id, stop_order, distance_to_next_m, duration_to_next_s)
      `)
      .eq("id", source_course_id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: "원본 코스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Create new course
    const { data: newCourse, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        title: source.title,
        region: source.region,
        total_distance_m: source.total_distance_m,
        total_duration_s: source.total_duration_s,
      })
      .select("id, title")
      .single();

    if (courseError || !newCourse) {
      return NextResponse.json(
        { error: "코스 복제에 실패했습니다." },
        { status: 500 }
      );
    }

    // Copy stops
    const stops = (source.stops as any[]) || [];
    if (stops.length > 0) {
      const { error: stopsError } = await supabase
        .from("course_stops")
        .insert(
          stops.map((s: any) => ({
            course_id: newCourse.id,
            bakery_id: s.bakery_id,
            stop_order: s.stop_order,
            distance_to_next_m: s.distance_to_next_m,
            duration_to_next_s: s.duration_to_next_s,
          }))
        );

      if (stopsError) {
        // Rollback: delete the created course
        await supabase.from("courses").delete().eq("id", newCourse.id);
        return NextResponse.json(
          { error: "코스 정류장 복제에 실패했습니다." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(newCourse);
  } catch (err) {
    console.error("Course clone API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
