import type { ComponentProps, ReactNode } from "react";
import type { ThemeMode } from "../hooks/useTheme";
import { cn } from "../lib/cn";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded border border-slate-300/70 bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return <span className="ml-1.5 opacity-65">{children}</span>;
}

export function FilterChip({
  active = false,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer rounded-lg border border-slate-300/80 bg-transparent px-2.5 py-1 text-[12px] text-slate-600 transition hover:bg-slate-100 motion-reduce:transition-none dark:border-white/15 dark:text-slate-300 dark:hover:bg-slate-800/70",
        active &&
          "border-transparent bg-sky-500/12 text-sky-700 hover:bg-sky-500/12 dark:bg-sky-400/15 dark:text-sky-300 dark:hover:bg-sky-400/15",
        className,
      )}
      {...props}
    />
  );
}

export function DemoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-[20px] border border-slate-300/70 bg-white/70 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none">
      <h2 className="mb-2 text-[18px] text-slate-950 dark:text-slate-50">{title}</h2>
      <p className="m-0 leading-[1.65] text-slate-600 dark:text-slate-300">{children}</p>
    </article>
  );
}

const themeButtonCopy: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
};

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return (
    <span className="relative block h-4 w-4">
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "absolute inset-0 h-4 w-4 fill-none stroke-current stroke-[1.5] transition duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none",
          mode === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
        )}
      >
        <circle cx="8" cy="8" r="3" />
        <path
          d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
          strokeLinecap="round"
        />
      </svg>
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "absolute inset-0 h-4 w-4 fill-none stroke-current stroke-[1.5] transition duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none",
          mode === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0",
        )}
      >
        <path
          d="M10.8 1.8A5.8 5.8 0 1 0 14.2 12 6.4 6.4 0 0 1 10.8 1.8Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ThemeToggle({
  value,
  onChange,
  className,
}: {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
  className?: string;
}) {
  const nextMode: ThemeMode = value === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode)}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition hover:border-sky-300 hover:text-slate-950 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-slate-50",
        className,
      )}
      aria-label={`Current theme ${themeButtonCopy[value]}. Activate to switch to ${themeButtonCopy[nextMode]}.`}
      title={`Theme: ${themeButtonCopy[value]} -> ${themeButtonCopy[nextMode]}`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/12 text-sky-700 transition duration-300 ease-out motion-reduce:transition-none dark:bg-sky-400/15 dark:text-sky-300">
        <ThemeIcon mode={value} />
      </span>
      <span className="sr-only">{themeButtonCopy[value]}</span>
    </button>
  );
}
