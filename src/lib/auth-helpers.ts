import { supabase } from "./supabase";

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Generates a stable shadow email for a username.
 * We use a stable format so that login actually works.
 */
const getStoredEmail = (username: string) => {
  const base = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base}@shadow-system.com`;
};

export async function signUpWithUsername(username: string, password: string) {
  const email = getStoredEmail(username);
  console.log("SYSTEM: Attempting signup with stable shadow email:", email);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        username: username
      }
    }
  });

  if (signUpError) {
    return { data: null, error: signUpError };
  }

  // After signup, immediately sign in to get a live session
  if (signUpData.user && !signUpData.session) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  return { data: signUpData, error: null };
}

export async function signInWithUsername(username: string, password: string) {
  const email = getStoredEmail(username);
  console.log("SYSTEM: Attempting sign-in for stable identifier:", email);
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInAsDevLocal() {
  const email = `hunter_${Date.now()}@arise-dev.com`;
  const password = "shadow-monarch-dev";
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}
