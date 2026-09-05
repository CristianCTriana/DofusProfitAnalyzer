import { useEffect, useRef, useState } from "react";

interface SelectorProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  triggerClassName?: string;
  align?: "start" | "end";
  direction?: "up" | "down";
}

export function Selector({
  value,
  options,
  onChange,
  triggerClassName,
  align = "start",
  direction = "up",
}: SelectorProps) {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function handleClickFuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [abierto]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={triggerClassName ?? "flex w-full items-center justify-between gap-1.5 text-text-primary"}
      >
        <span className="truncate">{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`flex-shrink-0 text-text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div
          className={`absolute z-10 max-h-64 w-full min-w-[160px] overflow-y-auto rounded-lg border border-border-strong bg-surface-2 py-1 shadow-lg ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} ${align === "end" ? "right-0" : "left-0"}`}
        >
          {options.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => {
                onChange(opcion);
                setAbierto(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm font-semibold ${
                opcion === value ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              {opcion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
