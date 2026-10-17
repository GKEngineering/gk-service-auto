import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "inspections";

let client: SupabaseClient | null = null;

/** Client navigateur (créé à la demande pour ne pas casser le build sans variables d'environnement). */
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !cle) throw new Error("Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes");
    client = createClient(url, cle);
  }
  return client;
}
