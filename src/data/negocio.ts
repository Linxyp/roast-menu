// DATOS DEL NEGOCIO. Lo que no aparece en los afiches queda vacío a propósito: no se inventa.
// Dirección, horario e Instagram salen en el pie de página solo si se llenan.

export const NEGOCIO = {
  nombre: "ROAST",
  nombreCompleto: "ROAST Hamburguesas Artesanales",
  descripcion:
    "Carta de ROAST Hamburguesas Artesanales: arma tu hamburguesa, combo con 2 toppings, salchipapas a tu gusto y bebidas.",
  /** URL pública de la carta (la del QR). La pone la publicación automática; ver README. */
  urlPublica: process.env.NEXT_PUBLIC_SITE_URL || "",
  direccion: "",
  horario: "",
  /** Usuario de Instagram, sin @. */
  instagram: "",
};
