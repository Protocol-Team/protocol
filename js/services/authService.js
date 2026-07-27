import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function createAuthUnavailableResult(reason = "supabase-not-configured") {
  return {
    ok: false,
    session: null,
    error: null,
    reason,
  };
}

export function isAuthConfigured() {
  return Boolean(isSupabaseConfigured && supabase);
}

export function getAuthRedirectTo() {
  if (!globalThis.location) return "";
  return `${globalThis.location.origin}${globalThis.location.pathname}`;
}

export async function signInWithGoogle() {
  if (!isAuthConfigured()) return createAuthUnavailableResult();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectTo(),
      },
    });

    if (error) {
      return {
        ok: false,
        data: null,
        error,
        reason: "google-oauth-failed",
      };
    }

    return {
      ok: true,
      data,
      error: null,
      reason: "",
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error,
      reason: "google-oauth-exception",
    };
  }
}

export async function signOut() {
  if (!isAuthConfigured()) return createAuthUnavailableResult();

  try {
    const { error } = await supabase.auth.signOut();
    return {
      ok: !error,
      error: error || null,
      reason: error ? "sign-out-failed" : "",
    };
  } catch (error) {
    return {
      ok: false,
      error,
      reason: "sign-out-exception",
    };
  }
}

export async function getCurrentSession() {
  if (!isAuthConfigured()) return createAuthUnavailableResult();

  try {
    const { data, error } = await supabase.auth.getSession();
    return {
      ok: !error,
      session: data?.session || null,
      error: error || null,
      reason: error ? "session-read-failed" : "",
    };
  } catch (error) {
    return {
      ok: false,
      session: null,
      error,
      reason: "session-read-exception",
    };
  }
}

export function onAuthStateChange(callback) {
  if (!isAuthConfigured()) {
    return {
      unsubscribe() {},
    };
  }

  try {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback?.(event, session);
    });
    return data?.subscription || { unsubscribe() {} };
  } catch {
    return {
      unsubscribe() {},
    };
  }
}
