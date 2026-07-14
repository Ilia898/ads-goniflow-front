"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";

export default function Header() {
    const { isAuthenticated, isLoading, user } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    const activeTier = user?.tier || "free";

    const handleLogoClick = (e: React.MouseEvent) => {
        if (pathname === "/") {
            e.preventDefault();
            // Use native history API so Next.js scroll-restoration doesn't interfere
            window.history.replaceState({}, "", "/");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
        // If on any other page, let the Link href="/" handle normal navigation
    };

    const handleNavClick = (e: React.MouseEvent, sectionId: string) => {
        if (pathname === "/") {
            // Already on landing page — scroll natively without involving Next.js router
            e.preventDefault();
            window.history.replaceState({}, "", `/#${sectionId}`);
            const el = document.getElementById(sectionId);
            if (el) {
                const headerHeight = 64; // fixed header h-16 = 4rem = 64px
                const top = el.getBoundingClientRect().top + window.scrollY - headerHeight;
                window.scrollTo({ top, behavior: "smooth" });
            }
        }
        // If on another page, let Link navigate to /#sectionId normally
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo Section exactly as requested */}
                <Link href="/" onClick={handleLogoClick} className="flex items-center group cursor-pointer pt-3">
                    <div className="relative">
                        {/* Subtitle/tag above */}
                        <span className="absolute -top-3.5 right-0 text-[8px] font-bold text-slate-500 uppercase tracking-widest transition-colors group-hover:text-indigo-400">
                            @ Ads
                        </span>
                        {/* Main logo text */}
                        <span className="text-xl font-black tracking-tight select-none">
                            <span className="text-white transition-colors group-hover:text-slate-200">Goni</span>
                            <span className="text-[#3d30f2] transition-all group-hover:drop-shadow-[0_0_8px_rgba(61,48,242,0.4)]">Flow</span>
                        </span>
                    </div>
                </Link>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link
                        href="/#features"
                        onClick={(e) => handleNavClick(e, "features")}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                        ფუნქციები
                    </Link>
                    <Link
                        href="/#pricing"
                        onClick={(e) => handleNavClick(e, "pricing")}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                        ტარიფები
                    </Link>
                    <a
                        href="https://goniflow.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        goniflow.com 🔗
                    </a>
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3">
                    {isLoading ? (
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                    ) : isAuthenticated ? (
                        <div className="flex items-center gap-2.5">
                            {/* Display Plan Badge */}
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                activeTier === "enterprise"
                                    ? "bg-purple-950/40 border-purple-500/30 text-purple-400"
                                    : activeTier === "pro"
                                    ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-400"
                                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                            }`}>
                                {activeTier}
                            </span>
                            <Link
                                href="/profile"
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                            >
                                კაბინეტი 🚀
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                შესვლა
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                            >
                                რეგისტრაცია
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
