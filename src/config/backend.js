// Supabase project the marketplace catalogue lives in. Both values are public
// (the anon key only grants what the RLS policies allow: reading published
// items and loadouts). Never put the service-role key in a VITE_* variable.
//
//   VITE_SUPABASE_URL=https://<project>.supabase.co   (local: http://127.0.0.1:54321)
//   VITE_SUPABASE_ANON_KEY=<anon key>

export const BACKEND = {
  url: (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, ""),
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
};

export const backendConfigured = Boolean(BACKEND.url && BACKEND.anonKey);
