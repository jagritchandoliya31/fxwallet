const configuredApiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080";

const normalizedApiUrl = configuredApiUrl.replace(/\/$/, "");
const API_BASE = normalizedApiUrl.endsWith("/api")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`;

const API_URL = `${API_BASE}/v1/chat`;

export async function sendChatMessage(message) {
    const token = localStorage.getItem("fxwallet_token");

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
    });

    if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
    }

    return response.json();
}


export async function streamChatMessage(message, onChunk) {
    const token = localStorage.getItem("fxwallet_token");

    const response = await fetch(`${API_BASE}/v1/chat/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Chat stream failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
            const line = event
                .split("\n")
                .find((entry) => entry.startsWith("data:"));

            if (!line) continue;

            try {
                const payload = JSON.parse(line.slice(5).trim());
                if (payload.text) {
                    onChunk(payload.text);
                }
            } catch {
                // Ignore incomplete SSE frames.
            }
        }
    }
}
