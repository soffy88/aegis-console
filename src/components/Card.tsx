import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className, title }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-slate-900 border border-slate-800 rounded-xl p-5",
        className,
      )}
    >
      {title && (
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
