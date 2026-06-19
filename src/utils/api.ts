const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    options.credentials = "include"; // Required to send/receive cookies
    options.headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    
    const response = await fetch(url, options);

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.error || "Something went wrong");
    }

    return response.json();
};
