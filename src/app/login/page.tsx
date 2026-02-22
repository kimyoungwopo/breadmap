"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "profile_nickname profile_image",
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-7xl">🍞</div>
        <h1 className="text-3xl font-bold text-foreground">빵지순례</h1>
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          전국 빵집 도장깨기!
          <br />
          먹은 빵을 기록하고 나만의 빵지도를 완성해요
        </p>
      </div>

      {/* Login */}
      <div className="flex w-full flex-col gap-3">
        <button
          onClick={handleKakaoLogin}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-[15px] font-bold text-[#191919] transition-transform active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.722 1.8 5.108 4.509 6.457l-1.15 4.261c-.1.37.324.672.65.463l4.903-3.27c.36.033.724.05 1.088.05 5.523 0 10-3.463 10-7.691S17.523 3 12 3z" />
          </svg>
          카카오로 3초만에 시작하기
        </button>

        <p className="text-center text-xs text-muted-foreground">
          가입 없이 카카오 계정으로 바로 시작!
        </p>
      </div>
    </div>
  );
}
