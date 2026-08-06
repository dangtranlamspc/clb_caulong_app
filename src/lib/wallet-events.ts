const CHANNEL_NAME = "wallet-data-changed";

let channel: BroadcastChannel | null = null;
function getChannel() {
    if (typeof window === "undefined") return null;
    if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
    return channel;
}

export function notifyWalletChanged() {
    getChannel()?.postMessage({ type: "changed", at: Date.now() });
    window.dispatchEvent(new Event("wallet-data-changed-local"));
}

export function subscribeWalletChanged(callback: () => void) {
    const ch = getChannel();
    const onMessage = () => callback();
    ch?.addEventListener("message", onMessage);
    window.addEventListener("wallet-data-changed-local", onMessage);
    return () => {
        ch?.removeEventListener("message", onMessage);
        window.removeEventListener("wallet-data-changed-local", onMessage);
    };
}