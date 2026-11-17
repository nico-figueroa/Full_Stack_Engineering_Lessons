import { useEffect, useSyncExternalStore } from "react";
import { backend } from "../api/client.js";

export default function BackendStatus() {
  const status = useSyncExternalStore(backend.subscribe, backend.getSnapshot);

  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "hidden" || backend.getSnapshot() === "error") return;
      // Rejections are surfaced by the alert below, including background checks.
      backend.ensureReady().catch(() => {});
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "focus"];
    events.forEach(event => window.addEventListener(event, wake, { passive: true }));
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => {
      events.forEach(event => window.removeEventListener(event, wake));
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  if (status !== "waking" && status !== "error") return null;

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className="sticky top-0 z-50 border-b border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm text-indigo-950"
    >
      {status === "waking" ? (
        <span>The backend is being initiated. This can take up to two minutes while the server wakes up.</span>
      ) : (
        <span>
          The backend could not be started. Please try your action again or{" "}
          <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
            reload and retry
          </button>.
        </span>
      )}
    </div>
  );
}
