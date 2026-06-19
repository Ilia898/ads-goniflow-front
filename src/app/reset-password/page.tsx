"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [hasToken, setHasToken] = useState(false);

    const { resetPassword, isLoading, error, clearError } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        clearError();
        setValidationError(null);
        setSuccessMessage(null);

        // Parse token from hash fragment in client browser
        if (typeof window !== "undefined") {
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (accessToken) {
                    // Set local cookies temporarily so that the backend request is authenticated
                    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=3600; SameSite=Lax`;
                    if (refreshToken) {
                        document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
                    }
                    setHasToken(true);
                }
            }
        }
    }, [clearError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setSuccessMessage(null);

        if (!hasToken) {
            setValidationError("აღდგენის ტოკენი ვერ მოიძებნა. გთხოვთ გამოიყენოთ მეილზე მოსული ბმული.");
            return;
        }

        if (!password || !confirmPassword) {
            setValidationError("გთხოვთ შეავსოთ ყველა ველი");
            return;
        }

        if (password !== confirmPassword) {
            setValidationError("პაროლები არ ემთხვევა ერთმანეთს");
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`-])[a-zA-Z0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`-]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            setValidationError("პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო, შედგებოდეს მხოლოდ ლათინური სიმბოლოებისგან და შეიცავდეს მინიმუმ ერთ დიდ ასოს, ერთ პატარა ასოს, ერთ ციფრს და ერთ სპეციალურ სიმბოლოს");
            return;
        }

        try {
            await resetPassword(password);
            setSuccessMessage("პაროლი წარმატებით განახლდა! 3 წამში გადამისამართდებით შესვლის გვერდზე.");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err) {
            // Error is handled globally by Zustand store
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 min-h-screen text-slate-100 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    ახალი პაროლის დაყენება
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                    შეიყვანეთ თქვენი ახალი პაროლი
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-4 border border-slate-800 shadow-2xl rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Error Alert */}
                        {(!hasToken || validationError || error) && (
                            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 flex items-start gap-2.5 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                                </svg>
                                <span>
                                    {!hasToken 
                                        ? "აღდგენის ტოკენი ვერ მოიძებნა. გთხოვთ გამოიყენოთ მეილზე მოსული ბმული."
                                        : (validationError || error)
                                    }
                                </span>
                            </div>
                        )}

                        {/* Success Alert */}
                        {successMessage && (
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex items-start gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                </svg>
                                <span>{successMessage}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                ახალი პაროლი
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    disabled={!hasToken || isLoading}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-slate-100 placeholder-slate-500 shadow-inner outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm disabled:opacity-30 disabled:pointer-events-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300">
                                გაიმეორეთ ახალი პაროლი
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    disabled={!hasToken || isLoading}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-slate-100 placeholder-slate-500 shadow-inner outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm disabled:opacity-30 disabled:pointer-events-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={!hasToken || isLoading}
                                className="flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>იტვირთება...</span>
                                    </div>
                                ) : (
                                    "პაროლის განახლება"
                                )}
                            </button>
                        </div>

                        <div className="text-center text-sm">
                            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                დაბრუნება შესვლის გვერდზე
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
