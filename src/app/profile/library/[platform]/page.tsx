"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore, SavedAd } from "../../../../store/projectStore";
import { useAuthStore } from "../../../../store/authStore";
import LibraryTab from "../../../../components/workspace/LibraryTab";

export default function LibraryPage({ params }: { params: Promise<{ platform: string }> }) {
    const router = useRouter();
    const { platform } = use(params);
    const { user } = useAuthStore();
    const {
        activeProject,
        savedAds,
        deleteSavedAd,
        showNotification,
        setEditorPlatform,
        setEditorTone,
        setEditorPrompt,
        setEditorImagePrompt,
        setEditorUploadedImage,
        setEditorUploadedImageName,
        setEditorGeneratedAd,
        openCreateProjectModal,
        resetEditorState
    } = useProjectStore();

    const handleLoadAdToGenerator = (ad: SavedAd) => {
        setEditorPlatform(ad.platform);
        setEditorTone(ad.tone);
        setEditorPrompt(ad.text);
        setEditorImagePrompt("");
        setEditorUploadedImage(ad.image_url || null);
        setEditorUploadedImageName(ad.image_url ? "შენახული სურათი" : null);
        setEditorGeneratedAd({
            headline: ad.headline || "",
            text: ad.text,
            cta: ad.cta || "",
            imageUrl: ad.image_url || "",
            hashtags: [],
        });
        router.push("/profile/generator");
    };

    const handleActiveTabChange = (tab: string) => {
        if (tab === "calendar") {
            router.push("/profile/calendar");
        } else if (tab === "generator") {
            resetEditorState();
            router.push("/profile/generator");
        } else if (tab === "dashboard") {
            router.push("/profile/dashboard");
        } else if (tab.startsWith("saved-")) {
            const platformId = tab.replace("saved-", "");
            router.push(`/profile/library/${platformId}`);
        }
    };

    return (
        <LibraryTab
            activeTab={`saved-${platform}`}
            activeProject={activeProject}
            savedAds={savedAds}
            deleteSavedAd={deleteSavedAd}
            handleLoadAdToGenerator={handleLoadAdToGenerator}
            showNotification={showNotification}
            setPlatform={setEditorPlatform}
            setActiveTab={handleActiveTabChange}
            userEmail={user?.email || ""}
            resetEditorState={resetEditorState}
        />
    );
}
