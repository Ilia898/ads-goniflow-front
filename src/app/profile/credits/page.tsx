"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCreditStore } from "../../../store/creditStore";
import { apiFetch } from "../../../utils/api";

interface CreditHistoryEntry {
    id: string;
    amount: number;
    bucket: "promo" | "paid";
    entryType: string;
    balanceAfter: number;
    createdAt: string;
}

interface CreditPurchase {
    id: string;
    productId: string;
    quantity: number;
    amountGel: number;
    credits: number;
    status: "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
    createdAt: string;
}

interface CreditUsageSummary {
    periodDays: number;
    creditsSpent: number;
    promoCreditsSpent: number;
    paidCreditsSpent: number;
    operations: number;
    textOperations: number;
    imageOperations: number;
    standardOperations: number;
    premiumOperations: number;
    refundedOperations: number;
    platforms: Array<{
        platform: string;
        operations: number;
    }>;
    allTimeCreditsSpent: number;
    allTimeOperations: number;
}

const entryLabels: Record<string, string> = {
    initial_promo_grant: "საწყისი უფასო კრედიტები",
    monthly_promo_reset: "ყოველთვიური უფასო კრედიტები",
    generation_reserve: "AI გენერაცია",
    generation_refund: "დაბრუნებული კრედიტები",
    credit_purchase: "კრედიტების შეძენა",
    admin_adjustment: "ადმინისტრატორის კორექტირება",
};

const purchaseStatus: Record<CreditPurchase["status"], {
    label: string;
    className: string;
}> = {
    created: { label: "შექმნილი", className: "text-slate-400 bg-slate-500/10" },
    pending: { label: "მუშავდება", className: "text-amber-300 bg-amber-500/10" },
    paid: { label: "გადახდილი", className: "text-emerald-300 bg-emerald-500/10" },
    failed: { label: "წარუმატებელი", className: "text-rose-300 bg-rose-500/10" },
    cancelled: { label: "გაუქმებული", className: "text-slate-400 bg-slate-500/10" },
    refunded: { label: "დაბრუნებული", className: "text-purple-300 bg-purple-500/10" },
};

