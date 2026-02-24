import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync Kakao profile to users table on first login only.
      // ignoreDuplicates ensures custom profile changes are preserved on re-login.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const kakaoId = user.identities?.[0]?.id || user.id;
        const nickname = meta.full_name || meta.name || "빵순이";
        const avatarUrl = meta.avatar_url || meta.picture || null;

        const admin = createServiceClient();
        await admin.from("users").upsert(
          {
            id: user.id,
            kakao_id: kakaoId,
            nickname,
            avatar_url: avatarUrl,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
