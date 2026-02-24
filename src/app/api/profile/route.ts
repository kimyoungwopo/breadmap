import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
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

    // Read from users table (source of truth for custom profile)
    const admin = createServiceClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, nickname, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile) {
      return NextResponse.json(profile);
    }

    // Fallback: no users record yet, return auth metadata
    const meta = user.user_metadata || {};
    return NextResponse.json({
      id: user.id,
      nickname: meta.full_name || meta.name || "빵순이",
      avatar_url: meta.avatar_url || null,
    });
  } catch (err) {
    console.error("Profile GET error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { nickname, avatar_url } = body;

    if (!nickname?.trim()) {
      return NextResponse.json(
        { error: "닉네임을 입력해주세요." },
        { status: 400 }
      );
    }

    // Upsert with service client — bypasses RLS, handles missing records
    const admin = createServiceClient();
    const kakaoId = user.identities?.[0]?.id || user.id;

    const { data, error } = await admin
      .from("users")
      .upsert(
        {
          id: user.id,
          kakao_id: kakaoId,
          nickname: nickname.trim(),
          avatar_url: avatar_url ?? null,
        },
        { onConflict: "id" }
      )
      .select("id, nickname, avatar_url")
      .single();

    if (error) {
      console.error("Profile upsert error:", error);
      return NextResponse.json(
        { error: "프로필 저장에 실패했어요." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Profile PATCH error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
