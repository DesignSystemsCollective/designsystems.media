import { createClient } from "@supabase/supabase-js";

// Browser-only client. PUBLIC_* vars are the only ones Astro inlines into
// client bundles - safe to expose here since the anon key is meant to be
// public and row-level security (see supabase/migrations/) is what
// actually restricts access, not keeping this key secret.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY) - " +
      "accounts, sign-in and watch later will not work until they're set."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key"
);
