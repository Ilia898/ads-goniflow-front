"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

export default function ProfilePage() {
    const { user, isLoading, isAuthenticated, logout } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push("/login");
        } catch (err) {
            // Error is handled globally by Zustand store
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-slate-400 text-sm">იტვირთება...</span>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 min-h-screen text-slate-100 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    პროფილი
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                    ავტორიზებული მომხმარებლის კაბინეტი
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-4 border border-slate-800 shadow-2xl rounded-2xl sm:px-10">
                    <div className="space-y-6">
                        <div className="border-b border-slate-800/80 pb-6 text-center">
                            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">ელ-ფოსტა</span>
                            <h3 className="mt-1.5 text-xl font-bold text-white">{user.email}</h3>
                            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                აქტიური სესია
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={handleLogout}
                                className="flex w-full justify-center rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400 shadow-lg transition-all active:scale-[0.98]"
                            >
                                სისტემიდან გამოსვლა
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
