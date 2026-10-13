import ChatSupport from "../components/ChatSupport";

export default function Support() {
    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <div style={styles.eyebrow}>FXWALLET SUPPORT</div>
                    <h1 style={styles.title}>How can we help?</h1>
                    <p style={styles.subtitle}>
                        Ask the FXWallet Assistant about your portfolio,
                        alerts, P&L, and other features.
                    </p>
                </div>
            </div>

            <ChatSupport />
        </div>
    );
}

const styles = {
    page: {
        padding: "28px",
        maxWidth: "1100px",
        margin: "0 auto",
    },

    header: {
        marginBottom: "24px",
    },

    eyebrow: {
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.1em",
        color: "#2563eb",
        textTransform: "uppercase",
    },

    title: {
        margin: "8px 0 6px",
        fontSize: "30px",
        lineHeight: 1.15,
        color: "#0f172a",
    },

    subtitle: {
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
        lineHeight: 1.6,
    },
};
