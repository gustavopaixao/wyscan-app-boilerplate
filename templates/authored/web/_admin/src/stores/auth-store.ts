/**
 * Client-side view of the admin session. A cache of what the BFF reported —
 * the session itself is in HttpOnly cookies the browser cannot read.
 */
import { create } from "zustand";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
};

type AuthState = {
  user: AdminUser | null;
  isAuthenticated: boolean;
  /** False until the first session probe resolves. */
  sessionReady: boolean;
  setUser: (user: AdminUser | null) => void;
  setSessionReady: (ready: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  sessionReady: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  clear: () => set({ user: null, isAuthenticated: false, sessionReady: true }),
}));
