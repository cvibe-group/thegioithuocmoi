"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";

const OPEN_DELAY_MS = 300;

export function GlossaryTerm({
  term,
  href,
  excerpt,
}: {
  term: string;
  href: string;
  excerpt: string;
}) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearOpenTimer();
    openTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearOpenTimer]);

  const close = useCallback(() => {
    clearOpenTimer();
    setOpen(false);
  }, [clearOpenTimer]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointer = (event: globalThis.MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, close]);

  useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

  function onTriggerClick(event: MouseEvent) {
    // Touch / click toggles; desktop hover still works via mouseenter.
    event.preventDefault();
    clearOpenTimer();
    setOpen((value) => !value);
  }

  function onTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    }
  }

  return (
    <span
      ref={rootRef}
      className="relative inline"
      onMouseEnter={scheduleOpen}
      onMouseLeave={close}
    >
      <button
        type="button"
        className={cn(
          "inline cursor-pointer border-0 bg-transparent p-0 align-baseline",
          "font-[inherit] text-[length:inherit] leading-[inherit] text-brand",
          "hover:text-[#111111]",
        )}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
      >
        {term}
      </button>

      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className={cn(
            "absolute left-1/2 top-full z-50 mt-2 w-[min(300px,calc(100vw-2rem))] -translate-x-1/2",
            "rounded bg-[#f3f4f6] px-2.5 py-2 text-left text-[14px] leading-4 text-[#0a0a0a]",
            "shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          )}
          onMouseEnter={clearOpenTimer}
          onMouseLeave={close}
        >
          <span
            aria-hidden
            className="absolute bottom-full left-1/2 -mb-px -translate-x-1/2 border-4 border-transparent border-b-[#f3f4f6]"
          />
          {excerpt ? (
            <span className="mb-1.5 block whitespace-normal">{excerpt}</span>
          ) : null}
          <Link
            href={href}
            className="font-bold text-brand hover:underline"
            onClick={close}
          >
            …Đọc thêm
          </Link>
        </span>
      ) : null}
    </span>
  );
}