const dateFormatter = new Intl.DateTimeFormat("ka-GE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export default function CreditsPage() {
    const { balance, fetchBalance } = useCreditStore();
    const [history, setHistory] = useState<CreditHistoryEntry[]>([]);
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
    const [summary, setSummary] = useState<CreditUsageSummary | null>(null);
    const [periodDays, setPeriodDays] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [historyResponse, purchasesResponse, summaryResponse] = await Promise.all([
                apiFetch("/credits/history?limit=50"),
                apiFetch("/credits/purchases?limit=25"),
                apiFetch(`/credits/summary?days=${periodDays}`),
                fetchBalance(),
            ]);
            setHistory(historyResponse.data as CreditHistoryEntry[]);
            setPurchases(purchasesResponse.data as CreditPurchase[]);
            setSummary(summaryResponse.data as CreditUsageSummary);
        } catch (loadError) {
            setError((loadError as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchBalance, periodDays]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                            კრედიტების ანგარიში
                        </p>
                        <h1 className="mt-1 text-xl font-extrabold text-white">
                            ბალანსი და ისტორია
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            უფასო კრედიტები ყოველ თვე ახლდება, შეძენილი კრედიტები კი არ იწურება.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void loadData()}
                            disabled={isLoading}
                            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isLoading ? "ახლდება…" : "განახლება"}
                        </button>
                        <Link
                            href="/#pricing"
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-500"
                        >
                            ბალანსის შევსება
                        </Link>
                    </div>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-3">
                    <BalanceCard
                        label="სრული ბალანსი"
                        value={balance?.total ?? 0}
                        accent="text-white"
                    />
                    <BalanceCard
                        label="უფასო კრედიტები"
                        value={balance?.promo ?? 0}
                        accent="text-indigo-300"
                    />
                    <BalanceCard
                        label="შეძენილი კრედიტები"
                        value={balance?.paid ?? 0}
                        accent="text-emerald-300"
                    />
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">
                    მონაცემები ვერ ჩაიტვირთა: {error}
                </div>
            )}

            <UsageAnalytics
                summary={summary}
                periodDays={periodDays}
                onPeriodChange={setPeriodDays}
                isLoading={isLoading}
            />

            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
                    <div className="border-b border-slate-800 px-5 py-4">
                        <h2 className="text-sm font-bold text-white">კრედიტების მოძრაობა</h2>
                        <p className="mt-1 text-[10px] text-slate-500">
                            ბოლო {history.length} ოპერაცია
                        </p>
                    </div>

                    <div className="divide-y divide-slate-900">
                        {!isLoading && history.length === 0 && (
                            <EmptyState text="კრედიტების ისტორია ჯერ ცარიელია." />
                        )}
                        {history.map((entry) => {
                            const positive = entry.amount > 0;
                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between gap-4 px-5 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-200">
                                            {entryLabels[entry.entryType] ?? entry.entryType}
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-500">
                                            {dateFormatter.format(new Date(entry.createdAt))}
                                            {" · "}
                                            {entry.bucket === "promo" ? "უფასო" : "შეძენილი"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={`text-sm font-black ${
                                            positive ? "text-emerald-300" : "text-rose-300"
                                        }`}>
                                            {positive ? "+" : ""}{entry.amount}
                                        </p>
                                        <p className="mt-1 text-[9px] text-slate-600">
                                            დარჩა {entry.balanceAfter}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
                    <div className="border-b border-slate-800 px-5 py-4">
                        <h2 className="text-sm font-bold text-white">შევსებები</h2>
                        <p className="mt-1 text-[10px] text-slate-500">
                            შეკვეთებისა და გადახდების სტატუსი
                        </p>
                    </div>

                    <div className="divide-y divide-slate-900">
                        {!isLoading && purchases.length === 0 && (
                            <EmptyState text="შევსება ჯერ არ გაგიკეთებია." />
                        )}
                        {purchases.map((purchase) => {
                            const status = purchaseStatus[purchase.status];
                            return (
                                <div key={purchase.id} className="space-y-2 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold text-slate-200">
                                            {purchase.credits} კრედიტი
                                        </p>
                                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                                        <span>{purchase.amountGel} ₾</span>
                                        <span>{dateFormatter.format(new Date(purchase.createdAt))}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

function UsageAnalytics({
    summary,
    periodDays,
    onPeriodChange,
    isLoading,
}: {
    summary: CreditUsageSummary | null;
    periodDays: number;
    onPeriodChange: (days: number) => void;
    isLoading: boolean;
}) {
    const operations = summary?.operations ?? 0;
    const standardShare = operations > 0
        ? Math.round(((summary?.standardOperations ?? 0) / operations) * 100)
        : 0;
    const premiumShare = operations > 0 ? 100 - standardShare : 0;
    const maxPlatformOperations = Math.max(
        1,
        ...(summary?.platforms.map((item) => item.operations) ?? []),
    );
    const platformLabels: Record<string, string> = {
        facebook: "Facebook",
        instagram: "Instagram",
        linkedin: "LinkedIn",
        x: "X (Twitter)",
        unknown: "სხვა",
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-sm font-bold text-white">გამოყენების ანალიტიკა</h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                        ითვლება მხოლოდ წარმატებით დასრულებული AI ოპერაციები
                    </p>
                </div>
                <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            type="button"
                            onClick={() => onPeriodChange(days)}
                            disabled={isLoading}
                            className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors ${
                                periodDays === days
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-500 hover:text-slate-300"
                            }`}
                        >
                            {days} დღე
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="დახარჯული კრედიტები" value={summary?.creditsSpent ?? 0} detail={`სულ: ${summary?.allTimeCreditsSpent ?? 0}`} />
                <MetricCard label="AI ოპერაციები" value={operations} detail={`სულ: ${summary?.allTimeOperations ?? 0}`} />
                <MetricCard label="ტექსტი" value={summary?.textOperations ?? 0} detail={`სურათი: ${summary?.imageOperations ?? 0}`} />
                <MetricCard label="დაბრუნებული ოპერაციები" value={summary?.refundedOperations ?? 0} detail="ხარჯში არ ითვლება" />
            </div>

            <div className="grid gap-6 border-t border-slate-800 p-5 lg:grid-cols-2">
                <div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-indigo-300">Standard {summary?.standardOperations ?? 0}</span>
                        <span className="text-purple-300">Premium {summary?.premiumOperations ?? 0}</span>
                    </div>
                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-900">
                        <div
                            className="bg-indigo-500 transition-all"
                            style={{ width: `${standardShare}%` }}
                        />
                        <div
                            className="bg-purple-500 transition-all"
                            style={{ width: `${premiumShare}%` }}
                        />
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-slate-600">
                        <span>{standardShare}% სწრაფი რეჟიმი</span>
                        <span>{premiumShare}% მაღალი ხარისხი</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-indigo-500/5 p-3">
                            <p className="text-lg font-black text-indigo-300">{summary?.promoCreditsSpent ?? 0}</p>
                            <p className="text-[9px] text-slate-500">უფასო კრედიტი დაიხარჯა</p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/5 p-3">
                            <p className="text-lg font-black text-emerald-300">{summary?.paidCreditsSpent ?? 0}</p>
                            <p className="text-[9px] text-slate-500">შეძენილი კრედიტი დაიხარჯა</p>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        პლატფორმების გამოყენება
                    </p>
                    <div className="mt-3 space-y-3">
                        {(summary?.platforms ?? []).length === 0 && (
                            <p className="py-6 text-center text-xs text-slate-600">
                                ამ პერიოდში გენერაცია არ შესრულებულა.
                            </p>
                        )}
                        {(summary?.platforms ?? []).map((item) => (
                            <div key={item.platform}>
                                <div className="flex justify-between text-[10px]">
                                    <span className="font-semibold text-slate-300">
                                        {platformLabels[item.platform] ?? item.platform}
                                    </span>
                                    <span className="text-slate-500">{item.operations}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-900">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        style={{ width: `${(item.operations / maxPlatformOperations) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function MetricCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: number;
    detail: string;
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
            <p className="mt-1 text-[9px] text-slate-600">{detail}</p>
        </div>
    );
}

function BalanceCard({
    label,
    value,
    accent,
}: {
    label: string;
    value: number;
    accent: string;
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {label}
            </p>
            <p className={`mt-2 text-3xl font-black ${accent}`}>
                {value}
            </p>
            <p className="mt-1 text-[10px] text-slate-600">კრედიტი</p>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="px-5 py-10 text-center text-xs text-slate-600">
            {text}
        </div>
    );
}
