"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { marcarImpreso } from "@/app/admin/acciones";

interface EventoPedido {
  tipo: "creado" | "actualizado";
  pedidoId: string;
  numero: number;
  mesaNumero: number;
}

interface ContextoVivo {
  conectado: boolean;
  /** Sube cada vez que llega un aviso: las páginas lo usan para volver a cargar. */
  version: number;
  /** Ids de pedidos que llegaron en esta sesión (para resaltarlos). */
  recientes: Set<string>;
  sonido: boolean;
  cambiarSonido: (activo: boolean) => void;
  autoImprimir: boolean;
  cambiarAutoImprimir: (activo: boolean) => void;
  imprimir: (ruta: string) => void;
}

const Contexto = createContext<ContextoVivo | null>(null);

export function useVivo(): ContextoVivo {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useVivo debe usarse dentro de <PanelVivo>");
  return contexto;
}

/** Preferencia de ESTE equipo (sonido, impresión automática), guardada en el navegador. */
function usePreferencia(clave: string): [boolean, (activo: boolean) => void] {
  const valor = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("storage", avisar);
      window.addEventListener("roast-preferencia", avisar);
      return () => {
        window.removeEventListener("storage", avisar);
        window.removeEventListener("roast-preferencia", avisar);
      };
    },
    () => {
      try {
        return localStorage.getItem(clave) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const fijar = useCallback(
    (activo: boolean) => {
      try {
        localStorage.setItem(clave, activo ? "1" : "0");
      } catch {
        // sin almacenamiento: dura mientras la página esté abierta
      }
      window.dispatchEvent(new Event("roast-preferencia"));
    },
    [clave],
  );
  return [valor, fijar];
}

/** Imprime una página del panel en un marco oculto (sin abrir pestañas). */
function imprimirEnMarco(ruta: string) {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.tabIndex = -1;
  Object.assign(marco.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  marco.src = ruta;
  marco.onload = () => {
    window.setTimeout(() => {
      marco.contentWindow?.focus();
      marco.contentWindow?.print();
      window.setTimeout(() => marco.remove(), 60_000);
    }, 250);
  };
  document.body.appendChild(marco);
}

/**
 * Conexión en vivo del panel: escucha los pedidos (Server-Sent Events), suena al llegar uno
 * nuevo y, si está activado en este equipo, imprime su comanda sola.
 */
export function PanelVivo({ children }: { children: ReactNode }) {
  const [conectado, setConectado] = useState(false);
  const [version, setVersion] = useState(0);
  const [recientes, setRecientes] = useState<Set<string>>(() => new Set());
  const [sonido, setSonido] = usePreferencia("roast:panel:sonido");
  const [autoImprimir, setAutoImprimir] = usePreferencia("roast:panel:imprimir");
  const audio = useRef<AudioContext | null>(null);
  const preferencias = useRef({ sonido, autoImprimir });

  useEffect(() => {
    preferencias.current = { sonido, autoImprimir };
  }, [sonido, autoImprimir]);

  const prepararAudio = useCallback(() => {
    const Clase = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Clase) return null;
    audio.current ??= new Clase();
    if (audio.current.state === "suspended") void audio.current.resume();
    return audio.current;
  }, []);

  const sonar = useCallback(() => {
    const ctx = prepararAudio();
    if (!ctx) return;
    // Dos tonos cortos, claros en una cocina ruidosa.
    [0, 0.22].forEach((retraso, i) => {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.type = "square";
      oscilador.frequency.value = i === 0 ? 880 : 1175;
      volumen.gain.setValueAtTime(0.0001, ctx.currentTime + retraso);
      volumen.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + retraso + 0.02);
      volumen.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + retraso + 0.18);
      oscilador.connect(volumen).connect(ctx.destination);
      oscilador.start(ctx.currentTime + retraso);
      oscilador.stop(ctx.currentTime + retraso + 0.2);
    });
  }, [prepararAudio]);

  // El navegador solo deja sonar audio después de un toque: se habilita con el primero.
  useEffect(() => {
    const habilitar = () => {
      if (preferencias.current.sonido) prepararAudio();
    };
    document.addEventListener("pointerdown", habilitar);
    return () => document.removeEventListener("pointerdown", habilitar);
  }, [prepararAudio]);

  useEffect(() => {
    const fuente = new EventSource("/api/admin/eventos");
    fuente.onopen = () => setConectado(true);
    fuente.onerror = () => setConectado(false);
    fuente.addEventListener("hola", () => {
      setConectado(true);
      setVersion((v) => v + 1);
    });
    fuente.onmessage = (mensaje) => {
      let evento: EventoPedido;
      try {
        evento = JSON.parse(mensaje.data) as EventoPedido;
      } catch {
        return;
      }
      setVersion((v) => v + 1);
      if (evento.tipo !== "creado") return;
      setRecientes((actuales) => new Set(actuales).add(evento.pedidoId));
      if (preferencias.current.sonido) sonar();
      if (preferencias.current.autoImprimir) {
        imprimirEnMarco(`/admin/imprimir/pedido/${evento.pedidoId}`);
        // Al quedar marcada, el tablero se recarga y la tarjeta pasa a «Reimprimir».
        void marcarImpreso(evento.pedidoId).then(() => setVersion((v) => v + 1));
      }
    };
    return () => fuente.close();
  }, [sonar]);

  const valor = useMemo<ContextoVivo>(
    () => ({
      conectado,
      version,
      recientes,
      sonido,
      cambiarSonido: (activo) => {
        setSonido(activo);
        if (activo) sonar();
      },
      autoImprimir,
      cambiarAutoImprimir: setAutoImprimir,
      imprimir: imprimirEnMarco,
    }),
    [conectado, version, recientes, sonido, setSonido, autoImprimir, setAutoImprimir, sonar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
