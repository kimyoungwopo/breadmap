import { createServiceClient } from "@/lib/supabase/server";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

/**
 * Fetch user profiles from the public.users table.
 * Custom nicknames/avatars are stored here so they persist across OAuth re-logins.
 */
export async function getUserProfiles(userIds: string[]): Promise<Record<string, UserProfile>> {
  const map: Record<string, UserProfile> = {};
  if (userIds.length === 0) return map;

  const admin = createServiceClient();
  const { data } = await admin
    .from("users")
    .select("id, nickname, avatar_url")
    .in("id", userIds);

  for (const u of data || []) {
    map[u.id] = {
      id: u.id,
      nickname: u.nickname || "빵순이",
      avatar_url: u.avatar_url || null,
    };
  }

  return map;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const map = await getUserProfiles([userId]);
  return map[userId] || null;
}
