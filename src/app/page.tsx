"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";

// Mock data representing the interactive preview screens
const SIMULATED_POSTS = {
    facebook: {
        platformName: "Facebook",
        emoji: "📘",
        text: "☕ ყავის მოყვარულებო, თქვენთვის საოცარი სიახლე გვაქვს! 🎉 მიიღეთ 20%-იანი ფასდაკლება ნებისმიერ არომატულ სასმელზე ჩვენს ახალ ფილიალში. მობრძანდით, დააგემოვნეთ საუკეთესო მარცვლებისგან მომზადებული ყავა და გაილამაზეთ დღე. ✨",
        headline: "არომატული ყავა 20%-იანი ფასდაკლებით!",
        cta: "გაიგე მეტი",
        score: 94,
        metrics: { reach: "12.4K", likes: "1.2K", comments: "234" },
        tips: ["✅ დამატებულია მიმზიდველი ემოჯიები", "✅ მოწოდება მოქმედებისკენ (CTA) აქტიურია", "✅ ტონი იდეალურად მეგობრულია"],
    },
    instagram: {
        platformName: "Instagram",
        emoji: "📸",
        text: "მხოლოდ ამ კვირაში! ☕ შეიგრძენი ნამდვილი ყავის არომატი და ისარგებლე სპეციალური 20%-იანი ფასდაკლებით. 💫 იჩქარე, აქცია მოქმედებს მხოლოდ ახალ ფილიალში! #ყავა #ფასდაკლება #GoniFlow",
        headline: "გემო, რომელიც შთაგაგონებს",
        cta: "დაჯავშნეთ",
        score: 89,
        metrics: { reach: "8.9K", likes: "982", comments: "112" },
        tips: ["✅ გამოყენებულია პოპულარული ჰეშთეგები", "✅ ტექსტი არის ლაკონიური და ვიზუალური", "⚠️ დაამატეთ მეტი ემოჯი მეტი ჩართულობისთვის"],
    },
    linkedin: {
        platformName: "LinkedIn",
        emoji: "💼",
        text: "სიამაყით გაცნობებთ, რომ ჩვენი ახალი ფილიალი ოფიციალურად გაიხსნა! 🚀 ამასთან დაკავშირებით, გთავაზობთ 20%-იან ფასდაკლებას ყველა პრემიუმ ყავის სასმელზე. გვჯერა, რომ კარგი იდეები სწორედ ხარისხიანი ყავის გარშემო იბადება. შემოგვიერთდით და გაუზიარეთ კოლეგებს. 💼",
        headline: "ახალი ფილიალი და სპეციალური შეთავაზება",
        cta: "რეგისტრაცია",
        score: 91,
        metrics: { reach: "4.5K", likes: "412", comments: "48" },
        tips: ["✅ პროფესიონალური და საქმიანი კომუნიკაცია", "✅ მკაფიოდ ჩამოყალიბებული შეთავაზება", "✅ CTA იწვევს მომხმარებელს ქმედებისკენ"],
    },
    x: {
        platformName: "X (Twitter)",
        emoji: "🐦",
        text: "☕ ყავის ახალი ფილიალი გაიხსნა! მიიღე 20% ფასდაკლება ნებისმიერ სასმელზე. 💫 არ გამოტოვო შანსი, შემოგვიარე დღესვე! #GoniFlow #ყავა",
        headline: "ყავა -20% დღესვე!",
        cta: "მოგვწერეთ",
        score: 85,
        metrics: { reach: "15.1K", likes: "840", comments: "189" },
        tips: ["✅ მოკლე და მაღალი იმპაქტის მქონე ტექსტი", "✅ ოპტიმიზებულია X-ის ფორმატისთვის", "⚠️ გამოიყენეთ უფრო ძლიერი მოწოდება (CTA)"],
    },
};

