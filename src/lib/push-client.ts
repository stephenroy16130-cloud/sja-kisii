// Called when logging out: stops this device receiving the previous member's notifications.
// The browser stays subscribed, so the next login re-attaches it without asking again.
export async function detachPushFromServer() {
  try {
    sessionStorage.removeItem("sja-push-synced");
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    }
  } catch {
    // never block logging out
  }
}
