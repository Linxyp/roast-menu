/** Avisa al servidor de un problema visto en el celular del cliente (ver components/carta/Diagnostico). */
export function reportarDiagnostico(tipo: string, detalle: string) {
  const ventana = window as typeof window & { __roastReportar?: (tipo: string, detalle: string) => void };
  ventana.__roastReportar?.(tipo, detalle);
}
