"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCreditStore } from "../../store/creditStore";

export type GenerationMode = "standard" | "premium";

interface CreditModeSelectorProps {
    mode: GenerationMode;
    onModeChange: (mode: GenerationMode) => void;
}

export default function CreditModeSelector({
    mode,
    onModeChange,
}: CreditModeSelectorProps) {
    const {
        balance,
        catalog,
        isLoading,
        refresh,
    } = useCreditStore();

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const standardCost = catalog?.generationCosts.standardPost ?? 3;
    const premiumCost = catalog?.generationCosts.premiumPost ?? 6;

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        კრედიტების ბალანსი
                    </p>
                    <p className="text-lg font-black text-white">
                        {isLoading && !balance ? "…" : balance?.total ?? 0}
                        <span className="ml-1 text-[10px] font-semibold text-slate-500">
                            კრედიტი
                        </span>
                    </p>
                </div>
                <Link
                    href="/#pricing"
                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-bold text-indigo-300 transition-colors hover:bg-indigo-500/20"
                >
                    შევსება
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onModeChange("standard")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                        mode === "standard"
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                >
                    <span className="block text-[11px] font-bold text-slate-100">
                        ⚡ სტანდარტული
                    </span>
                    <span className="mt-0.5 block text-[9px] text-slate-500">
                        სწრაფი • სრული პოსტი {standardCost} კრედიტი
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => onModeChange("premium")}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                        mode === "premium"
                            ? "border-purple-500/50 bg-purple-500/10"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                >
                    <span className="block text-[11px] font-bold text-slate-100">
                        ✨ პრემიუმი
                    </span>
                    <span className="mt-0.5 block text-[9px] text-slate-500">
                        მაღალი ხარისხი • სრული პოსტი {premiumCost} კრედიტი
                    </span>
                </button>
            </div>

            {balance && (
                <p className="text-[9px] text-slate-600">
                    უფასო: {balance.promo} • შეძენილი: {balance.paid}
                </p>
            )}
        </div>
    );
}
