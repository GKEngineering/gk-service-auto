"use client";

import { useEffect } from "react";

/** Enregistre le service worker pour permettre l'installation de l'app sur l'écran d'accueil. */
export function EnregistrementSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
