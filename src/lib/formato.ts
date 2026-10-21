/** Pesos colombianos como en los afiches: $16.900 (punto de miles, sin decimales). */
export function pesos(valor: number): string {
  const entero = Math.round(valor);
  const cifras = Math.abs(entero)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$${cifras}`;
}
