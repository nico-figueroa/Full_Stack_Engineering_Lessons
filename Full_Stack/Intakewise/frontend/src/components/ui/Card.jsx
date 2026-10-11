export default function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {title && <h3 className="mb-3 text-lg font-semibold">{title}</h3>}
      {children}
    </section>
  );
}
