import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Trazo({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
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

export function IconoMas(props: Props) {
  return (
    <Trazo strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Trazo>
  );
}

export function IconoHamburguesa(props: Props) {
  return (
    <Trazo {...props}>
      <path d="M4 11c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5H4Z" />
      <path d="M9 7.6h.01M12 6.8h.01M15 7.6h.01" />
      <path d="M3.5 14h17" />
      <path d="M4.5 17h15a.5.5 0 0 1 .5.5 2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5a.5.5 0 0 1 .5-.5Z" />
    </Trazo>
  );
}

export function IconoPapas(props: Props) {
  return (
    <Trazo {...props}>
      <path d="M6 10h12l-1.6 10H7.6L6 10Z" />
      <path d="M8 10 7 4M10.5 10l-.3-7M13.5 10l.3-7M16 10l1-6" />
      <path d="M10 15a2 2 0 0 0 4 0" />
    </Trazo>
  );
}

export function IconoBebida(props: Props) {
  return (
    <Trazo {...props}>
      <path d="M7 9h10l-1.3 11H8.3L7 9Z" />
      <path d="M6 9h12" />
      <path d="M12.5 9 14 3.5h3" />
      <path d="M8 14h8" />
    </Trazo>
  );
}
