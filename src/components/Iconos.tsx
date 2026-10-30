import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Trazo({ children, strokeWidth = 2, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoMas = (p: Props) => (
  <Trazo {...p}>
    <path d="M12 5v14M5 12h14" />
  </Trazo>
);
export const IconoMenos = (p: Props) => (
  <Trazo {...p}>
    <path d="M5 12h14" />
  </Trazo>
);
export const IconoCerrar = (p: Props) => (
  <Trazo {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Trazo>
);
export const IconoCheck = (p: Props) => (
  <Trazo strokeWidth={3} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Trazo>
);
export const IconoFlecha = (p: Props) => (
  <Trazo {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Trazo>
);
export const IconoAtras = (p: Props) => (
  <Trazo {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Trazo>
);
export const IconoBolsa = (p: Props) => (
  <Trazo {...p}>
    <path d="M5.5 8h13l-1.1 12.1a1 1 0 0 1-1 .9H7.6a1 1 0 0 1-1-.9L5.5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Trazo>
);
export const IconoPapelera = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Trazo>
);
export const IconoLapiz = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Trazo>
);
export const IconoReloj = (p: Props) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Trazo>
);
export const IconoImpresora = (p: Props) => (
  <Trazo {...p}>
    <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <path d="M7 14h10v7H7z" />
  </Trazo>
);
export const IconoCampana = (p: Props) => (
  <Trazo {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Trazo>
);
export const IconoMesa = (p: Props) => (
  <Trazo {...p}>
    <path d="M3 9h18M5 9v11M19 9v11M8 9V5h8v4" />
  </Trazo>
);
export const IconoCarta = (p: Props) => (
  <Trazo {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
    <path d="M9 9h6M9 13h6" />
  </Trazo>
);
export const IconoGrafica = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" />
  </Trazo>
);
export const IconoAjustes = (p: Props) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Trazo>
);
export const IconoSalir = (p: Props) => (
  <Trazo {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
  </Trazo>
);
export const IconoArriba = (p: Props) => (
  <Trazo {...p}>
    <path d="m6 15 6-6 6 6" />
  </Trazo>
);
export const IconoAbajo = (p: Props) => (
  <Trazo {...p}>
    <path d="m6 9 6 6 6-6" />
  </Trazo>
);
export const IconoQR = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2" />
  </Trazo>
);
export const IconoFoto = (p: Props) => (
  <Trazo {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5-8 8" />
  </Trazo>
);
export const IconoHamburguesa = (p: Props) => (
  <Trazo strokeWidth={1.6} {...p}>
    <path d="M4 11c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5H4Z" />
    <path d="M9 7.6h.01M12 6.8h.01M15 7.6h.01" />
    <path d="M3.5 14h17" />
    <path d="M4.5 17h15a.5.5 0 0 1 .5.5 2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5a.5.5 0 0 1 .5-.5Z" />
  </Trazo>
);
export const IconoPapas = (p: Props) => (
  <Trazo strokeWidth={1.6} {...p}>
    <path d="M6 10h12l-1.6 10H7.6L6 10Z" />
    <path d="M8 10 7 4M10.5 10l-.3-7M13.5 10l.3-7M16 10l1-6" />
    <path d="M10 15a2 2 0 0 0 4 0" />
  </Trazo>
);
export const IconoBebida = (p: Props) => (
  <Trazo strokeWidth={1.6} {...p}>
    <path d="M7 9h10l-1.3 11H8.3L7 9Z" />
    <path d="M6 9h12" />
    <path d="M12.5 9 14 3.5h3" />
    <path d="M8 14h8" />
  </Trazo>
);
