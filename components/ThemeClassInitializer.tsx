"use client";

import { useLayoutEffect } from "react";

export default function ThemeClassInitializer() {
  useLayoutEffect(() => {
    try {
      const root = document.documentElement;
      const chatTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (chatTheme === "dark" || (!chatTheme && prefersDark)) {
        root.classList.add("chat-dark");
      } else {
        root.classList.remove("chat-dark");
      }

      if (localStorage.getItem("admin-theme") === "dark") {
        root.classList.add("admin-dark");
        root.classList.remove("admin-light");
      } else {
        root.classList.add("admin-light");
        root.classList.remove("admin-dark");
      }
    } catch {
      // Keep rendering even if localStorage or matchMedia is unavailable.
    }
  }, []);

  return null;
}
