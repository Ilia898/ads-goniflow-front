"use client";

import { create } from "zustand";
import { apiFetch } from "../utils/api";

export type AdminRole = "owner" | "admin" | "viewer";

export interface AdminIdentity {
    userId: string;
    email: string;
    role: AdminRole;
}

interface AdminState {
    me: AdminIdentity | null;
    isChecking: boolean;
    hasChecked: boolean;
    fetchAdminStatus: () => Promise<void>;
    clear: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
    me: null,
    isChecking: false,
    hasChecked: false,

    fetchAdminStatus: async () => {
        set({ isChecking: true });
        try {
            const response = await apiFetch("/admin/me");
            set({
                me: response.data as AdminIdentity,
                isChecking: false,
                hasChecked: true,
            });
        } catch {
            set({
                me: null,
                isChecking: false,
                hasChecked: true,
            });
        }
    },

    clear: () => set({
        me: null,
        isChecking: false,
        hasChecked: false,
    }),
}));
