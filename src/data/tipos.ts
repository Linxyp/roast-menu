// Tipos de la carta. Los datos están en menu.ts y negocio.ts; la página solo los muestra.

export type CategoriaId = "hamburguesas" | "combo" | "salchipapas" | "bebidas";

/** Algo que el cliente escoge al pedir: una carne o un topping. */
export interface Opcion {
  id: string;
  nombre: string;
  /** Clave de la foto en imagenes.generadas.ts. */
  imagen: string;
}

/** Una fila de precios del afiche. Ej.: «Sencilla — 1 carne + pan + cebolla, tomate y lechuga — $16.900». */
export interface FilaPrecio {
  nombre: string;
  detalle?: string;
  precio: number;
}

/** Un paso para armar el producto, como en el afiche: «1 Elige tu carne», «2 Elige tus toppings». */
export interface Paso {
  titulo: string;
  ayuda?: string;
  /** «una»: se escoge una sola (res o pollo); «varias»: las que el cliente quiera. */
  eleccion: "una" | "varias";
  opciones: Opcion[];
}

/** Producto que el cliente arma a su gusto: hamburguesa, combo, salchipapas. */
export interface ProductoArmable {
  tipo: "armable";
  id: string;
  categoria: CategoriaId;
  nombre: string;
  imagen: string;
  altImagen: string;
  /** Precios tal como aparecen en el afiche. */
  precios: FilaPrecio[];
  pasos?: Paso[];
}

/** Producto de precio único: las bebidas. */
export interface ProductoSimple {
  tipo: "simple";
  id: string;
  categoria: CategoriaId;
  nombre: string;
  precio: number;
  /** Foto decorativa: el nombre va escrito al lado. */
  imagen: string;
  /** Texto pequeño bajo los productos de la sección (p. ej. un aviso legal). */
  nota?: string;
}

export type Producto = ProductoArmable | ProductoSimple;

export interface Categoria {
  id: CategoriaId;
  /** Nombre en la barra de categorías. */
  nombre: string;
  /** Título de la sección, con la parte en letra de pincel aparte, como en los afiches. */
  titulo: { pincel: string; principal?: string; pincelPrimero: boolean };
  lema?: string;
}
