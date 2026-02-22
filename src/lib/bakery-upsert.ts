import { SupabaseClient } from "@supabase/supabase-js";

interface BakeryInput {
  kakao_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

/**
 * 빵집 upsert (kakao_place_id 기준)
 * 이미 존재하면 기존 ID 반환, 없으면 새로 생성
 */
export async function upsertBakery(
  supabase: SupabaseClient,
  bakery: BakeryInput
): Promise<{ id: string; error?: string }> {
  const { data: existing } = await supabase
    .from("bakeries")
    .select("id")
    .eq("kakao_place_id", bakery.kakao_place_id)
    .single();

  if (existing) {
    return { id: existing.id };
  }

  const { data: newBakery, error } = await supabase
    .from("bakeries")
    .insert({
      kakao_place_id: bakery.kakao_place_id,
      name: bakery.name,
      address: bakery.address,
      lat: bakery.lat,
      lng: bakery.lng,
      category: bakery.category || "베이커리",
    })
    .select("id")
    .single();

  if (error || !newBakery) {
    return { id: "", error: error?.message || "빵집 등록 실패" };
  }

  return { id: newBakery.id };
}
