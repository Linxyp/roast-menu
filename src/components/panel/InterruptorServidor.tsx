"use client";

import { useOptimistic, useTransition, type ReactNode } from "react";

/**
 * Interruptor cuyo valor vive en el servidor (agotado, activo…): cambia en el acto, sin
 * devolverse mientras se guarda, y si la acción falla vuelve solo al valor real.
 */
export function InterruptorServidor({
  activo,
  onCambiar,
  disabled,
  children,
}: {
  activo: boolean;
  onCambiar: (activo: boolean) => Promise<unknown>;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [mostrado, setMostrado] = useOptimistic(activo);
  const [, startTransition] = useTransition();
  return (
    <label className="interruptor">
      <input
        type="checkbox"
        checked={mostrado}
        disabled={disabled}
        onChange={(e) => {
          const nuevo = e.target.checked;
          startTransition(async () => {
            setMostrado(nuevo);
            await onCambiar(nuevo);
          });
        }}
      />
      {children}
    </label>
  );
}
