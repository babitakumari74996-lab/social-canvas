import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UProfile } from "@/lib/types";

// Auth has been removed from the website: everyone is a guest in the demo
// world. The hook stays so existing call sites keep working — it always
// reports "no session", which routes every data hook into demo mode.
export function useSession() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { session: null, loading: !ready, userId: null as string | null };
}

export function useMyProfile() {
  return useQuery<UProfile | null>({
    queryKey: ["profile", "me"],
    queryFn: async () => null,
    enabled: false,
  });
}
