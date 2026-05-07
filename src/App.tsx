import { useEffect, useEffectEvent, useState } from "react";
import { DocsSearchModal } from "./components/DocsSearchModal";
import { Kbd, ThemeToggle } from "./components/ui";
import { useTheme } from "./hooks/useTheme";

export function App() {
  const [open, setOpen] = useState(true);
  const { themeMode, setThemeMode } = useTheme();

  const handleGlobalKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

    if (!shortcut) {
      return;
    }

    event.preventDefault();
    setOpen((current) => !current);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <main className="min-h-screen px-5 pb-24 pt-14 md:pb-24 md:pt-14">
      <section className="mx-auto w-full max-w-220 pb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            React InstantSearch + TypeScript
          </p>
          <ThemeToggle value={themeMode} onChange={setThemeMode} />
        </div>

        <h1 className="m-0 text-[clamp(2.75rem,5vw,4.75rem)] font-black leading-[0.98] tracking-[-0.02em] text-slate-950 dark:text-slate-50">
          Docs search modal demo
        </h1>
        <p className="mt-4.5 max-w-180 text-[18px] leading-[1.7] text-slate-600 dark:text-slate-300">
          Full working demo app with custom chips, grouped results, keyboard navigation, and
          highlighted matches powered by an Algolia index.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            className="inline-flex min-h-11.5 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-indigo-400 px-4.5 font-bold text-slate-950 transition hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => setOpen(true)}
          >
            Open search
          </button>
          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            Shortcut <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
      </section>

      <DocsSearchModal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
