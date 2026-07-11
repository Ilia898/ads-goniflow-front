"use client";

import React, { useRef, useState } from "react";
import { Project, SavedAd } from "../../store/projectStore";
import { generateMockAd, GeneratedAd } from "../../utils/mockGenerator";
import SocialPreview from "../SocialPreview";
import { CalendarEvent } from "../GoniflowCalendar";
import { uploadImage } from "../../utils/uploadImage";
import { apiFetch } from "../../utils/api";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditingText, setIsEditingText] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
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

    const handleDirectPublish = async (platformName: string, adData: { text: string; headline?: string; cta?: string; imageUrl?: string; image_url?: string }): Promise<boolean> => {
        if (!activeProject) return false;
        try {
            await apiFetch(`/projects/${activeProject.id}/publish`, {
                method: "POST",
                body: JSON.stringify({
                    platform: platformName,
                    text: adData.text,
                    headline: adData.headline || "",
                    cta: adData.cta || "",
                    imageUrl: adData.imageUrl || adData.image_url || ""
                })
            });
            showNotification("success", "პოსტი წარმატებით გამოქვეყნდა სოციალურ ქსელში!");
            return true;
        } catch {
            return false;
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

        const mockResult = generateMockAd({
            textPrompt: prompt,
            imagePrompt: "",
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
                }),
            });

            const hashtagsText = data.hashtags && data.hashtags.length > 0
                ? "\n\n" + data.hashtags.join(" ")
                : "";
            setPrompt(data.text + hashtagsText);

            setGeneratedAd({
                headline: data.headline,
                text: data.text,
                cta: data.cta,
                hashtags: data.hashtags || [],
                imageUrl: generatedAd?.imageUrl || uploadedImage || mockResult.imageUrl,
            });
            showNotification("success", "ტექსტი წარმატებით დაგენერირდა!");
        } catch {
            const hashtagsText = mockResult.hashtags && mockResult.hashtags.length > 0
                ? "\n\n" + mockResult.hashtags.join(" ")
                : "";
            setPrompt(mockResult.text + hashtagsText);
            setGeneratedAd({
                ...mockResult,
                imageUrl: generatedAd?.imageUrl || uploadedImage || mockResult.imageUrl,
            });
            showNotification("error", "AI სერვისი მიუწვდომელია. გამოყენებულია საილუსტრაციო ტექსტი.");
        } finally {
            setIsGenerating(false);
        }
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

            setGeneratedAd({
                ...currentAd,
                imageUrl: data.imageUrl || mockResult.imageUrl,
            });
            showNotification("success", "სურათი წარმატებით დაგენერირდა!");
        } catch {
            const currentAd = generatedAd || {
                text: prompt,
                headline: activeProject.name || "",
                cta: "გაიგე მეტი",
                hashtags: [],
            };

            setGeneratedAd({
                ...currentAd,
                imageUrl: mockResult.imageUrl,
            });
            showNotification("error", "AI სერვისი მიუწვდომელია. გამოყენებულია საილუსტრაციო სურათი.");
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

        try {
            await saveAd(activeProject.id, {
                platform,
                tone,
                headline: generatedAd?.headline || activeProject.name || "",
                text: prompt,
                cta: generatedAd?.cta || "გაიგე მეტი",
                image_url: finalImageUrl,
            });
            showNotification("success", "პოსტი წარმატებით შეინახა!");
        } catch {
            showNotification("error", "შეცდომა პოსტის შენახვისას. სცადეთ თავიდან.");
        }
    };

    const handleCopy = async () => {
        const adText = generatedAd?.text || prompt;
        const hashtagsText = generatedAd?.hashtags?.length ? `\n\n${generatedAd.hashtags.join(" ")}` : "";
        const ctaText = generatedAd?.cta ? `\n\n${generatedAd.cta}` : "";
        const fullText = `${adText}${hashtagsText}${ctaText}`;

        const imageUrl = isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl) : null;

        if (imageUrl) {
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imageUrl;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob(async (blob) => {
                            if (blob) {
                                try {
                                    const item = new ClipboardItem({
                                        "image/png": blob,
                                        "text/plain": new Blob([fullText], { type: "text/plain" })
                                    });
                                    await navigator.clipboard.write([item]);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    showNotification("success", "ტექსტი და სურათი კოპირებულია ბუფერში!");
                                } catch (err) {
                                    console.error("Clipboard write failed:", err);
                                    await navigator.clipboard.writeText(fullText);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    showNotification("success", "ტექსტი კოპირებულია! (სურათის კოპირება ვერ მოხერხდა)");
                                }
                            } else {
                                await navigator.clipboard.writeText(fullText);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }
                        }, "image/png");
                    }
                };
                img.onerror = async () => {
                    await navigator.clipboard.writeText(fullText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    showNotification("success", "ტექსტი კოპირებულია! (სურათის კოპირება ვერ მოხერხდა)");
                };
            } catch {
                await navigator.clipboard.writeText(fullText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } else {
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showNotification("success", "ტექსტი წარმატებით დაკოპირდა!");
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
        setIsEditingText(false);
        setIsShareMenuOpen(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start h-full">
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

                <div>
                    <h2 className="text-base font-bold text-white">პოსტის შექმნა</h2>
                    {/* Smart Mode Indicator */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
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
                </div>

                {/* ── PLATFORM & TONE DROPDOWNS ── */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">სოციალური ქსელი</label>
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="facebook">📘 Facebook</option>
                            <option value="instagram">📸 Instagram</option>
                            <option value="linkedin">💼 LinkedIn</option>
                            <option value="x">🐦 X (Twitter)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ტონი (Tone of Voice)</label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="professional">💼 ოფიციალური</option>
                            <option value="friendly">👋 მეგობრული</option>
                            <option value="funny">😎 ხუმარა</option>
                            <option value="bold">💥 მბზინავი</option>
                        </select>
                    </div>
                </div>

                {/* ── TEXT INPUT SECTION ── */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="text-prompt" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <span>📝</span> პოსტის თემატიკა / ტექსტი
                        </label>
                        <span className="text-[10px] text-slate-600 font-medium">სავალდებულო</span>
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

                {/* Generate Text Button */}
                <button
                    onClick={handleGenerateText}
                    disabled={isGenerating || !activeProject}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            AI გენერირებს ტექსტს...
                        </>
                    ) : (
                        <>✍️ ტექსტის გენერირება</>
                    )}
                </button>

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
                            <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                                {/* Upload Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                        uploadedImage
                                            ? "border-emerald-950 bg-emerald-950/10 text-emerald-400"
                                            : "border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-900"
                                    }`}
                                >
                                    <span>📎</span>
                                    {uploadedImage ? "შეცვლა" : "ფოტოს ატვირთვა"}
                                </button>

                                {/* Generate Button */}
                                <button
                                    type="button"
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage || !activeProject}
                                    className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-[11px] py-1.5 px-3.5 rounded-lg shadow-md shadow-rose-600/10 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
                                        <>🎨 სურათის გენერირება</>
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
                    <div className="flex gap-2 w-full pt-2">
                        <button
                            onClick={handleUpdateCalendarEventFromEdit}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-pulse-once"
                        >
                            ✏️ ჩანაწერის განახლება
                        </button>
                        <button
                            onClick={handleResetAll}
                            className="px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all"
                            title="გაუქმება"
                        >
                            გაუქმება
                        </button>
                    </div>
                ) : scheduleTargetDate ? (
                    <div className="flex gap-2 w-full pt-2">
                        <button
                            onClick={handleDirectAddToCalendar}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-pulse-once"
                        >
                            📅 კალენდარში დამატება
                        </button>
                        <button
                            onClick={handleResetAll}
                            className="px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all"
                            title="გაუქმება"
                        >
                            გაუქმება
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
                                className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5"
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

                            {/* Download button */}
                            {(uploadedImage || generatedAd?.imageUrl) && (
                                <button
                                    onClick={handleDownload}
                                    className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5 animate-fade-in"
                                    title="სურათის ჩამოტვირთვა"
                                >
                                    ⬇️ სურათი
                                </button>
                            )}

                            {/* Edit toggle button */}
                            <button
                                onClick={() => setIsEditingText(!isEditingText)}
                                className={`px-3.5 py-1.5 rounded-lg border font-semibold text-xs transition-all flex items-center gap-1.5 ${
                                    isEditingText
                                        ? "border-amber-700/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
                                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                                }`}
                            >
                                ✏️ {isEditingText ? "დასრულება" : "სათაური / CTA"}
                            </button>

                            {/* Share button with dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                    className="px-3.5 py-1.5 rounded-lg border border-indigo-800/40 bg-indigo-950/30 text-indigo-300 font-semibold text-xs hover:bg-indigo-900/40 transition-all flex items-center gap-1.5"
                                >
                                    🔗 გაზიარება
                                </button>
                                {isShareMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsShareMenuOpen(false)} />
                                        <div className="absolute top-full mt-1.5 right-0 z-40 rounded-xl border border-slate-800 bg-[#090d16]/95 backdrop-blur-md p-1.5 shadow-2xl space-y-1 text-left min-w-[150px]">
                                            <button
                                                onClick={async () => {
                                                    const shareAd = generatedAd || { text: prompt, hashtags: [], cta: "" };
                                                    const success = await handleDirectPublish("x", shareAd);
                                                    if (!success) {
                                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareAd.text + (shareAd.cta ? '\n' + shareAd.cta : ''))}`, '_blank');
                                                    }
                                                    setIsShareMenuOpen(false);
                                                }}
                                                className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                🐦 X (Twitter)-ზე
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const shareAd = generatedAd || { text: prompt, hashtags: [], cta: "" };
                                                    const success = await handleDirectPublish("facebook", shareAd);
                                                    if (!success) {
                                                        navigator.clipboard.writeText(`${shareAd.text}\n\n${shareAd.cta || ""}`);
                                                        showNotification("success", "პოსტის ტექსტი კოპირებულია! ჩასვით (Ctrl+V) გაზიარების ველში.");
                                                        if (shareAd.imageUrl) handleDownload();
                                                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeProject?.link || 'https://goniflow.ge')}`, '_blank');
                                                    }
                                                    setIsShareMenuOpen(false);
                                                }}
                                                className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                🔵 Facebook-ზე
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const shareAd = generatedAd || { text: prompt, hashtags: [], cta: "" };
                                                    const success = await handleDirectPublish("linkedin", shareAd);
                                                    if (!success) {
                                                        navigator.clipboard.writeText(`${shareAd.text}\n\n${shareAd.cta || ""}`);
                                                        showNotification("success", "პოსტის ტექსტი კოპირებულია! ჩასვით (Ctrl+V) გაზიარების ველში.");
                                                        if (shareAd.imageUrl) handleDownload();
                                                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeProject?.link || 'https://goniflow.ge')}`, '_blank');
                                                    }
                                                    setIsShareMenuOpen(false);
                                                }}
                                                className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                💼 LinkedIn-ზე
                                            </button>
                                            {typeof navigator !== 'undefined' && navigator.share && (
                                                <>
                                                    <div className="border-t border-slate-800 my-1"></div>
                                                    <button
                                                        onClick={async () => {
                                                            const shareAd = generatedAd || { text: prompt, hashtags: [], cta: "" };
                                                            const startTime = Date.now();
                                                            try {
                                                                if (navigator.share && shareAd.imageUrl) {
                                                                    try {
                                                                        const res = await fetch(shareAd.imageUrl);
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
                                                                            setIsShareMenuOpen(false);
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
                                                            } catch {
                                                                // cancelled
                                                            }
                                                            setIsShareMenuOpen(false);
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

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={isUploadingImage}
                                className="px-3.5 py-1.5 rounded-lg border border-indigo-800/40 bg-indigo-950/40 text-indigo-300 font-semibold text-xs hover:bg-indigo-950/80 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
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
                                    className="px-3.5 py-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/40 text-emerald-300 font-semibold text-xs hover:bg-emerald-950/80 transition-all flex items-center gap-1.5"
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
                    ) : (
                        <div className="w-full max-w-[420px] mx-auto space-y-4">
                            <SocialPreview
                                platform={platform}
                                ad={{
                                    headline: generatedAd?.headline || activeProject?.name || "სარეკლამო კამპანია",
                                    text: prompt || "აქ გამოჩნდება თქვენი პოსტის ტექსტი...",
                                    cta: generatedAd?.cta || "გაიგე მეტი",
                                    imageUrl: isImageSectionOpen ? (uploadedImage || generatedAd?.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80") : "",
                                    hashtags: prompt.includes("#") ? [] : (generatedAd?.hashtags || []),
                                }}
                                userEmail={userEmail}
                            />

                            {isEditingText && (
                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3 animate-fade-in text-left">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">სათაურისა და CTA-ის რედაქტირება</h4>
                                    
                                    {/* Headline input */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500">სათაური (Headline)</label>
                                        <input
                                            type="text"
                                            value={generatedAd?.headline || activeProject?.name || ""}
                                            onChange={(e) => setGeneratedAd({
                                                headline: e.target.value,
                                                text: prompt,
                                                cta: generatedAd?.cta || "გაიგე მეტი",
                                                imageUrl: generatedAd?.imageUrl || "",
                                                hashtags: generatedAd?.hashtags || [],
                                            })}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="სათაური..."
                                        />
                                    </div>

                                    {/* CTA input */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500">CTA (მოწოდება ქმედებისკენ)</label>
                                        <input
                                            type="text"
                                            value={generatedAd?.cta || "გაიგე მეტი"}
                                            onChange={(e) => setGeneratedAd({
                                                headline: generatedAd?.headline || activeProject?.name || "",
                                                text: prompt,
                                                cta: e.target.value,
                                                imageUrl: generatedAd?.imageUrl || "",
                                                hashtags: generatedAd?.hashtags || [],
                                            })}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="მაგ: შეიტყვეთ მეტი"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
        </div>
    );
}
