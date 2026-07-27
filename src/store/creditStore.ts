'use client';

import { create } from "zustand";
import { apiFetch } from "../utils/api";

export interface CreditBalance {
    promo: number;
    paid: number;
    total: number;
    promoCycleStart: string;
    updatedAt: string;
}

export interface CreditProduct {
    id: string;
    name: string;
    priceGel: number;
    credits: number;
    bonusCredits: number;
}

interface CreditCatalog {
    monthlyPromoCredits: number;
    generationCosts: {
        text: number;
        standardImage: number;
        premiumImage: number;
        standardPost: number;
        premiumPost: number;
    };
    products: CreditProduct[];
    payment: {
        provider: "stripe";
        enabled: boolean;
    };
}

interface CreditState {
    balance: CreditBalance | null;
    catalog: CreditCatalog | null;
    isLoading: boolean;
    error: string | null;
    fetchBalance: () => Promise<void>;
    fetchCatalog: () => Promise<void>;
    refresh: () => Promise<void>;
    clear: () => void;
}

export const useCreditStore = create<CreditState>((set, get) => ({
    balance: null,
    catalog: null,
    isLoading: false,
    error: null,

    fetchBalance: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiFetch("/credits/balance");
            set({ balance: response.data, isLoading: false });
        } catch (error) {
            set({
                error: (error as Error).message,
                isLoading: false,
            });
        }
    },

    fetchCatalog: async () => {
        try {
            const response = await apiFetch("/credits/catalog");
            set({ catalog: response.data });
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    refresh: async () => {
        await Promise.all([
            get().fetchBalance(),
            get().fetchCatalog(),
        ]);
    },

    clear: () => set({
        balance: null,
        catalog: null,
        error: null,
        isLoading: false,
    }),
}));