export default function LandingPage() {
    const { isAuthenticated, isLoading, user, updateUserTier } = useAuthStore();
    const [selectedTab, setSelectedTab] = useState<keyof typeof SIMULATED_POSTS>("facebook");
    const [currentText, setCurrentText] = useState(SIMULATED_POSTS.facebook.text);
    const [isTyping, setIsTyping] = useState(false);
    const [planNotification, setPlanNotification] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Active subscription plan
    const activeTier = user?.tier || "free";

    // Track scroll positions for Scroll-to-Top Button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Simulated typing effect when switching tabs
    useEffect(() => {
        setIsTyping(true);
        const fullText = SIMULATED_POSTS[selectedTab].text;
        let index = 0;
        setCurrentText("");

        const interval = setInterval(() => {
            if (index < fullText.length) {
                setCurrentText((prev) => prev + fullText.charAt(index));
                index++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, 12);

        return () => clearInterval(interval);
    }, [selectedTab]);

    const handleSelectTier = (tier: "free" | "pro" | "enterprise") => {
        if (!isAuthenticated) {
            setPlanNotification("გთხოვთ გაიაროთ ავტორიზაცია პაკეტის შესაცვლელად.");
            return;
        }
        updateUserTier(tier);
        setPlanNotification(`🎉 პაკეტი წარმატებით განახლდა: ${tier.toUpperCase()}!`);
    };

    const activePost = SIMULATED_POSTS[selectedTab];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20 relative overflow-hidden">
            {/* Dynamic background lights */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>

            {/* ─── HERO SECTION (padding adjusted to combine with root layout pt-16 offset) ─── */}
            {/* ─── HERO SECTION ─── */}
            <section className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 flex flex-col items-center text-center gap-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-indigo-900/30 bg-indigo-950/30 text-indigo-400 text-[10px] font-bold uppercase tracking-wider hover:border-indigo-500/50 hover:bg-indigo-950/50 transition-all duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    GoniFlow სარეკლამო პლატფორმა
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
                    შექმენი სარეკლამო პოსტები <br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                        AI-ის მეშვეობით
                    </span>{" "}
                    წამებში
                </h1>

                <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
                    GoniFlow Ads გეხმარებათ შექმნათ, გააუმჯობესოთ და დაგეგმოთ მულტი-პლატფორმული სარეკლამო პოსტები.
                    მიიღეთ რეალური Live Preview, ჩართულობის ქულის შეფასება და განრიგის კალენდარი ერთ სივრცეში.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
                    <Link
                        href={isAuthenticated ? "/profile" : "/register"}
                        className="w-full sm:w-auto px-7 py-3.5 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 active:scale-[0.98] text-center"
                    >
                        დაიწყე უფასოდ ⚡
                    </Link>
                    <a
                        href="#pricing"
                        className="w-full sm:w-auto px-7 py-3.5 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all active:scale-[0.98] text-center"
                    >
                        ტარიფების ნახვა
                    </a>
                </div>
            </section>

            {/* ─── FEATURES SECTION (standalone, outside hero) ─── */}
            <section id="features" className="border-t border-slate-900 bg-slate-950/40 scroll-mt-16">
                <div className="max-w-5xl mx-auto px-4 pb-10 md:pb-20 pt-10 md:pt-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-left">
                    {/* Left: Input Console simulator */}
                    <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between border-slate-900/60 shadow-2xl hover:border-slate-800/80 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    AI მართვის პანელი
                                </span>
                                <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    აირჩიეთ პლატფორმა
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {(Object.keys(SIMULATED_POSTS) as Array<keyof typeof SIMULATED_POSTS>).map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedTab(key)}
                                            className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                                selectedTab === key
                                                    ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300 scale-102"
                                                    : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300"
                                            }`}
                                        >
                                            <span className="block text-sm mb-0.5">{SIMULATED_POSTS[key].emoji}</span>
                                            {SIMULATED_POSTS[key].platformName.split(" ")[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    პრომპტი (AI ინსტრუქცია)
                                </label>
                                <div className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs text-slate-300 min-h-[70px]">
                                    დაწერე ყავის ახალი ფილიალის გახსნის პოსტი 20%-იანი ფასდაკლებით
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    ტონი & მოწოდება (CTA)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-xs text-slate-300">
                                        👋 მეგობრული
                                    </div>
                                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-xs text-slate-300">
                                        🔗 {activePost.cta}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400">
                                დააგენერირე Omnipost რეჟიმით 🚀
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Right: Simulated Preview and Evaluator */}
                    <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-4 ">
                        {/* Preview Display */}
                        <div className="md:col-span-7 glass-panel rounded-2xl p-5 border-slate-900/60 shadow-2xl hover:border-slate-800/80 transition-all duration-300 flex flex-col justify-between min-h-[360px]">
                            <div className="space-y-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-base">
                                        {activePost.emoji}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">GoniFlow Coffee</div>
                                        <div className="text-[10px] text-slate-500">რეკლამა / სპონსორირებული</div>
                                    </div>
                                </div>

                                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans min-h-[120px]">
                                    {currentText}
                                    {isTyping && <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-0.5 animate-pulse"></span>}
                                </p>

                                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/60 ">
                                    <div className="aspect-video w-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/50 to-slate-900"></div>
                                        <span className="text-xs font-bold text-slate-600">სარეკლამო სურათი</span>
                                    </div>
                                    <div className="p-3 flex items-center justify-between border-t border-slate-900">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                                {activePost.platformName} სარეკლამო
                                            </div>
                                            <div className="text-xs font-bold text-slate-200 mt-0.5">
                                                {activePost.headline}
                                            </div>
                                        </div>
                                        <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer">
                                            {activePost.cta}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500 border-t border-slate-900/60 pt-3.5 mt-4">
                                <span>👁️ {activePost.metrics.reach} წვდომა</span>
                                <span>👍 {activePost.metrics.likes} მოწონება</span>
                                <span>💬 {activePost.metrics.comments} კომენტარი</span>
                            </div>
                        </div>

                        {/* Analysis Evaluator simulator */}
                        <div className="md:col-span-5 glass-panel rounded-2xl p-5 border-slate-900/60 shadow-2xl hover:border-slate-800/80 transition-all duration-300 flex flex-col justify-between ">
                            <div className="space-y-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                                    ჩართულობის ქულა
                                </span>

                                <div className="flex justify-center py-2">
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        {/* Simulated radial progress */}
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="48" cy="48" r="40" stroke="#0f172a" strokeWidth="6" fill="transparent" />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                stroke="#6366f1"
                                                strokeWidth="6"
                                                fill="transparent"
                                                strokeDasharray={251}
                                                strokeDashoffset={251 - (251 * activePost.score) / 100}
                                                className="transition-all duration-700 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-xl font-black text-slate-200">{activePost.score}%</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                                სტაბილური
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        ანალიზი და რეკომენდაციები
                                    </span>
                                    <div className="space-y-1.5">
                                        {activePost.tips.map((tip, idx) => (
                                            <div key={idx} className="text-[10px] text-slate-400 font-medium">
                                                {tip}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-[9px] font-bold text-slate-500 leading-relaxed mt-4">
                                💡 AI-ის რეკომენდაციით, მოცემული ტექსტის სტილი გაზრდის ჩართულობას 15%-ით.
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </section>

            {/* ─── PRICING SECTION ─── */}
            <section id="pricing" className="pb-5 md:pb-10 pt-2 md:pt-5 border-t border-slate-900 bg-slate-950/40 relative scroll-mt-16">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">ტარიფები</span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold">მარტივი ფასები ყველასთვის</h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                            აირჩიეთ თქვენზე მორგებული პაკეტი და დაიწყეთ კონტენტის პროფესიონალური გენერაცია.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Free Tier */}
                        <div className={`glass-panel rounded-3xl p-8 flex flex-col justify-between border-slate-900 transition-all duration-300 ${
                            activeTier === "free"
                                ? "opacity-60 pointer-events-none scale-98 shadow-inner"
                                : "hover:border-slate-800 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/[0.02]"
                        }`}>
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-200">უფასო</h3>
                                        <p className="text-xs text-slate-500 mt-1">საწყისი ტესტირებისთვის</p>
                                    </div>
                                    {activeTier === "free" && (
                                        <span className="text-[9px] font-black uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                                            აქტიური
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-100">0 ₾</span>
                                    <span className="text-xs text-slate-500 font-semibold">/თვეში</span>
                                </div>
                                <ul className="space-y-3.5 pt-4 border-t border-slate-900">
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> 5 AI გენერაცია თვეში
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> ძირითადი Live Preview
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> 1 აქტიური პროექტი
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => handleSelectTier("free")}
                                disabled={activeTier === "free"}
                                className={`w-full mt-8 py-3 text-xs font-bold rounded-xl transition-all text-center block cursor-pointer border ${
                                    activeTier === "free"
                                        ? "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
                                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300"
                                }`}
                            >
                                {activeTier === "free" ? "აქტიური პაკეტი" : "არჩევა"}
                            </button>
                        </div>

                        {/* Pro Tier (Glowing/Recommended) */}
                        <div className={`glass-panel rounded-3xl p-8 flex flex-col justify-between border-indigo-500/30 shadow-xl relative transition-all duration-300 ${
                            activeTier === "pro"
                                ? "opacity-60 pointer-events-none scale-98 border-slate-900 shadow-inner"
                                : "hover:border-indigo-500/50 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/[0.04]"
                        }`}>
                            <div className="absolute top-0 right-8 transform -translate-y-1/2">
                                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-indigo-500/20 animate-pulse">
                                    რეკომენდებული
                                </span>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-100">პრო (Pro)</h3>
                                        <p className="text-xs text-indigo-400/80 mt-1">აქტიური მარკეტერებისთვის</p>
                                    </div>
                                    {activeTier === "pro" && (
                                        <span className="text-[9px] font-black uppercase bg-indigo-950/30 border border-indigo-900/50 px-2 py-0.5 rounded-full text-indigo-400">
                                            აქტიური
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-100">29 ₾</span>
                                    <span className="text-xs text-slate-500 font-semibold">/თვეში</span>
                                </div>
                                <ul className="space-y-3.5 pt-4 border-t border-slate-900">
                                    <li className="flex items-center gap-2.5 text-xs text-slate-200">
                                        <span className="text-indigo-400 font-bold">✓</span> ულიმიტო AI გენერაცია
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-200">
                                        <span className="text-indigo-400 font-bold">✓</span> Omnipost რეჟიმი (მულტი-პოსტები)
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-200">
                                        <span className="text-indigo-400 font-bold">✓</span> სურათების AI გენერაცია
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-200">
                                        <span className="text-indigo-400 font-bold">✓</span> სრული ჩართულობის ანალიზი
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-200">
                                        <span className="text-indigo-400 font-bold">✓</span> ულიმიტო აქტიური პროექტი
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => handleSelectTier("pro")}
                                disabled={activeTier === "pro"}
                                className={`w-full mt-8 py-3 text-xs font-bold rounded-xl transition-all text-center block cursor-pointer border ${
                                    activeTier === "pro"
                                        ? "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                }`}
                            >
                                {activeTier === "pro" ? "აქტიური პაკეტი" : "არჩევა"}
                            </button>
                        </div>

                        {/* Enterprise Tier */}
                        <div className={`glass-panel rounded-3xl p-8 flex flex-col justify-between border-slate-900 transition-all duration-300 ${
                            activeTier === "enterprise"
                                ? "opacity-60 pointer-events-none scale-98 shadow-inner"
                                : "hover:border-slate-800 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/[0.02]"
                        }`}>
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-200">ბიზნეს</h3>
                                        <p className="text-xs text-slate-500 mt-1">სააგენტოებისა და გუნდებისთვის</p>
                                    </div>
                                    {activeTier === "enterprise" && (
                                        <span className="text-[9px] font-black uppercase bg-purple-950/30 border border-purple-900/50 px-2 py-0.5 rounded-full text-purple-400">
                                            აქტიური
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-100">99 ₾</span>
                                    <span className="text-xs text-slate-500 font-semibold">/თვეში</span>
                                </div>
                                <ul className="space-y-3.5 pt-4 border-t border-slate-900">
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> ყველაფერი Pro პაკეტიდან
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> გუნდური მუშაობის მხარდაჭერა
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> პერსონალური ბრენდინგი
                                    </li>
                                    <li className="flex items-center gap-2.5 text-xs text-slate-400">
                                        <span className="text-indigo-400">✓</span> API წვდომა და 24/7 საპორტი
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => handleSelectTier("enterprise")}
                                disabled={activeTier === "enterprise"}
                                className={`w-full mt-8 py-3 text-xs font-bold rounded-xl transition-all text-center block cursor-pointer border ${
                                    activeTier === "enterprise"
                                        ? "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
                                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300"
                                }`}
                            >
                                {activeTier === "enterprise" ? "აქტიური პაკეტი" : "არჩევა"}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="border-t border-slate-900 py-12 bg-slate-950/90 text-slate-500 text-xs">
                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="font-bold text-slate-300">GoniFlow Ads</div>
                        <div>გონიერი სარეკლამო პოსტები AI-ით.</div>
                    </div>

                    <div className="flex gap-8 text-[11px]">
                        <a href="https://goniflow.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
                            goniflow.com
                        </a>
                        <span className="text-slate-800">|</span>
                        <a href="#" className="hover:text-slate-300 transition-colors">
                            წესები და პირობები
                        </a>
                        <span className="text-slate-800">|</span>
                        <a href="#" className="hover:text-slate-300 transition-colors">
                            კონფიდენციალურობა
                        </a>
                    </div>

                    <div>
                        © {new Date().getFullYear()} GoniFlow. ყველა უფლება დაცულია.
                    </div>
                </div>
            </footer>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full border border-indigo-500/20 bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer animate-fade-in"
                    title="საწყისზე დაბრუნება"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                </button>
            )}

            {/* Plan Notification Modal */}
            {planNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl text-center space-y-4 animate-scale-in">
                        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl text-indigo-400">
                            🚀
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{planNotification}</p>
                        <button
                            onClick={() => setPlanNotification(null)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors"
                        >
                            გასაგებია
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
