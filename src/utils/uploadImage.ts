const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * Uploads an image file to the backend `/uploads` endpoint which stores it
 * in Supabase Storage and returns a public URL.
 *
 * API.md contract:
 *   POST /uploads
 *   multipart/form-data, field name: "image"
 *   Max size: 5 MB, only image/* mime types allowed.
 *   Response (201): { success: true, data: { url: "https://..." } }
 *
 * NOTE: We intentionally do NOT use `apiFetch` here.
 * `apiFetch` always sets `Content-Type: application/json`, which corrupts
 * multipart/form-data requests (browser needs to set its own boundary).
 * We send a raw fetch with `credentials: "include"` for cookie-based auth.
 *
 * Dev-session fallback: when localStorage "dev-session" is "true" the
 * backend is not available, so we resolve with a base64 data-URL instead.
 */
export async function uploadImage(file: File): Promise<string> {
    // ── Dev-session fallback ─────────────────────────────────────────────
    const isDevSession =
        typeof window !== "undefined" &&
        localStorage.getItem("dev-session") === "true";

    if (isDevSession) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("ფაილის წაკითხვა ვერ მოხდა"));
            reader.readAsDataURL(file);
        });
    }

    // ── Validate before sending ──────────────────────────────────────────
    if (!file.type.startsWith("image/")) {
        throw new Error("მხოლოდ სურათის ფაილები დაიშვება (PNG, JPG, GIF, ...)");
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს");
    }

    // ── Upload ──────────────────────────────────────────────────────────
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${BASE_URL}/uploads`, {
        method: "POST",
        credentials: "include", // Required: sends sb-access-token cookie
        body: formData,
        // ↑ No Content-Type header — the browser sets multipart/form-data
        //   with the correct boundary automatically.
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
            errData.error?.message ||
            errData.error ||
            `სურათის ატვირთვა ვერ მოხდა (${response.status})`
        );
    }

    const data = await response.json();
    // data.data.url = "https://<project>.supabase.co/storage/v1/object/public/ad-assets/<userId>/<uuid>.png"
    return data.data.url as string;
}
