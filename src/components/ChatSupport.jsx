import { useState } from "react";
import { sendChatMessageWithStreamingFallback } from "../api/chatApi";

function cleanAssistantText(text) {
    if (!text) return "";

    return text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\s+/g, "• ")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .replace(/\`\`\`[\s\S]*?\`\`\`/g, (block) =>
            block.replace(/\`\`\`[\w-]*\n?/g, "").replace(/\`\`\`/g, "")
        )
        .trim();
}

function AssistantLogo({ size = 44 }) {
    return (
        <div
            aria-hidden="true"
            style={{ ...styles.logo, width: size, height: size }}
        >
            <div style={{ ...styles.orb, width: size, height: size }}>
                <div style={styles.orbGlow}></div>
                <div style={styles.orbCore}>
                    <div style={styles.orbRing}></div>
                    <div style={styles.orbSpark}></div>
                    <div style={styles.orbArrow}></div>
                </div>
            </div>
        </div>
    );
}

export default function ChatSupport() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hi! I'm the FXWallet Assistant. How can I help you?",
        },
    ]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();

        setMessages((prev) => [
            ...prev,
            { role: "user", text: userMessage },
            { role: "assistant", text: "" },
        ]);

        setInput("");
        setLoading(true);

        try {
            await sendChatMessageWithStreamingFallback(userMessage, (chunk) => {
                setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    updated[lastIndex] = {
                        ...updated[lastIndex],
                        text: cleanAssistantText(
                            updated[lastIndex].text + chunk
                        ),
                    };
                    return updated;
                });
            });
        } catch (error) {
            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                updated[lastIndex] = {
                    ...updated[lastIndex],
                    text: "Sorry, I couldn't connect to the FXWallet Assistant.",
                };
                return updated;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            handleSend();
        }
    };

    return (
        <div className="fx-chat-container" style={styles.container}>
            <div style={styles.header}>
                <AssistantLogo size={52} />
                <div>
                    <h2 style={styles.title}>FXWallet Assistant</h2>
                    <p style={styles.subtitle}>Your AI-powered FX intelligence</p>
                </div>
                <div style={styles.onlineBadge}>
                    <span style={styles.onlineDot}></span>
                    Online
                </div>
            </div>

            <div style={styles.messages} aria-live="polite">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        style={{
                            ...styles.messageRow,
                            ...(message.role === "user"
                                ? styles.userRow
                                : styles.assistantRow),
                        }}
                    >
                        {message.role === "assistant" && <AssistantLogo size={34} />}
                        <div
                            style={{
                                ...styles.message,
                                ...(message.role === "user"
                                    ? styles.userMessage
                                    : styles.assistantMessage),
                            }}
                        >
                            {message.text}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={styles.messageRow}>
                        <AssistantLogo size={34} />
                        <div style={styles.assistantMessage}>
                            <span style={styles.thinkingLabel}>
                                Thinking<span style={styles.dots}>...</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="fx-chat-input-area" style={styles.inputArea}>
                <input
                    type="text"
                    value={input}
                    placeholder="Ask something about FXWallet..."
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="fx-chat-input"
                    style={styles.input}
                    disabled={loading}
                />

                <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="fx-chat-send"
                    style={styles.button}
                >
                    Send
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: "100%",
        maxWidth: "700px",
        margin: "0 auto",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    },

    header: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "16px 20px",
        borderBottom: "1px solid #e5e7eb",
    },

    logo: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #2563eb, #38bdf8)",
        boxShadow: "0 4px 10px rgba(37, 99, 235, 0.22)",
    },

    title: {
        margin: 0,
        fontSize: "20px",
    },

    subtitle: {
        margin: "4px 0 0",
        color: "#6b7280",
        fontSize: "13px",
    },

    onlineBadge: {
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "999px",
        background: "#ecfdf5",
        color: "#047857",
        fontSize: "12px",
        fontWeight: 600,
    },

    onlineDot: {
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "#10b981",
    },

    messages: {
        minHeight: "400px",
        maxHeight: "500px",
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    messageRow: {
        display: "flex",
        alignItems: "flex-end",
        gap: "8px",
    },

    assistantRow: {
        alignSelf: "flex-start",
    },

    userRow: {
        alignSelf: "flex-end",
    },

    message: {
        padding: "12px 16px",
        borderRadius: "12px",
        maxWidth: "75%",
        lineHeight: "1.5",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
    },

    userMessage: {
        background: "#111827",
        color: "#ffffff",
        borderBottomRightRadius: "4px",
    },

    assistantMessage: {
        background: "#f3f4f6",
        color: "#111827",
        borderBottomLeftRadius: "4px",
    },

    thinkingLabel: {
        display: "inline-block",
    },

    dots: {
        display: "inline-block",
        width: "18px",
        overflow: "hidden",
        verticalAlign: "bottom",
        animation: "fxwalletChatDots 1.2s steps(4, end) infinite",
    },

    inputArea: {
        display: "flex",
        gap: "10px",
        padding: "16px",
        borderTop: "1px solid #e5e7eb",
    },

    input: {
        flex: 1,
        padding: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        outline: "none",
    },

    button: {
        padding: "12px 20px",
        border: "none",
        borderRadius: "10px",
        background: "#111827",
        color: "#ffffff",
        cursor: "pointer",
    },
};

const style = document.createElement("style");
style.textContent = `
@keyframes fxwalletChatDots {
    0%, 20% { width: 0; }
    40% { width: 6px; }
    60% { width: 12px; }
    80%, 100% { width: 18px; }
}
`;
if (!document.head.querySelector("#fxwallet-chat-support-styles")) {
    style.id = "fxwallet-chat-support-styles";
    document.head.appendChild(style);
}
