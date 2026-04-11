import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Resolves when auth is ready. Components can await this before making DB calls.
let authReady;
export const authReadyPromise = new Promise((resolve) => { authReady = resolve; });

// Retry auth with exponential backoff — never gives up
export async function ensureAnonymousUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    authReady();
    return;
  }

  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) {
      authReady();
      return;
    }
    console.warn(`Anonymous auth attempt ${i + 1} failed:`, error.message);
    // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
  }
  // Last resort — resolve anyway so the app can render and show an error
  console.error('Anonymous auth failed after all retries');
  authReady();
}

export async function getUserId() {
  // Wait for auth to complete before checking
  await authReadyPromise;
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) return user.id;
  // One more attempt if somehow auth resolved but no user
  await ensureAnonymousUser();
  const { data: { user: retryUser } } = await supabase.auth.getUser();
  return retryUser?.id ?? null;
}
