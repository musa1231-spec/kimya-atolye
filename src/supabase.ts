import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Geliştirme sırasında .env eksikse erken ve net hata ver.
  throw new Error(
    "Supabase yapılandırması eksik. .env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin."
  );
}

export const sb = createClient(url, key);
