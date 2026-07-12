"use client";
import React, { useRef, useState, useEffect } from "react";
import { useProjectStore, Project, SavedAd } from "../../store/projectStore";
import { generateMockAd, GeneratedAd } from "../../utils/mockGenerator";
import SocialPreview from "../SocialPreview";
import { CalendarEvent } from "../GoniflowCalendar";
import { uploadImage } from "../../utils/uploadImage";
import { apiFetch } from "../../utils/api";
import { evaluateEngagement } from "../../utils/engagementEvaluator";

interface GeneratorTabProps {
    activeProject: Project | null;
    openCreateModal: () => void;
    userEmail: string;
    saveAd: (projectId: string, ad: Omit<SavedAd, "id" | "project_id">) => Promise<void>;
    showNotification: (type: "success" | "error", message: string) => void;
    setActiveTab: (tab: string) => void;

    // Inputs & state passed down from parent
    prompt: string;
    setPrompt: (val: string) => void;
    imagePrompt: string;
    setImagePrompt: (val: string) => void;
    platform: string;
    setPlatform: (val: string) => void;
    tone: string;
    setTone: (val: string) => void;
    uploadedImage: string | null;
    setUploadedImage: (val: string | null) => void;
    uploadedImageName: string | null;
    setUploadedImageName: (val: string | null) => void;
    generatedAd: GeneratedAd | null;
    setGeneratedAd: (ad: GeneratedAd | null) => void;

    // Calendar integrations
    scheduleTargetDate: string | null;
    setScheduleTargetDate: (date: string | null) => void;
    editingCalendarEvent: CalendarEvent | null;
    setEditingCalendarEvent: (event: CalendarEvent | null) => void;
    handleCalendarAddEvent: (ev: Omit<CalendarEvent, "id">) => void;
    handleCalendarUpdateEvent: (id: string, changes: Partial<CalendarEvent>) => void;
}

