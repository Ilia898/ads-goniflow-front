"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
    AdminRole,
    useAdminStore,
} from "../../../store/adminStore";
import { apiFetch } from "../../../utils/api";

interface AdminMember {
    userId: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    addedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

interface AdminAuditEntry {
    id: string;
    actorUserId: string | null;
    actorEmail: string | null;
    action: string;
    targetUserId: string | null;
    targetEmail: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}

const roleLabels: Record<AdminRole, string> = {
    owner: "Owner",
    admin: "Admin",
    viewer: "Viewer",
};

const roleDescriptions: Record<AdminRole, string> = {
    owner: "ადმინისტრატორების და სისტემის სრული მართვა",
    admin: "ოპერაციული მართვა და audit ისტორია",
    viewer: "მხოლოდ მონაცემების ნახვა",
};

const auditLabels: Record<string, string> = {
    bootstrap_owner: "პირველი Owner შეიქმნა",
    admin_member_added: "ადმინისტრატორი დაემატა",
    admin_member_reactivated: "ადმინისტრატორი გააქტიურდა",
    admin_member_updated: "ადმინისტრატორი განახლდა",
    credit_adjustment: "კრედიტების ბალანსი შეიცვალა",
};

const dateFormatter = new Intl.DateTimeFormat("ka-GE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export default function AdminPage() {
    const {
        me,
        hasChecked,
        isChecking,
        fetchAdminStatus,
    } = useAdminStore();
    const [members, setMembers] = useState<AdminMember[]>([]);
    const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
    const [email, setEmail] = useState("");
    const [newRole, setNewRole] = useState<AdminRole>("admin");
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadAdminData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        await fetchAdminStatus();
        const identity = useAdminStore.getState().me;

        if (!identity) {
            setMembers([]);
            setAudit([]);
            setIsLoading(false);
            return;
        }

        try {
            const membersResponse = await apiFetch("/admin/members");
            setMembers(membersResponse.data as AdminMember[]);

            if (identity.role !== "viewer") {
                const auditResponse = await apiFetch("/admin/audit?limit=50");
                setAudit(auditResponse.data as AdminAuditEntry[]);
            } else {
                setAudit([]);
            }
        } catch (loadError) {
            setError((loadError as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAdminStatus]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadAdminData();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadAdminData]);

    const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsAdding(true);
        setError(null);
        setSuccess(null);

        try {
            await apiFetch("/admin/members", {
                method: "POST",
                body: JSON.stringify({
                    email: email.trim(),
                    role: newRole,
                }),
            });
            setEmail("");
            setNewRole("admin");
            setSuccess("ადმინისტრატორი წარმატებით დაემატა.");
            await loadAdminData();
        } catch (addError) {
            setError((addError as Error).message);
        } finally {
            setIsAdding(false);
        }
    };

    const updateLocalMember = (
        userId: string,
        patch: Partial<Pick<AdminMember, "role" | "isActive">>,
    ) => {
        setMembers((current) => current.map((member) => (
            member.userId === userId ? { ...member, ...patch } : member
        )));
    };

    const handleSaveMember = async (member: AdminMember) => {
        setSavingId(member.userId);
        setError(null);
        setSuccess(null);

        try {
            await apiFetch(`/admin/members/${member.userId}`, {
                method: "PATCH",
                body: JSON.stringify({
                    role: member.role,
                    isActive: member.isActive,
                }),
            });
            setSuccess(`${member.email} განახლდა.`);
            await loadAdminData();
        } catch (updateError) {
            setError((updateError as Error).message);
            await loadAdminData();
        } finally {
            setSavingId(null);
        }
    };

    if ((isChecking || isLoading) && !hasChecked) {
        return <LoadingState />;
    }

    if (hasChecked && !me) {
        return (
            <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
                <p className="text-3xl">🔒</p>
                <h1 className="mt-3 text-lg font-extrabold text-white">
                    ადმინისტრატორის წვდომა არ გაქვს
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    ეს გვერდი ხელმისაწვდომია მხოლოდ აქტიური Owner, Admin ან Viewer წევრებისთვის.
                </p>
                <Link
                    href="/profile/dashboard"
                    className="mt-5 inline-block rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
                >
                    პანელზე დაბრუნება
                </Link>
            </div>
        );
    }

