import { create } from "zustand";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = {
  Id?: string;
  id?: string;
  Username?: string;
  username?: string;
  name?: string;
  avatar?: string;
  Avatar?: string;
  avatar_url?: string;
  avatarUrl?: string;
  [key: string]: unknown;
};

type UserStore = {
  isLoggedIn: boolean;
  authStatus: AuthStatus;
  user: AuthUser | null;

  setUser: (userData: AuthUser) => void;
  clearUser: () => void;
  setAuthLoading: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  isLoggedIn: false,
  authStatus: "loading",
  user: null,

  setUser: (userData) =>
    set({
      user: userData,
      isLoggedIn: true,
      authStatus: "authenticated",
    }),

  clearUser: () =>
    set({
      user: null,
      isLoggedIn: false,
      authStatus: "unauthenticated",
    }),

  setAuthLoading: () =>
    set({
      authStatus: "loading",
    }),
}));
