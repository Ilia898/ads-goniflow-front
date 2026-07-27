"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { useAdminStore } from "../../../../store/adminStore";
import { apiFetch } from "../../../../utils/api";

interface AdminCreditUser {
    userId: string;
    email: string;
    promoBalance: number;
    paidBalance: number;
    totalBalance: number;
    registeredAt: string;
    totalCount: number;
}

type CreditBucket = "promo" | "paid";
type AdjustmentDirection = "add" | "remove";

const dateFormatter = new Intl.DateTimeFormat("ka-GE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
    const {
        me,
        hasChecked,
        isChecking,
        fetchAdminStatus,
    } = useAdminStore();
    const [users, setUsers] = useState<AdminCreditUser[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminCreditUser | null>(null);
    const [bucket, setBucket] = useState<CreditBucket>("paid");
    const [direction, setDirection] = useState<AdjustmentDirection>("add");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        await fetchAdminStatus();
        const identity = useAdminStore.getState().me;

        if (!identity) {
            setUsers([]);
            setTotal(0);
            setIsLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (search) params.set("search", search);

            const response = await apiFetch(`/admin/users?${params.toString()}`);
            setUsers(response.data.users as AdminCreditUser[]);
            setTotal(Number(response.data.total ?? 0));
        } catch (loadError) {
            setError((loadError as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAdminStatus, offset, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadUsers();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadUsers]);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setOffset(0);
        setSearch(searchInput.trim());
    };

    const openAdjustment = (user: AdminCreditUser) => {
        setSelectedUser(user);
        setBucket("paid");
        setDirection("add");
        setAmount("");
        setReason("");
        setError(null);
        setSuccess(null);
    };

    const handleAdjustment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedUser) return;

        const numericAmount = Number(amount);
        if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
            setError("მიუთითე დადებითი მთელი რაოდენობა.");
            return;
        }

        const signedAmount = direction === "remove"
            ? -numericAmount
            : numericAmount;
        if (
            direction === "remove"
            && !window.confirm(
                `ნამდვილად გსურს ${numericAmount} კრედიტის დაკლება ${selectedUser.email}-სთვის?`,
            )
        ) {
            return;
        }

        setIsAdjusting(true);
        setError(null);
        setSuccess(null);
        try {
            await apiFetch(`/admin/users/${selectedUser.userId}/credits`, {
                method: "POST",
                headers: {
                    "Idempotency-Key": crypto.randomUUID(),
                },
                body: JSON.stringify({
                    bucket,
                    amount: signedAmount,
                    reason: reason.trim(),
                }),
            });
            setSuccess(
                `${selectedUser.email}: ${direction === "add" ? "დაემატა" : "დააკლდა"} ${numericAmount} კრედიტი.`,
            );
            setSelectedUser(null);
            await loadUsers();
        } catch (adjustmentError) {
            setError((adjustmentError as Error).message);
        } finally {
            setIsAdjusting(false);
        }
    };

    if ((isChecking || isLoading) && !hasChecked) {
        return <LoadingState />;
    }

    if (hasChecked && !me) {
        return (
            <AccessDenied />
        );
    }

    if (!me) return <LoadingState />;
    const canAdjust = me.role === "owner" || me.role === "admin";
    const pageStart = total === 0 ? 0 : offset + 1;
    const pageEnd = Math.min(offset + users.length, total);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                            ადმინისტრირება
                        </p>
                        <h1 className="mt-1 text-xl font-extrabold text-white">
                            მომხმარებლები და კრედიტები
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            სულ {total} რეგისტრირებული მომხმარებელი
                        </p>
                    </div>
                    <Link
                        href="/profile/admin"
                        className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                        ← ადმინისტრატორები
                    </Link>
                </div>

                <form onSubmit={handleSearch} className="mt-5 flex gap-2">
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="მომხმარებლის ელფოსტა"
                        className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-500/60"
                    />
                    <button
                        type="submit"
                        className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-cyan-500"
                    >
                        ძებნა
                    </button>
                </form>
            </section>

            {error && (
                <Notice className="border-rose-500/30 bg-rose-500/10 text-rose-300">
                    {error}
                </Notice>
            )}
            {success && (
                <Notice className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {success}
                </Notice>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="hidden grid-cols-[1fr_110px_110px_110px_120px] gap-4 border-b border-slate-800 px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-600 md:grid">
                    <span>მომხმარებელი</span>
                    <span>უფასო</span>
                    <span>შეძენილი</span>
                    <span>სულ</span>
                    <span>მოქმედება</span>
                </div>

                <div className="divide-y divide-slate-900">
                    {!isLoading && users.length === 0 && (
                        <div className="px-5 py-12 text-center text-xs text-slate-600">
                            მომხმარებელი ვერ მოიძებნა.
                        </div>
                    )}
                    {users.map((user) => (
                        <div
                            key={user.userId}
                            className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_110px_110px_110px_120px] md:items-center md:gap-4"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-200">
                                    {user.email}
                                </p>
                                <p className="mt-1 text-[9px] text-slate-600">
                                    რეგისტრაცია: {dateFormatter.format(new Date(user.registeredAt))}
                                </p>
                            </div>
                            <BalanceValue label="უფასო" value={user.promoBalance} className="text-indigo-300" />
                            <BalanceValue label="შეძენილი" value={user.paidBalance} className="text-emerald-300" />
                            <BalanceValue label="სულ" value={user.totalBalance} className="text-white" />
                            {canAdjust ? (
                                <button
                                    type="button"
                                    onClick={() => openAdjustment(user)}
                                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
                                >
                                    კორექტირება
                                </button>
                            ) : (
                                <span className="text-center text-[9px] text-slate-600">
                                    მხოლოდ ნახვა
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
                    <span className="text-[10px] text-slate-500">
                        {pageStart}–{pageEnd} / {total}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={offset === 0 || isLoading}
                            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                            className="rounded-lg border border-slate-800 px-3 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-900 disabled:opacity-40"
                        >
                            წინა
                        </button>
                        <button
                            type="button"
                            disabled={offset + PAGE_SIZE >= total || isLoading}
                            onClick={() => setOffset((current) => current + PAGE_SIZE)}
                            className="rounded-lg border border-slate-800 px-3 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-900 disabled:opacity-40"
                        >
                            შემდეგი
                        </button>
                    </div>
                </div>
            </section>

            {selectedUser && canAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <form
                        onSubmit={handleAdjustment}
                        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    კრედიტების კორექტირება
                                </h2>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                    {selectedUser.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="text-slate-500 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="ბალანსის ტიპი">
                                <select
                                    value={bucket}
                                    onChange={(event) => setBucket(event.target.value as CreditBucket)}
                                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white"
                                >
                                    <option value="paid">შეძენილი</option>
                                    <option value="promo">უფასო</option>
                                </select>
                            </Field>
                            <Field label="მოქმედება">
                                <select
                                    value={direction}
                                    onChange={(event) => setDirection(event.target.value as AdjustmentDirection)}
                                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white"
                                >
                                    <option value="add">დამატება</option>
                                    <option value="remove">დაკლება</option>
                                </select>
                            </Field>
                        </div>

                        <Field label="კრედიტების რაოდენობა">
                            <input
                                type="number"
                                required
                                min="1"
                                max="100000"
                                step="1"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white"
                            />
                        </Field>

                        <Field label="ცვლილების მიზეზი">
                            <textarea
                                required
                                minLength={3}
                                maxLength={300}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="მაგალითად: მომხმარებლის მხარდაჭერის კომპენსაცია"
                                className="min-h-24 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white"
                            />
                        </Field>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-200/80">
                            ოპერაცია ჩაიწერება მომხმარებლის ისტორიასა და ადმინისტრაციულ audit log-ში.
                            დაკლებისას ბალანსი ნულზე ქვემოთ ვერ ჩამოვა.
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 rounded-xl border border-slate-800 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-900"
                            >
                                გაუქმება
                            </button>
                            <button
                                type="submit"
                                disabled={isAdjusting}
                                className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-50 ${
                                    direction === "remove"
                                        ? "bg-rose-600 hover:bg-rose-500"
                                        : "bg-cyan-600 hover:bg-cyan-500"
                                }`}
                            >
                                {isAdjusting
                                    ? "ინახება…"
                                    : direction === "add"
                                        ? "დამატება"
                                        : "დაკლება"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function BalanceValue({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className: string;
}) {
    return (
        <div className="flex items-center justify-between md:block">
            <span className="text-[9px] text-slate-600 md:hidden">{label}</span>
            <span className={`text-xs font-black ${className}`}>{value}</span>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {label}
            </span>
            {children}
        </label>
    );
}

function Notice({
    children,
    className,
}: {
    children: ReactNode;
    className: string;
}) {
    return (
        <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${className}`}>
            {children}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-xs text-slate-500">
            მომხმარებლები იტვირთება…
        </div>
    );
}

function AccessDenied() {
    return (
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
            <p className="text-3xl">🔒</p>
            <h1 className="mt-3 text-lg font-extrabold text-white">
                ადმინისტრატორის წვდომა არ გაქვს
            </h1>
            <Link
                href="/profile/dashboard"
                className="mt-5 inline-block rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
            >
                პანელზე დაბრუნება
            </Link>
        </div>
    );
}
