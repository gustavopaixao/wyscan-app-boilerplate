/**
 * Client-side view of the session.
 *
 * This is a CACHE, not the source of truth — the session itself lives in
 * HttpOnly cookies the browser cannot read. `sessionReady` distinguishes "not
 * signed in" from "we have not asked yet", which is what stops AuthGuard from
 * flashing the sign-in screen on first paint.
 */
import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  photoUrl: string | null;
  preferredLanguage: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** False until the first session probe resolves. */
  sessionReady: boolean;
  setUser: (user: AuthUser | null) => void;
  setSessionReady: (ready: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  sessionReady: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  // `sessionReady` stays true on clear: we know the answer, it is "signed out".
  clear: () => set({ user: null, isAuthenticated: false, sessionReady: true }),
}));
