"use client";

import React, { useState } from "react";
import { Project, SavedAd } from "../../store/projectStore";
import SocialPreview from "../SocialPreview";
import { apiFetch } from "../../utils/api";

interface LibraryTabProps {
    activeTab: string;
    activeProject: Project | null;
    savedAds: SavedAd[];
    deleteSavedAd: (projectId: string, adId: string) => Promise<void>;
    handleLoadAdToGenerator: (ad: SavedAd) => void;
    showNotification: (type: "success" | "error", message: string) => void;
    setPlatform: (platform: string) => void;
    setActiveTab: (tab: string) => void;
    userEmail: string;
    resetEditorState: () => void;
}

interface SocialAccount {
    platform: string;
    access_token: string;
    platform_account_id?: string;
    account_id?: string;
}

export default function LibraryTab({
    activeTab,
    activeProject,
    savedAds,
    deleteSavedAd,
    handleLoadAdToGenerator,
    showNotification,
    setPlatform,
    setActiveTab,
    userEmail,
    resetEditorState
}: LibraryTabProps) {
    const [activeShareMenuId, setActiveShareMenuId] = useState<string | null>(null);

    const currentPlatformId = activeTab.replace("saved-", "");

    const PLAT_META: Record<string, { label: string; icon: string; headerBg: string; badge: string; editBtn: string }> = {
        facebook:  { label: "Facebook",  icon: "🔵", headerBg: "bg-blue-500/8 border-blue-500/20",  badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",  editBtn: "border-blue-700/40 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40" },
        instagram: { label: "Instagram", icon: "📸", headerBg: "bg-pink-500/8 border-pink-500/20",  badge: "bg-pink-500/15 text-pink-400 border-pink-500/30",  editBtn: "border-pink-700/40 bg-pink-950/30 text-pink-300 hover:bg-pink-900/40" },
        linkedin:  { label: "LinkedIn",  icon: "💼", headerBg: "bg-teal-500/8 border-teal-500/20",  badge: "bg-teal-500/15 text-teal-400 border-teal-500/30",  editBtn: "border-teal-700/40 bg-teal-950/30 text-teal-300 hover:bg-teal-900/40" },
        x:         { label: "X (Twitter)",icon: "🐦", headerBg: "bg-slate-700/15 border-slate-600/30", badge: "bg-slate-700/30 text-slate-300 border-slate-600/40", editBtn: "border-slate-600/40 bg-slate-800/30 text-slate-300 hover:bg-slate-700/40" },
    };

    const filteredAds = savedAds.filter((ad) => ad.platform === currentPlatformId);
    const meta = PLAT_META[currentPlatformId] || PLAT_META["facebook"];

    const handleDirectPublish = async (ad: SavedAd): Promise<boolean> => {
        if (!userEmail) {
            showNotification("error", "მომხმარებელი არ არის ავტორიზებული.");
            return false;
        }

        try {
            showNotification("success", "მიმდინარეობს პირდაპირი გამოქვეყნება...");

            // Get tokens
            const { data: accounts } = await apiFetch(`/api/social/accounts?email=${encodeURIComponent(userEmail)}`);
            if (!accounts || accounts.length === 0) return false;

            const account = accounts.find((a: SocialAccount) => a.platform === currentPlatformId);
            if (!account || !account.access_token) return false;

            const payload = {
                text: `${ad.text}\n\n${ad.cta || ""}`.trim(),
                image_url: ad.image_url,
                access_token: account.access_token,
                platform_account_id: account.platform_account_id || account.account_id
            };

            const { error } = await apiFetch(`/api/social/publish/${currentPlatformId}`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (error) throw new Error(error);

            showNotification("success", "პოსტი წარმატებით გამოქვეყნდა პლატფორმაზე!");
            return true;
        } catch (error) {
            console.error("Direct publish error:", error);
            return false; // Fallback to manual share
        }
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Header */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between ${meta.headerBg}`}>
                <div className="flex items-center gap-4">
                    <div className="text-4xl">{meta.icon}</div>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {meta.label} ბიბლიოთეკა
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">შენახული პოსტები - {activeProject?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${meta.badge}`}>
                        {filteredAds.length} პოსტი
                    </div>
                    <button
                        onClick={() => {
                            resetEditorState();
                            setPlatform(currentPlatformId);
                            setActiveTab("generator");
                        }}
                        className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/10"
                    >
                        ✨ ახალი პოსტი
                    </button>
                </div>
            </div>

            {filteredAds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-700/50 rounded-3xl bg-slate-900/20">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl mb-4 opacity-50">
                        {meta.icon}
                    </div>
                    <h3 className="text-slate-300 font-bold text-lg mb-2">ჯერ პოსტები არ გაქვთ</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">
                        შექმენით თქვენი პირველი {meta.label} პოსტი გენერატორის გამოყენებით.
                    </p>
                    <button
                        onClick={() => {
                            resetEditorState();
                            setPlatform(currentPlatformId);
                            setActiveTab("generator");
                        }}
                        className="mt-1 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/10"
                    >
                        🚀 პოსტის შექმნა
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
                    {filteredAds.map((ad: SavedAd) => (
                        <div
                            key={ad.id}
                            className="group glass-panel rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl hover:shadow-black/40"
                            style={{ height: "420px" }}
                        >
                            {/* Inner content wrapper — slides UP by 56px on hover, becomes scrollable */}
                            <div
                                className="absolute inset-0 transition-transform duration-300 ease-in-out group-hover:-translate-y-14 overflow-hidden group-hover:overflow-y-auto"
                                style={{ scrollbarWidth: "none" }}
                            >
                                <div className="w-full relative">
                                    <SocialPreview
                                        platform={currentPlatformId}
                                        ad={{
                                            text: ad.text,
                                            headline: ad.headline || "",
                                            cta: ad.cta || "",
                                            imageUrl: ad.image_url || "",
                                            hashtags: []
                                        }}
                                        userEmail={userEmail || ""}
                                    />
                                </div>
                            </div>

                            {/* Top fade — appears on hover to soften the clipped top edge */}
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#0a0e1a]/90 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Bottom fade — smooth transition into button bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ bottom: "56px" }} />

                            {/* Default bottom fade — visible only when NOT hovered */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10 group-hover:opacity-0 transition-opacity duration-300" />

                            {/* Button bar — starts below the card, slides UP into the card on hover */}
                            <div className="absolute bottom-0 left-0 right-0 h-14 bg-slate-950 flex items-center gap-1.5 px-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-20">
                                {/* Edit */}
                                <button
                                    onClick={() => handleLoadAdToGenerator(ad)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 text-[11px] font-bold rounded-xl border transition-all ${meta.editBtn}`}
                                >
                                    ✏️ რედაქტირება
                                </button>

                                {/* Share */}
                                <div className="flex-1 relative h-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveShareMenuId(activeShareMenuId === ad.id ? null : ad.id);
                                        }}
                                        className="w-full h-full flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl border border-indigo-700/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 transition-all"
                                    >
                                        🔗 გაზიარება
                                    </button>

                                    {activeShareMenuId === ad.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-30"
                                                onClick={(e) => { e.stopPropagation(); setActiveShareMenuId(null); }}
                                            />
                                            <div className="absolute bottom-full mb-2 left-0 right-0 z-40 rounded-xl border border-slate-800 bg-[#090d16]/95 backdrop-blur-md p-1.5 shadow-2xl space-y-1 text-left min-w-[140px]">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const ok = await handleDirectPublish(ad);
                                                        if (!ok) window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(ad.text + (ad.cta ? "\n" + ad.cta : ""))}`, "_blank");
                                                        setActiveShareMenuId(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                                >
                                                    🐦 X (Twitter)-ზე
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const ok = await handleDirectPublish(ad);
                                                        if (!ok) {
                                                            navigator.clipboard.writeText(`${ad.text}\n\n${ad.cta || ""}`);
                                                            showNotification("success", "ტექსტი კოპირებულია! ჩასვით გაზიარების ველში.");
                                                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeProject?.link || "https://goniflow.ge")}`, "_blank");
                                                        }
                                                        setActiveShareMenuId(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                                >
                                                    🔵 Facebook-ზე
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const ok = await handleDirectPublish(ad);
                                                        if (!ok) {
                                                            navigator.clipboard.writeText(`${ad.text}\n\n${ad.cta || ""}`);
                                                            showNotification("success", "ტექსტი კოპირებულია! ჩასვით გაზიარების ველში.");
                                                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeProject?.link || "https://goniflow.ge")}`, "_blank");
                                                        }
                                                        setActiveShareMenuId(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                                >
                                                    💼 LinkedIn-ზე
                                                </button>
                                                {typeof navigator !== "undefined" && navigator.share && (
                                                    <>
                                                        <div className="border-t border-slate-800 my-1"></div>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await navigator.share({
                                                                        title: ad.headline || "GoniFlow Post",
                                                                        text: `${ad.text}\n\n${ad.cta || ""}`,
                                                                        url: activeProject?.link || window.location.origin
                                                                    });
                                                                    showNotification("success", "წარმატებით გაზიარდა!");
                                                                } catch { /* cancelled */ }
                                                                setActiveShareMenuId(null);
                                                            }}
                                                            className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-950/20 rounded-lg transition-colors flex items-center gap-1.5"
                                                        >
                                                            📱 სხვა აპლიკაციით
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Copy */}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${ad.text}\n\n${ad.cta || ""}`);
                                        showNotification("success", "ტექსტი წარმატებით კოპირდა!");
                                    }}
                                    className="h-10 w-10 text-slate-300 hover:text-white transition-all rounded-xl border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/60 flex items-center justify-center shrink-0"
                                    title="კოპირება"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => activeProject && deleteSavedAd(activeProject.id, ad.id)}
                                    className="h-10 w-10 text-slate-600 hover:text-rose-400 transition-all rounded-xl border border-slate-800 hover:bg-rose-950/30 hover:border-rose-900/50 flex items-center justify-center shrink-0"
                                    title="წაშლა"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
