const API_URL = `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL}/api/v1/chat`;
export async function sendChatMessage(message) {
    const token = localStorage.getItem("fxwallet_token");

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
    }

    return response.json();
}
