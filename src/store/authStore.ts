import { create } from "zustand";
import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string; full_name: string; phone: string | null;
  avatar_url: string | null; locale: string; status: string;
}

interface AuthState {
  user:     User | null;
  profile:  Profile | null;
  session:  Session | null;
  loading:  boolean;
  setUser:  (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  signOut:  () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, profile: null, session: null, loading: true,

  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from("profiles").select("*").eq("id", userId).single();
    set({ profile: data ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },
}));
