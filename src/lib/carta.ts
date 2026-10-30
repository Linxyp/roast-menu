// Forma en que la carta viaja del servidor a la página (solo datos públicos).

export interface ImagenDTO {
  id: string;
  /** WebP de hasta 1200 px. */
  url: string;
  /** WebP de hasta 480 px. */
  mini: string;
  ancho: number;
  alto: number;
  color: string;
  transparente: boolean;
}

export interface OpcionDTO {
  id: string;
  nombre: string;
  precioExtra: number;
  disponible: boolean;
  imagen: ImagenDTO | null;
}

/** Elección obligatoria de una opción: «Elige tu carne: Res o Pollo». */
export interface GrupoDTO {
  id: string;
  titulo: string;
  etiqueta: string;
  opciones: OpcionDTO[];
}

export interface ToppingDTO {
  id: string;
  nombre: string;
  disponible: boolean;
  imagen: ImagenDTO | null;
}

export interface NivelDTO {
  id: string;
  nombre: string;
  detalle: string | null;
  precio: number;
  toppingsIncluidos: number;
}

export interface ProductoDTO {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string | null;
  imagen: ImagenDTO | null;
  agotado: boolean;
  nota: string | null;
  niveles: NivelDTO[];
  grupos: GrupoDTO[];
  /** Toppings que admite (vacío si no lleva). */
  toppings: ToppingDTO[];
  precioToppingAdicional: number | null;
  maxToppings: number | null;
}

export interface CategoriaDTO {
  id: string;
  nombre: string;
  tituloPrincipal: string | null;
  tituloPincel: string | null;
  pincelPrimero: boolean;
  lema: string | null;
  productos: ProductoDTO[];
}

export interface NegocioDTO {
  nombre: string;
  recibiendoPedidos: boolean;
  direccion: string;
  horario: string;
  instagram: string;
}

export interface CartaDTO {
  categorias: CategoriaDTO[];
  negocio: NegocioDTO;
}

/** Mesa desde la que se está pidiendo (solo en /m/<codigo>). */
export interface MesaDTO {
  codigo: string;
  numero: number;
  nombre: string | null;
}

/** Precio más bajo con el que se puede pedir el producto («desde $15.900»). */
export function precioDesde(producto: { niveles: { precio: number }[] }): number {
  return Math.min(...producto.niveles.map((nivel) => nivel.precio));
}
