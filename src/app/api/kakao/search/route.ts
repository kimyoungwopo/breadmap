import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "카카오 API 요청 실패" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
