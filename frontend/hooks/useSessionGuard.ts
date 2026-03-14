// hooks/useSessionGuard.ts
// Drop this in your frontend hooks/ folder.
// Handles:
//  1. Auto-logout on page refresh (sessionStorage flag — bank-style)
//  2. Auto-logout after inactivity timeout (15 min)
//  3. Auto-logout on tab/window close
//  4. Access token refresh via /api/auth/refresh before expiry

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:8000";

// ── Tunables ──────────────────────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS  = 15 * 60 * 1000;  // 15 minutes — matches your 15-min JWT
const REFRESH_INTERVAL_MS    = 13 * 60 * 1000;  // refresh token every 13 min (before 15-min expiry)
const SESSION_KEY            = "vyom_session_active"; // sessionStorage key

// ─────────────────────────────────────────────────────────────────────────────

export function useSessionGuard() {
  const router             = useRouter();
  const inactivityTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInterval    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async (reason: "inactivity" | "refresh" | "manual" | "error" = "manual") => {
    // Clear timers first so nothing fires during cleanup
    if (inactivityTimer.current)  clearTimeout(inactivityTimer.current);
    if (refreshInterval.current)  clearInterval(refreshInterval.current);

    // Remove access token from memory
    localStorage.removeItem("access_token");

    // Remove session flag
    sessionStorage.removeItem(SESSION_KEY);

    // Revoke refresh token on server (fire-and-forget — don't block redirect)
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // sends the refresh_token cookie
      });
    } catch {
      // Server unreachable — still clear client state and redirect
    }

    // Redirect with reason so login page can show appropriate message
    router.replace(`/login?reason=${reason}`);
  }, [router]);

  // ── Reset inactivity timer on user activity ─────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      logout("inactivity");
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  // ── Silently refresh access token ───────────────────────────────────────────
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        // Refresh token expired or revoked — force logout
        logout("error");
        return;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }
    } catch {
      logout("error");
    }
  }, [logout]);

  // ── Main effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // ── BANK-STYLE REFRESH DETECTION ──────────────────────────────────────────
    // sessionStorage is wiped on every page refresh (unlike localStorage).
    // If the flag is missing when this hook mounts, the user just refreshed.
    const sessionExists = sessionStorage.getItem(SESSION_KEY);

    if (!sessionExists) {
      // Page was refreshed or a new tab was opened — treat as logout
      // Also clear any stale access token from localStorage
      localStorage.removeItem("access_token");

      // Revoke server-side token (best-effort)
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      router.replace("/login?reason=refresh");
      return; // Don't set up timers — we're navigating away
    }

    // ── SESSION IS VALID — set up guards ──────────────────────────────────────

    // Start inactivity timer
    resetInactivityTimer();

    // Start token refresh interval
    refreshInterval.current = setInterval(refreshAccessToken, REFRESH_INTERVAL_MS);

    // Activity events that reset the inactivity timer
    const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetInactivityTimer, { passive: true }));

    // Logout on tab/window close (best-effort — browsers may not fire this reliably)
    const handleUnload = () => {
      sessionStorage.removeItem(SESSION_KEY);
      // Use sendBeacon for reliable fire-and-forget on unload
      navigator.sendBeacon(`${API_BASE}/api/auth/logout`);
    };
    window.addEventListener("beforeunload", handleUnload);

    // Cleanup
    return () => {
      if (inactivityTimer.current)  clearTimeout(inactivityTimer.current);
      if (refreshInterval.current)  clearInterval(refreshInterval.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [logout, resetInactivityTimer, refreshAccessToken, router]);

  // Expose manual logout for logout buttons
  return { logout };
}