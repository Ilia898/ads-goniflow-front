import { create } from "zustand";
import { apiFetch } from "../utils/api";

interface User {
    id: string;
    email: string;
    tier?: "free" | "pro" | "enterprise";
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string, redirectTo: string) => Promise<void>;
    resetPassword: (newPassword: string) => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    updateUserTier: (tier: "free" | "pro" | "enterprise") => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
 
    clearError: () => set({ error: null }),

    updateUserTier: (tier) => {
        const currentUser = get().user;
        if (currentUser) {
            const updated = { ...currentUser, tier };
            localStorage.setItem("goniflow_user_tier_" + currentUser.id, tier);
            set({ user: updated });
        }
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const res = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            const user = res.data.user;
            const savedTier = (typeof window !== "undefined" ? localStorage.getItem("goniflow_user_tier_" + user.id) || "free" : "free") as "free" | "pro" | "enterprise";
            set({
                user: { ...user, tier: savedTier },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false, isAuthenticated: false });
            throw err;
        }
    },

    register: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            await apiFetch("/auth/signup", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            set({ isLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
            throw err;
        }
    },

    logout: async () => {
        set({ isLoading: true, error: null });
        try {
            await apiFetch("/auth/logout", {
                method: "POST",
            });
        } catch (err) {
            console.warn("Backend logout failed, clearing local session anyway:", err);
        } finally {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    forgotPassword: async (email, redirectTo) => {
        set({ isLoading: true, error: null });
        try {
            await apiFetch("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email, redirectTo }),
            });
            set({ isLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
            throw err;
        }
    },

    resetPassword: async (newPassword) => {
        set({ isLoading: true, error: null });
        try {
            await apiFetch("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ newPassword }),
            });
            set({ isLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isLoading: false });
            throw err;
        }
    },

    checkAuth: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await apiFetch("/auth/me");
            const user = res.user;
            const savedTier = (typeof window !== "undefined" ? localStorage.getItem("goniflow_user_tier_" + user.id) || "free" : "free") as "free" | "pro" | "enterprise";
            set({
                user: { ...user, tier: savedTier },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },
}));
