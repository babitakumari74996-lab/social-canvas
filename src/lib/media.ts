import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/integrations/supabase/lazy";

/** Store a path like `<uid>/<uuid>.jpg`. Returns a signed URL cached for 50 minutes. */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await (await getSupabase()).storage.from("media").createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
}

export async function uploadMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await (await getSupabase()).storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}