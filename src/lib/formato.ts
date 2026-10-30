/** Pesos colombianos como en los afiches: $16.900 (punto de miles, sin decimales). */
export function pesos(valor: number): string {
  const entero = Math.round(valor);
  const cifras = Math.abs(entero)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$${cifras}`;
}

export function plural(cantidad: number, singular: string, varios: string): string {
  return cantidad === 1 ? singular : varios;
}

/** «Con 2 toppings» → «con 2 toppings», para frases como «Hamburguesa con 2 toppings». */
export function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase("es-CO") + texto.slice(1);
}

// Colombia está siempre en UTC-5 (sin horario de verano). Las fechas se arman a mano y no con Intl:
// así el servidor y el navegador escriben exactamente lo mismo (sus versiones de ICU difieren).
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function enColombia(fecha: Date | string) {
  const d = new Date(new Date(fecha).getTime() - 5 * 3600 * 1000);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), horas: d.getUTCHours(), minutos: d.getUTCMinutes() };
}

/** «2026-10-29»: el día en Colombia (el servidor puede estar en otra zona horaria). */
export function diaColombia(fecha: Date | string = new Date()): string {
  const { anio, mes, dia } = enColombia(fecha);
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Medianoche UTC del día dado (así guarda Prisma las columnas @db.Date). */
export function fechaDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** «7:45 p. m.» en hora de Colombia. */
export function hora(fecha: Date | string): string {
  const { horas, minutos } = enColombia(fecha);
  return `${horas % 12 || 12}:${String(minutos).padStart(2, "0")} ${horas < 12 ? "a. m." : "p. m."}`;
}

/** «29 oct 2026» en Colombia. */
export function fechaCorta(fecha: Date | string): string {
  const { anio, mes, dia } = enColombia(fecha);
  return `${dia} ${MESES[mes]} ${anio}`;
}

export function fechaHora(fecha: Date | string): string {
  return `${fechaCorta(fecha)}, ${hora(fecha)}`;
}

/** «hace 3 min», «hace 1 h 5 min». */
export function hace(desde: Date | string, ahora = Date.now()): string {
  const minutos = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60000));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `hace ${horas} h${resto ? ` ${resto} min` : ""}`;
}
