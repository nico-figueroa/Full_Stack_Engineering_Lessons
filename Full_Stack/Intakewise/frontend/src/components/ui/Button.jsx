export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "px-4 py-2 rounded font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
  };

  return (
    <button className={`${base} inline-flex items-center gap-2 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
