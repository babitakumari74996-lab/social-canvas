// Loads the Supabase client on first use, so the library is not part of the first page load.
// The demo world (no sign-in) never calls it.
export const getSupabase = () => import("./client").then((m) => m.supabase);
