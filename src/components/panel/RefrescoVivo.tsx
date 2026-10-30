"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useVivo } from "./PanelVivo";

/** Vuelve a cargar los datos de la página (sin perder lo escrito) cuando llega un aviso de pedidos. */
export function RefrescoVivo() {
  const { version } = useVivo();
  const router = useRouter();
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    router.refresh();
  }, [version, router]);
  return null;
}