    if (!me) return <LoadingState />;
    const canManageMembers = me.role === "owner";

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                            ადმინისტრირება
                        </p>
                        <h1 className="mt-1 text-xl font-extrabold text-white">
                            გუნდი და უფლებები
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            შენი როლი: <span className="font-bold text-cyan-300">{roleLabels[me.role]}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/profile/admin/users"
                            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-500"
                        >
                            მომხმარებლები და კრედიტები
                        </Link>
                        <button
                            type="button"
                            onClick={() => void loadAdminData()}
                            disabled={isLoading}
                            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isLoading ? "ახლდება…" : "განახლება"}
                        </button>
                    </div>
                </div>
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

            {canManageMembers && (
                <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                    <h2 className="text-sm font-bold text-white">ადმინისტრატორის დამატება</h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                        მომხმარებელი ჯერ რეგისტრირებული უნდა იყოს GoniFlow-ში.
                    </p>
                    <form
                        onSubmit={handleAddMember}
                        className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
                    >
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="user@example.com"
                            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white outline-none transition-colors focus:border-cyan-500/60"
                        />
                        <select
                            value={newRole}
                            onChange={(event) => setNewRole(event.target.value as AdminRole)}
                            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none"
                        >
                            {(["owner", "admin", "viewer"] as const).map((role) => (
                                <option key={role} value={role}>
                                    {roleLabels[role]}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={isAdding || !email.trim()}
                            className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isAdding ? "ემატება…" : "დამატება"}
                        </button>
                    </form>
                </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="border-b border-slate-800 px-5 py-4">
                    <h2 className="text-sm font-bold text-white">
                        ადმინისტრატორები ({members.length})
                    </h2>
                </div>
                <div className="divide-y divide-slate-900">
                    {members.map((member) => (
                        <div
                            key={member.userId}
                            className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_170px_150px_auto] lg:items-center"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-xs font-bold text-slate-200">
                                        {member.email}
                                    </p>
                                    {member.userId === me.userId && (
                                        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold text-cyan-300">
                                            შენ
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-[9px] text-slate-600">
                                    დამატებულია {dateFormatter.format(new Date(member.createdAt))}
                                </p>
                            </div>

                            <select
                                value={member.role}
                                disabled={!canManageMembers}
                                onChange={(event) => updateLocalMember(member.userId, {
                                    role: event.target.value as AdminRole,
                                })}
                                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] text-white disabled:cursor-default disabled:opacity-70"
                            >
                                {(["owner", "admin", "viewer"] as const).map((role) => (
                                    <option key={role} value={role}>
                                        {roleLabels[role]}
                                    </option>
                                ))}
                            </select>

                            <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                <input
                                    type="checkbox"
                                    checked={member.isActive}
                                    disabled={!canManageMembers}
                                    onChange={(event) => updateLocalMember(member.userId, {
                                        isActive: event.target.checked,
                                    })}
                                    className="h-4 w-4 accent-cyan-500"
                                />
                                {member.isActive ? "აქტიური" : "გათიშული"}
                            </label>

                            {canManageMembers && (
                                <button
                                    type="button"
                                    onClick={() => void handleSaveMember(member)}
                                    disabled={savingId !== null}
                                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                                >
                                    {savingId === member.userId ? "ინახება…" : "შენახვა"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                {(["owner", "admin", "viewer"] as const).map((role) => (
                    <div key={role} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                        <p className="text-xs font-bold text-white">{roleLabels[role]}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            {roleDescriptions[role]}
                        </p>
                    </div>
                ))}
            </section>

            {me.role !== "viewer" && (
                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                    <div className="border-b border-slate-800 px-5 py-4">
                        <h2 className="text-sm font-bold text-white">Audit ისტორია</h2>
                        <p className="mt-1 text-[10px] text-slate-500">
                            ადმინისტრაციული ცვლილებების ბოლო {audit.length} ჩანაწერი
                        </p>
                    </div>
                    <div className="divide-y divide-slate-900">
                        {audit.length === 0 && (
                            <div className="px-5 py-10 text-center text-xs text-slate-600">
                                ისტორია ჯერ ცარიელია.
                            </div>
                        )}
                        {audit.map((entry) => (
                            <div key={entry.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-300">
                                        {auditLabels[entry.action] ?? entry.action}
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-500">
                                        {entry.actorEmail ?? "სისტემა"}
                                        {" → "}
                                        {entry.targetEmail ?? "უცნობი მომხმარებელი"}
                                    </p>
                                </div>
                                <time className="shrink-0 text-[9px] text-slate-600">
                                    {dateFormatter.format(new Date(entry.createdAt))}
                                </time>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-xs text-slate-500">
            ადმინისტრატორის წვდომა მოწმდება…
        </div>
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
