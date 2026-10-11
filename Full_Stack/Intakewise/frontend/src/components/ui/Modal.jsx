import { createPortal } from "react-dom";

export default function Modal({ open, title, children, onClose, className = "" }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 backdrop-blur-sm">
      <div
        className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6"
        onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}
      >
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 ${className}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
