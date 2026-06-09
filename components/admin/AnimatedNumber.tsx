"use client";

import { useEffect, useMemo, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function CountPart({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setCurrent(value);
      return;
    }

    const duration = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, value]);

  return <>{current.toLocaleString()}</>;
}

export default function AnimatedNumber({ value }: { value: string | number }) {
  const parts = useMemo(() => {
    if (typeof value === "number") return [{ type: "number" as const, value }];

    const slashMatch = value.match(/^(\d+)\/(\d+)$/);
    if (slashMatch) {
      return [
        { type: "number" as const, value: Number(slashMatch[1]) },
        { type: "text" as const, value: "/" },
        { type: "number" as const, value: Number(slashMatch[2]) },
      ];
    }

    const numericMatch = value.match(/^(\d+)$/);
    if (numericMatch) return [{ type: "number" as const, value: Number(numericMatch[1]) }];

    return [{ type: "text" as const, value }];
  }, [value]);

  return (
    <>
      {parts.map((part, index) =>
        part.type === "number" ? <CountPart key={index} value={part.value} /> : <span key={index}>{part.value}</span>,
      )}
    </>
  );
}
