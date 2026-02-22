import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: course, error } = await supabase
      .from("courses")
      .select(`
        *,
        stops:course_stops(
          id,
          stop_order,
          distance_to_next_m,
          bakery:bakeries(id, name, address, lat, lng, avg_rating, checkin_count, category)
        )
      `)
      .eq("id", id)
      .single();

    if (error || !course) {
      return NextResponse.json(
        { error: "코스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // stops를 stop_order 순으로 정렬
    course.stops = (course.stops || []).sort(
      (a: any, b: any) => a.stop_order - b.stop_order
    );

    return NextResponse.json(course);
  } catch (err) {
    console.error("Course detail API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
