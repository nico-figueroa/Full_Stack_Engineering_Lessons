export default function Input({ label, id, className = "", ...props }) {
  const inputId = id || props.name || label?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${className}`}
        {...props}
      />
    </div>
  );
}