export default function GeneratorTab({
    activeProject,
    openCreateModal,
    userEmail,
    saveAd,
    showNotification,
    setActiveTab,

    prompt,
    setPrompt,
    imagePrompt,
    setImagePrompt,
    platform,
    setPlatform,
    tone,
    setTone,
    uploadedImage,
    setUploadedImage,
    uploadedImageName,
    setUploadedImageName,
    generatedAd,
    setGeneratedAd,

    scheduleTargetDate,
    setScheduleTargetDate,
    editingCalendarEvent,
    setEditingCalendarEvent,
    handleCalendarAddEvent,
    handleCalendarUpdateEvent
}: GeneratorTabProps) {
    const { isBackendConnected, checkBackendConnection } = useProjectStore();

    // AI Connection checking on mount
    useEffect(() => {
        checkBackendConnection();
    }, [checkBackendConnection]);

    // AI Prompt Enhancer States
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [enhancedPrompt, setEnhancedPrompt] = useState("");
    const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false);

    // Multi-Platform Omnipost States
    const [isOmnipostMode, setIsOmnipostMode] = useState(false);
    const [omnipostPlatforms, setOmnipostPlatforms] = useState<string[]>(["facebook", "instagram"]);
    const [omnipostAds, setOmnipostAds] = useState<Record<string, GeneratedAd>>({});

    // Call to Action (CTA) States
    const [ctaType, setCtaType] = useState("გაიგე მეტი");
    const [customCta, setCustomCta] = useState("");

    const enhancePromptOffline = (original: string, plat: string, t: string) => {
        const clean = original.trim();
        if (!clean) return "";
        const platformLabel = plat === "facebook" ? "Facebook" : plat === "instagram" ? "Instagram" : plat === "linkedin" ? "LinkedIn" : "X (Twitter)";
        let toneAdvice = "";
        if (t === "professional") {
            toneAdvice = "პროფესიონალური, საქმიანი და სანდო ფორმატით, რომელიც ორიენტირებულია ხარისხზე, B2B პარტნიორებზე ან პროფესიონალ მომხმარებლებზე.";
        } else if (t === "friendly") {
            toneAdvice = "თბილი, მეგობრული და ემოციური ფორმატით, რომელიც აახლოებს ბრენდს მომხმარებელთან და ხელს უწყობს თბილი საზოგადოების შექმნას.";
        } else {
            toneAdvice = "იუმორისტული, მახვილგონივრული და მსუბუქი სტილით, რომელიც მარტივად იპყრობს ყურადღებას და იწვევს პოზიტიურ ემოციებს.";
        }
        return `დაწერე პოსტი თემაზე: "${clean}".\nტექსტი უნდა იყოს ${toneAdvice}\nგამოიყენე შესაბამისი emoji-ები ზომიერად. ბოლოში დაურთე სამოქმედო მოწოდება (CTA) და 3-4 პოპულარული ჰეშთეგი.`;
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancingPrompt(true);
        try {
            const { data } = await apiFetch("/ai/enhance-prompt", {
                method: "POST",
                body: JSON.stringify({ prompt, platform, tone })
            });
            setEnhancedPrompt(data.enhancedPrompt);
            setIsEnhanceModalOpen(true);
        } catch {
            const mockEnhanced = enhancePromptOffline(prompt, platform, tone);
            setEnhancedPrompt(mockEnhanced);
            setIsEnhanceModalOpen(true);
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("12:00");

    const handleConfirmSchedule = async () => {
        if (!scheduleDate || !scheduleTime || !generatedAd) return;
        const startISO = `${scheduleDate}T${scheduleTime}:00`;
        
        // Prevent scheduling in the past
        const selectedDateTime = new Date(startISO);
        const now = new Date();
        if (selectedDateTime < now) {
            showNotification("error", "წარსულ თარიღში ან დროში პოსტის დაგეგმვა შეუძლებელია!");
            return;
        }

        try {
            await handleCalendarAddEvent({
                title: generatedAd.headline || platform,
                start: startISO,
                platform,
                tone,
                headline: generatedAd.headline || "",
                text: generatedAd.text,
                cta: generatedAd.cta || "",
                allDay: false,
            });
            setIsScheduling(false);
        } catch {
            showNotification("error", "შეცდომა განრიგში დამატებისას.");
        }
    };

    const handleDownload = async () => {
        if (!generatedAd || !generatedAd.imageUrl) return;
        try {
            const response = await fetch(generatedAd.imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `goniflow-${platform}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification("success", "სურათი წარმატებით ჩამოიტვირთა!");
        } catch {
            window.open(generatedAd.imageUrl, "_blank");
        }
    };
    // Image upload state
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Image upload handlers
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingImageFile(file);       // Keep File reference for later upload
            setUploadedImageUrl(null);       // Reset any previous upload URL
            setUploadedImageName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string); // Local preview only
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setUploadedImage(null);
        setUploadedImageName(null);
        setPendingImageFile(null);
        setUploadedImageUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const [isImageSectionOpen, setIsImageSectionOpen] = useState(
        !!uploadedImage || !!generatedAd?.imageUrl || !!imagePrompt
    );
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const handleGenerateText = async () => {
        if (!activeProject) return;
        setIsGenerating(true);

        const targets = isOmnipostMode ? omnipostPlatforms : [platform];
        const results: Record<string, GeneratedAd> = {};

        for (const plat of targets) {
            const mockResult = generateMockAd({
                textPrompt: prompt,
                imagePrompt: "",
                platform: plat,
                tone,
                projectName: activeProject.name,
                projectDescription: activeProject.description,
                projectLink: activeProject.link,
            });

            try {
                const { data } = await apiFetch(`/projects/${activeProject.id}/generate`, {
                    method: "POST",
                    body: JSON.stringify({
                        platform: plat,
                        tone,
                        textPrompt: prompt || undefined,
                    }),
                });

                results[plat] = {
                    headline: data.headline,
                    text: data.text,
                    cta: data.cta,
                    hashtags: data.hashtags || [],
                    imageUrl: uploadedImage || data.imageUrl || mockResult.imageUrl,
                };
            } catch {
                results[plat] = {
                    ...mockResult,
                    imageUrl: uploadedImage || mockResult.imageUrl,
                };
            }
        }

        setOmnipostAds(results);

        const primaryPlat = targets[0];
        if (primaryPlat && results[primaryPlat]) {
            const res = results[primaryPlat];
            const hashtagsText = res.hashtags && res.hashtags.length > 0
                ? "\n\n" + res.hashtags.join(" ")
                : "";
            setPrompt(res.text + hashtagsText);
            setGeneratedAd(res);

            if (res.cta) {
                const standardCtas = ["გაიგე მეტი", "მოგვწერეთ", "დარეკეთ", "დაჯავშნეთ", "რეგისტრაცია", "შეიძინეთ"];
                if (standardCtas.includes(res.cta)) {
                    setCtaType(res.cta);
                } else {
                    setCtaType("custom");
                    setCustomCta(res.cta);
                }
            }
        }

        setIsGenerating(false);
    };

    const handleGenerateImage = async () => {
        if (!activeProject) return;
        setIsGeneratingImage(true);

        const chosenImagePrompt = imagePrompt.trim() || prompt.trim();

        const mockResult = generateMockAd({
            textPrompt: prompt,
            imagePrompt: chosenImagePrompt,
            platform,
            tone,
            projectName: activeProject.name,
            projectDescription: activeProject.description,
            projectLink: activeProject.link,
        });

        try {
            const { data } = await apiFetch(`/projects/${activeProject.id}/generate`, {
                method: "POST",
                body: JSON.stringify({
                    platform,
                    tone,
                    textPrompt: prompt || undefined,
                    imagePrompt: chosenImagePrompt || undefined,
                }),
            });

            const currentAd = generatedAd || {
                text: prompt,
                headline: activeProject.name || "",
                cta: "გაიგე მეტი",
                hashtags: [],
            };

            const imageUrl = data.imageUrl || mockResult.imageUrl;
            setGeneratedAd({
                ...currentAd,
                imageUrl,
            });

            setOmnipostAds(prev => {
                const updated = { ...prev };
                for (const plat in updated) {
                    updated[plat] = {
                        ...updated[plat],
                        imageUrl,
                    };
                }
                return updated;
            });
        } catch {
            const currentAd = generatedAd || {
                text: prompt,
                headline: activeProject.name || "",
                cta: "გაიგე მეტი",
                hashtags: [],
            };

            const imageUrl = mockResult.imageUrl;
            setGeneratedAd({
                ...currentAd,
                imageUrl,
            });

            setOmnipostAds(prev => {
                const updated = { ...prev };
                for (const plat in updated) {
                    updated[plat] = {
                        ...updated[plat],
                        imageUrl,
                    };
                }
                return updated;
            });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleDirectAddToCalendar = () => {
        if (!scheduleTargetDate) return;

        handleCalendarAddEvent({
            title: generatedAd?.headline || platform,
            start: scheduleTargetDate,
            platform,
            tone,
            headline: generatedAd?.headline || "",
            text: prompt.trim() || `${platform.toUpperCase()} ჩანაწერი`,
            cta: generatedAd?.cta || "",
            allDay: false,
        });

        // Reset inputs and return to calendar
        setScheduleTargetDate(null);
        setPrompt("");
        setImagePrompt("");
        setUploadedImage(null);
        setUploadedImageName(null);
        setGeneratedAd(null);
        setActiveTab("calendar");
    };

    const handleUpdateCalendarEventFromEdit = () => {
        if (!editingCalendarEvent) return;

        handleCalendarUpdateEvent(editingCalendarEvent.id, {
            platform,
            tone,
            headline: generatedAd?.headline || editingCalendarEvent.headline || "",
            text: prompt.trim() || `${platform.toUpperCase()} ჩანაწერი`,
            cta: generatedAd?.cta || editingCalendarEvent.cta || "",
        });

        // Reset inputs and return to calendar
        setEditingCalendarEvent(null);
        setPrompt("");
        setImagePrompt("");
        setUploadedImage(null);
        setUploadedImageName(null);
        setGeneratedAd(null);
        setActiveTab("calendar");
        showNotification("success", "განრიგის ჩანაწერი წარმატებით განახლდა!");
    };

    const handleSave = async () => {
        if (!activeProject) return;

        let finalImageUrl = generatedAd?.imageUrl || "";

        // If user uploaded an image that hasn't been sent to Storage yet — upload now
        if (pendingImageFile && !uploadedImageUrl) {
            setIsUploadingImage(true);
            try {
                const url = await uploadImage(pendingImageFile);
                setUploadedImageUrl(url);
                finalImageUrl = url;
            } catch (err) {
                showNotification("error", `სურათის ატვირთვა ვერ მოხდა: ${(err as Error).message}`);
                setIsUploadingImage(false);
                return;
            }
            setIsUploadingImage(false);
        } else if (uploadedImageUrl) {
            finalImageUrl = uploadedImageUrl;
        }

        const finalCta = ctaType === "custom" ? customCta : ctaType;
        try {
            await saveAd(activeProject.id, {
                platform,
                tone,
                headline: generatedAd?.headline || activeProject.name || "",
                text: prompt,
                cta: finalCta || "გაიგე მეტი",
                image_url: finalImageUrl,
            });
            showNotification("success", "პოსტი წარმატებით შეინახა!");
        } catch {
            showNotification("error", "შეცდომა პოსტის შენახვისას. სცადეთ თავიდან.");
        }
    };

    const handleSavePlatformAd = async (plat: string, ad: GeneratedAd) => {
        if (!activeProject) return;

        let finalImageUrl = ad.imageUrl || "";

        if (pendingImageFile && !uploadedImageUrl) {
            setIsUploadingImage(true);
            try {
                const url = await uploadImage(pendingImageFile);
                setUploadedImageUrl(url);
                finalImageUrl = url;
            } catch (err) {
                showNotification("error", `სურათის ატვირთვა ვერ მოხდა: ${(err as Error).message}`);
                setIsUploadingImage(false);
                return;
            }
            setIsUploadingImage(false);
        } else if (uploadedImageUrl) {
            finalImageUrl = uploadedImageUrl;
        }

        const finalCta = ctaType === "custom" ? customCta : ctaType;
        try {
            await saveAd(activeProject.id, {
                platform: plat,
                tone,
                headline: ad.headline || activeProject.name || "",
                text: ad.text,
                cta: ad.cta || finalCta || "გაიგე მეტი",
                image_url: finalImageUrl,
            });
            showNotification("success", `${plat.toUpperCase()} პოსტი წარმატებით შეინახა!`);
        } catch {
            showNotification("error", "შეცდომა პოსტის შენახვისას.");
        }
    };

    const handleCopy = async () => {
        const adText = generatedAd?.text || prompt;
        const hashtagsText = generatedAd?.hashtags?.length ? `\n\n${generatedAd.hashtags.join(" ")}` : "";
        const fullText = `${adText}${hashtagsText}`;

        const imageUrl = isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl) : null;

        if (imageUrl) {
            try {
                const imagePromise = new Promise<Blob>((resolve, reject) => {
                    const img = new Image();
                    if (!imageUrl.startsWith("data:")) {
                        img.crossOrigin = "anonymous";
                        img.src = imageUrl.includes("?") ? `${imageUrl}&cors` : `${imageUrl}?cors`;
                    } else {
                        img.src = imageUrl;
                    }
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    resolve(blob);
                                } else {
                                    reject(new Error("Canvas toBlob returned null"));
                                }
                            }, "image/png");
                        } else {
                            reject(new Error("Could not get 2d context"));
                        }
                    };
                    img.onerror = () => {
                        reject(new Error(`Failed to load image at URL: ${imageUrl}`));
                    };
                });

                let item: ClipboardItem;
                try {
                    // Try Promise-based ClipboardItem (Chrome/Safari)
                    item = new ClipboardItem({
                        "image/png": imagePromise,
                        "text/plain": new Blob([fullText], { type: "text/plain" })
                    });
                } catch {
                    // Fallback for Firefox (Resolve Promise first)
                    const blob = await imagePromise;
                    item = new ClipboardItem({
                        "image/png": blob,
                        "text/plain": new Blob([fullText], { type: "text/plain" })
                    });
                }

                await navigator.clipboard.write([item]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error("Clipboard write failed, fallback to text:", err instanceof Error ? err.message : err);
                try {
                    await navigator.clipboard.writeText(fullText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch (fallbackErr) {
                    console.error("Clipboard fallback failed:", fallbackErr);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(fullText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error("Clipboard writeText failed:", err);
            }
        }
    };

    const handleShare = async () => {
        const shareAd = generatedAd || { text: prompt, hashtags: [], cta: "", headline: "" };
        const startTime = Date.now();
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                const imageUrl = isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl) : null;
                if (imageUrl) {
                    try {
                        const res = await fetch(imageUrl);
                        const blob = await res.blob();
                        const file = new File([blob], `goniflow-post.png`, { type: "image/png" });
                        
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                title: shareAd.headline || "GoniFlow Post",
                                text: `${shareAd.text}\n\n${shareAd.cta || ""}${activeProject?.link ? '\n\n' + activeProject.link : ''}`,
                                files: [file]
                            });
                            const elapsed = Date.now() - startTime;
                            if (elapsed > 1000) {
                                showNotification("success", "წარმატებით გაზიარდა!");
                            }
                            return;
                        }
                    } catch (fileShareErr) {
                        console.error("File share failed, falling back to text", fileShareErr);
                    }
                }

                await navigator.share({
                    title: shareAd.headline || "GoniFlow Post",
                    text: `${shareAd.text}\n\n${shareAd.cta || ""}${activeProject?.link ? '\n\n' + activeProject.link : ''}`
                });
                const elapsed = Date.now() - startTime;
                if (elapsed > 1000) {
                    showNotification("success", "წარმატებით გაზიარდა!");
                }
            } else {
                navigator.clipboard.writeText(`${shareAd.text}\n\n${shareAd.cta || ""}${activeProject?.link ? '\n\n' + activeProject.link : ''}`);
                showNotification("success", "პოსტის ტექსტი კოპირებულია ბუფერში!");
            }
        } catch {
            // cancelled
        }
    };

    const handleResetAll = () => {
        setPrompt("");
        setImagePrompt("");
        setUploadedImage(null);
        setUploadedImageName(null);
        setPendingImageFile(null);
        setUploadedImageUrl(null);
        setScheduleTargetDate(null);
        setEditingCalendarEvent(null);
        setGeneratedAd(null);
        setIsImageSectionOpen(false);
    };

    if (!activeProject) {
        return (
            <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto space-y-6">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">საქმიანობის პროფილი არ არსებობს</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">პოსტების გენერირებისთვის ჯერ უნდა შექმნათ მინიმუმ ერთი საქმიანობა (პროექტი), სადაც მიუთითებთ ვებსაიტს, აღწერასა და ლოგოს.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg transition-all"
                >
                    ➕ პირველი საქმიანობის შექმნა
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start h-full">
            {/* Left: Input Form */}
            <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* ── Calendar target date banner ── */}
                {scheduleTargetDate && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 animate-pulse-once">
                        <span className="text-emerald-400">📅</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-emerald-300">კალენდარში დამატება:</p>
                            <p className="text-[10px] text-emerald-400/70">
                                {new Date(scheduleTargetDate).toLocaleDateString("ka-GE", { day: "numeric", month: "long", year: "numeric" })}
                                {" "}
                                {new Date(scheduleTargetDate).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        <button
                            onClick={() => setScheduleTargetDate(null)}
                            className="text-emerald-600 hover:text-emerald-400 transition-colors text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Calendar edit event banner ── */}
                {editingCalendarEvent && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/8 animate-pulse-once">
                        <span className="text-indigo-400">✏️</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-indigo-300">განრიგის ჩანაწერის რედაქტირება:</p>
                            <p className="text-[10px] text-indigo-400/70">
                                {new Date(editingCalendarEvent.start).toLocaleDateString("ka-GE", { day: "numeric", month: "long", year: "numeric" })}
                                {" "}
                                {new Date(editingCalendarEvent.start).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingCalendarEvent(null);
                                setPrompt("");
                            }}
                            className="text-indigo-600 hover:text-indigo-400 transition-colors text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-white">პოსტის შექმნა</h2>
                        {isBackendConnected ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="ბექენდ სერვერი აქტიურია">
                                🟢 Real AI Mode
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20" title="ბექენდი მიუწვდომელია. გამოიყენება კლიენტის მხარის AI იმიტაცია.">
                                🟡 Offline AI Mode (Fallback)
                            </span>
                        )}
                    </div>
                    {/* Omnipost Switch */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[10px] font-bold text-slate-400">Omnipost რეჟიმი:</span>
                        <input
                            type="checkbox"
                            checked={isOmnipostMode}
                            onChange={(e) => {
                                setIsOmnipostMode(e.target.checked);
                                if (!e.target.checked) {
                                    setOmnipostAds({});
                                }
                            }}
                            className="sr-only peer"
                        />
                        <div className="relative w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Smart Mode Indicator */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {prompt.trim() ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">📝 ტექსტი: აქტიური</span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-500 border border-slate-700/40">✨ ტექსტი: ცარიელი</span>
                    )}
                    <span className="text-slate-800">·</span>
                    {uploadedImage ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">📸 სური.: ატვირთული</span>
                    ) : generatedAd?.imageUrl ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">🎨 სური.: გენერირებული</span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-500 border border-slate-700/40">🖼️ სური.: სტოკი</span>
                    )}
                </div>

                {/* ── PLATFORM, TONE & CTA DROPDOWNS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:max-[1250px]:gap-1">
                    <div className="space-y-1.5">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">სოციალური<br className="hidden lg:block xl:hidden" />ქსელი</label>
                        {isOmnipostMode ? (
                            <div className="flex items-center gap-3 flex-wrap py-2 px-3 rounded-xl border border-slate-800 bg-slate-950/50">
                                {[
                                    { id: "facebook", label: "Facebook", emoji: "📘" },
                                    { id: "instagram", label: "Instagram", emoji: "📸" },
                                    { id: "linkedin", label: "LinkedIn", emoji: "💼" },
                                    { id: "x", label: "X", emoji: "🐦" },
                                ].map((p) => {
                                    const isChecked = omnipostPlatforms.includes(p.id);
                                    return (
                                        <label key={p.id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    if (isChecked) {
                                                        if (omnipostPlatforms.length > 1) {
                                                            setOmnipostPlatforms(omnipostPlatforms.filter(id => id !== p.id));
                                                        }
                                                    } else {
                                                        setOmnipostPlatforms([...omnipostPlatforms, p.id]);
                                                    }
                                                }}
                                                className="accent-indigo-500 rounded border-slate-800 bg-slate-950"
                                            />
                                            <span>{p.emoji} {p.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <select
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className="w-full px-1 sm:px-2 lg:px-3 lg:max-[1250px]:px-0.5 py-2 sm:py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-[11px] sm:text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                            >
                                <option value="facebook">📘 Facebook</option>
                                <option value="instagram">📸 Instagram</option>
                                <option value="linkedin">💼 LinkedIn</option>
                                <option value="x">🐦 X (Twitter)</option>
                            </select>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">ტონი<br className="hidden lg:block xl:hidden" />(Tone of Voice)</label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full px-1 sm:px-2 lg:px-3 lg:max-[1250px]:px-0.5 py-2 sm:py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-[11px] sm:text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="professional">💼 საქმიანი</option>
                            <option value="friendly">👋 მეგობრული</option>
                            <option value="funny">😎 ხუმარა</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">მოწოდება<br className="hidden lg:block xl:hidden" />(CTA)</label>
                        <select
                            value={ctaType}
                            onChange={(e) => setCtaType(e.target.value)}
                            className="w-full px-1 sm:px-2 lg:px-3 lg:max-[1250px]:px-0.5 py-2 sm:py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-[11px] sm:text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="გაიგე მეტი">🔗 გაიგე მეტი</option>
                            <option value="მოგვწერეთ">💬 მოგვწერეთ</option>
                            <option value="დარეკეთ">📞 დარეკეთ</option>
                            <option value="დაჯავშნეთ">📅 დაჯავშნეთ</option>
                            <option value="რეგისტრაცია">👤 რეგისტრაცია</option>
                            <option value="შეიძინეთ">🛒 შეიძინეთ</option>
                            <option value="custom">✍️ სხვა (ჩაწერეთ)...</option>
                        </select>
                    </div>
                </div>

                {ctaType === "custom" && (
                    <div className="space-y-1.5 animate-fade-in">
                        <label htmlFor="custom-cta" className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">საკუთარი მოწოდება მოქმედებისკენ (CTA)</label>
                        <input
                            id="custom-cta"
                            type="text"
                            value={customCta}
                            onChange={(e) => setCustomCta(e.target.value)}
                            placeholder="მაგ: შემოგვიერთდით"
                            className="w-full px-1 sm:px-2 lg:px-3 lg:max-[1250px]:px-0.5 py-2 sm:py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-[11px] sm:text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                )}

                {/* ── TEXT INPUT SECTION ── */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="text-prompt" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <span>📝</span> პოსტის თემატიკა / ტექსტი
                        </label>
                        <div className="flex items-center gap-2">
                            {prompt.trim() && (
                                <button
                                    type="button"
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancingPrompt}
                                    className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-bold text-slate-400 hover:border-indigo-500/40 hover:text-indigo-400 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    {isEnhancingPrompt ? (
                                        <>
                                            <svg className="animate-spin h-2.5 w-2.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            მუშავდება...
                                        </>
                                    ) : (
                                        <>✨ გააუმჯობესე</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <textarea
                        id="text-prompt"
                        rows={5}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="შეიყვანეთ პოსტის თემატიკა (მაგ: საცხობის გახსნა) ან პირდაპირ ჩაწერეთ პოსტის ტექსტი..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 text-slate-100 placeholder-slate-600 shadow-inner outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 text-sm leading-relaxed"
                    />
                </div>

                {/* Actions Panel (Symmetric 50/50 flex-1) */}
                <div className="flex gap-3 w-full min-[1022px]:max-[1084px]:gap-1">
                    {/* Generate Text Button */}
                    <button
                        onClick={handleGenerateText}
                        disabled={isGenerating || !activeProject}
                        className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] min-[1022px]:max-[1084px]:text-[10px] py-2 px-0.5 rounded-lg shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 min-[1022px]:max-[1084px]:gap-1 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                გენერირდება...
                            </>
                        ) : (
                            <>✍️ ტექსტის გენერირება</>
                        )}
                    </button>
                    {/* Clear Button */}
                    <button
                        type="button"
                        onClick={handleResetAll}
                        className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-rose-400 font-bold text-[11px] min-[1022px]:max-[1084px]:text-[10px] py-2 px-0.5 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                        title="ყველაფრის გასუფთავება"
                    >
                        🗑️ გასუფთავება
                    </button>
                </div>

                {/* Image toggle button */}
                <div className="flex justify-start">
                    <button
                        type="button"
                        onClick={() => {
                            if (isImageSectionOpen) {
                                handleRemoveImage();
                                setImagePrompt("");
                                if (generatedAd) {
                                    setGeneratedAd({
                                        ...generatedAd,
                                        imageUrl: ""
                                    });
                                }
                            }
                            setIsImageSectionOpen(!isImageSectionOpen);
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                            isImageSectionOpen
                                ? "border-rose-950 bg-rose-950/20 text-rose-400 hover:bg-rose-950/30"
                                : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700"
                        }`}
                    >
                        {isImageSectionOpen ? "✕ სურათის წაშლა" : "➕ სურათის დამატება"}
                    </button>
                </div>

                {/* ── IMAGE SECTION (EXPANDABLE) ── */}
                {isImageSectionOpen && (
                    <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/20 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <span>🖼️</span> სურათის მართვა
                            </label>
                        </div>

                        {/* Unified Input Container */}
                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 space-y-2.5 focus-within:border-rose-500/40 transition-colors">
                            {/* Textarea for Image Prompt */}
                            <textarea
                                id="image-prompt"
                                rows={2}
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder="სურათის გენერაციის ინსტრუქცია... (თუ ცარიელს დატოვებთ, სურათი შეიქმნება პოსტის ტექსტის მიხედვით)"
                                className="w-full bg-transparent text-slate-100 placeholder-slate-600 outline-none resize-none text-xs leading-relaxed"
                            />

                            {/* Optional Uploaded Image Thumbnail Preview */}
                            {uploadedImage && (
                                <div className="relative inline-flex items-center gap-2 p-1.5 rounded-lg border border-amber-800/30 bg-amber-950/15 max-w-xs animate-fade-in">
                                    <img
                                        src={uploadedImage}
                                        alt="Uploaded thumbnail"
                                        className="w-10 h-10 rounded-md object-cover border border-amber-800/20"
                                    />
                                    <div className="min-w-0 pr-6">
                                        <p className="text-[10px] font-semibold text-slate-200 truncate">{uploadedImageName}</p>
                                        <p className="text-[9px] text-amber-400 font-bold">ატვირთული</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-1 right-1 h-4.5 w-4.5 rounded-md hover:bg-rose-950/50 hover:text-rose-400 text-slate-500 text-[10px] flex items-center justify-center transition-all"
                                        title="წაშლა"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Input Action Bar */}
                            <div className="flex gap-2 w-full pt-2 border-t border-slate-900/60">
                                {/* Upload Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                        uploadedImage
                                            ? "border-emerald-950 bg-emerald-950/10 text-emerald-400"
                                            : "border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-900"
                                    }`}
                                >
                                    <span>📎</span>
                                    <span className="truncate">{uploadedImage ? "შეცვლა" : "ატვირთვა"}</span>
                                </button>

                                {/* Generate Button */}
                                <button
                                    type="button"
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage || !activeProject}
                                    className="flex-1 bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-[11px] py-2 px-3 rounded-lg shadow-md shadow-rose-600/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {isGeneratingImage ? (
                                        <>
                                            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            გენერირდება...
                                        </>
                                    ) : (
                                        <>🎨 გენერირება</>
                                    )}
                                </button>
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                )}



                {/* Active calendar flow action buttons at the bottom */}
                {editingCalendarEvent ? (
                    <div className="flex gap-2.5 w-full pt-2">
                        <button
                            onClick={handleUpdateCalendarEventFromEdit}
                            className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer animate-pulse-once"
                        >
                            ✏️ განახლება
                        </button>
                        <button
                            onClick={handleResetAll}
                            className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            title="გაუქმება"
                        >
                            ✕ გაუქმება
                        </button>
                    </div>
                ) : scheduleTargetDate ? (
                    <div className="flex gap-2.5 w-full pt-2">
                        <button
                            onClick={handleDirectAddToCalendar}
                            className="flex-1 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer animate-pulse-once"
                        >
                            📅 დამატება
                        </button>
                        <button
                            onClick={handleResetAll}
                            className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            title="გაუქმება"
                        >
                            ✕ გაუქმება
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Right: Live Preview Panel */}
            <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">რეალური Live Preview</h2>
                    {(generatedAd || prompt.trim()) && (
                        <div className="flex gap-2 flex-wrap items-center relative animate-fade-in">
                            {/* Copy button */}
                            <button
                                onClick={handleCopy}
                                className="px-3.5 max-[500px]:px-1 min-[1023px]:max-[1110px]:px-[2.4px] py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                {copied ? (
                                    <>✅ კოპირებულია!</>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 shrink-0">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                        კოპირება
                                    </>
                                )}
                            </button>



                            {/* Share button */}
                            <button
                                onClick={handleShare}
                                className="px-3.5 max-[500px]:px-1 min-[1023px]:max-[1110px]:px-[2.4px] py-1.5 rounded-lg border border-indigo-800/40 bg-indigo-950/30 text-indigo-300 font-semibold text-xs hover:bg-indigo-900/40 transition-all flex items-center gap-1.5 animate-fade-in cursor-pointer"
                            >
                                🔗 გაზიარება
                            </button>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={isUploadingImage}
                                className="px-3.5 max-[500px]:px-1 min-[1023px]:max-[1110px]:px-[2.4px] py-1.5 rounded-lg border border-indigo-800/40 bg-indigo-950/40 text-indigo-300 font-semibold text-xs hover:bg-indigo-950/80 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                {isUploadingImage ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        სურათი იტვირთება...
                                    </>
                                ) : (
                                    "💾 შენახვა"
                                )}
                            </button>

                            {/* Add to schedule */}
                            {!scheduleTargetDate && (
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        setScheduleDate(now.toISOString().split("T")[0]);
                                        const futureTime = new Date(now.getTime() + 5 * 60000);
                                        const hours = String(futureTime.getHours()).padStart(2, '0');
                                        const minutes = String(futureTime.getMinutes()).padStart(2, '0');
                                        setScheduleTime(`${hours}:${minutes}`);
                                        setIsScheduling(true);
                                    }}
                                    className="px-3.5 max-[500px]:px-1 min-[1023px]:max-[1110px]:px-[2.4px] py-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/40 text-emerald-300 font-semibold text-xs hover:bg-emerald-950/80 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    📅 განრიგში დამატება
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="glass-panel rounded-2xl p-4 sm:p-6 min-h-[220px] sm:min-h-[300px] flex flex-col justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20"></div>
                            </div>
                            <span className="text-slate-400 text-xs font-semibold animate-pulse">AI მუშაობს კამპანიის ტექსტზე...</span>
                        </div>
                    ) : isOmnipostMode ? (
                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1 w-full">
                            {omnipostPlatforms.map((plat) => {
                                const ad = omnipostAds[plat] || {
                                    headline: activeProject?.name || "სარეკლამო კამპანია",
                                    text: prompt || "აქ გამოჩნდება თქვენი პოსტის ტექსტი...",
                                    cta: ctaType === "custom" ? customCta : ctaType,
                                    imageUrl: isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80") : "",
                                    hashtags: [],
                                };
                                return (
                                    <div key={plat} className="space-y-2 border border-slate-900/60 p-4 rounded-2xl bg-slate-950/20">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span>{plat.toUpperCase()} Preview</span>
                                            <button
                                                onClick={() => handleSavePlatformAd(plat, ad)}
                                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-[9px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                                            >
                                                💾 Save {plat.toUpperCase()}
                                            </button>
                                        </div>
                                        <div className="w-full max-w-[420px] mx-auto">
                                            <SocialPreview
                                                platform={plat}
                                                ad={ad}
                                                userEmail={userEmail}
                                                onDownload={handleDownload}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="w-full max-w-[420px] mx-auto space-y-4">
                            <SocialPreview
                                platform={platform}
                                ad={{
                                    headline: generatedAd?.headline || activeProject?.name || "სარეკლამო კამპანია",
                                    text: prompt || "აქ გამოჩნდება თქვენი პოსტის ტექსტი...",
                                    cta: (ctaType === "custom" ? customCta : ctaType) || generatedAd?.cta || "გაიგე მეტი",
                                    imageUrl: isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80") : "",
                                    hashtags: prompt.includes("#") ? [] : (generatedAd?.hashtags || []),
                                }}
                                userEmail={userEmail}
                                onDownload={handleDownload}
                            />
                        </div>
                    )}
                </div>

                {/* ── Engagement Analytics Score ── */}
                {prompt.trim() && (() => {
                    const finalCta = ctaType === "custom" ? customCta : ctaType;
                    const engagement = evaluateEngagement(prompt, isOmnipostMode ? omnipostPlatforms[0] || "facebook" : platform, finalCta);
                    return (
                        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3.5 border border-slate-800 bg-slate-950/40 backdrop-blur-xl animate-fade-in text-xs w-full">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                                <h3 className="font-bold text-white flex items-center gap-1.5">
                                    📊 ჩართულობის ანალიზი (Engagement)
                                </h3>
                                <span className={`inline-flex items-center justify-center font-black text-[10px] px-2.5 py-0.5 rounded-full border ${engagement.colorClass}`}>
                                    კლასი: {engagement.grade}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-5">
                                {/* Circular Gauge */}
                                <div className="relative flex items-center justify-center shrink-0">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                                        <circle cx="32" cy="32" r="28" 
                                            stroke={
                                                engagement.score >= 90 ? "#10b981" : 
                                                engagement.score >= 75 ? "#14b8a6" : 
                                                engagement.score >= 60 ? "#f59e0b" : 
                                                engagement.score >= 45 ? "#f97316" : "#ef4444"
                                            } 
                                            strokeWidth="6" 
                                            fill="transparent" 
                                            strokeDasharray={2 * Math.PI * 28}
                                            strokeDashoffset={2 * Math.PI * 28 - (engagement.score / 100) * 2 * Math.PI * 28}
                                            className="transition-all duration-500 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center leading-none">
                                        <span className="text-sm font-black text-white">{engagement.score}%</span>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">ქულა</span>
                                    </div>
                                </div>
                                
                                {/* Tips Checklist */}
                                <div className="flex-1 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {engagement.tips.map((tip, i) => (
                                        <div key={i} className="text-[10px] text-slate-400 leading-normal flex items-start gap-1">
                                            <span>•</span>
                                            <span>{tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
            {isScheduling && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#090d16]/95 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                📅 განრიგში დამატება
                            </h3>
                            <button
                                onClick={() => setIsScheduling(false)}
                                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            აირჩიეთ პოსტის ავტომატურად გამოქვეყნების სასურველი თარიღი და დრო.
                        </p>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">თარიღი</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    min={new Date().toISOString().split("T")[0]}
                                    onClick={(e) => {
                                        try {
                                            e.currentTarget.showPicker();
                                        } catch {}
                                    }}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">დრო</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onClick={(e) => {
                                        try {
                                            e.currentTarget.showPicker();
                                        } catch {}
                                    }}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setIsScheduling(false)}
                                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-800 hover:bg-slate-900 transition-all text-slate-300"
                            >
                                გაუქმება
                            </button>
                            <button
                                onClick={handleConfirmSchedule}
                                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                დადასტურება
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Prompt Diff Modal */}
            {isEnhanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#090d16]/95 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                ✨ გაუმჯობესებული ინსტრუქცია (AI Prompt)
                            </h3>
                            <button
                                onClick={() => setIsEnhanceModalOpen(false)}
                                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-3.5 text-xs text-slate-300">
                            <div className="space-y-1">
                                <p className="font-bold text-slate-500">ორიგინალი:</p>
                                <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl max-h-24 overflow-y-auto italic">
                                    {prompt}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-indigo-400">გაუმჯობესებული ვერსია:</p>
                                <div className="p-3 bg-indigo-950/15 border border-indigo-900/30 rounded-xl max-h-48 overflow-y-auto font-medium text-indigo-100">
                                    {enhancedPrompt}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setIsEnhanceModalOpen(false)}
                                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-800 hover:bg-slate-900 transition-all text-slate-300"
                            >
                                გაუქმება
                            </button>
                            <button
                                onClick={() => {
                                    setPrompt(enhancedPrompt);
                                    setIsEnhanceModalOpen(false);
                                }}
                                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                მიღება (Accept)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
