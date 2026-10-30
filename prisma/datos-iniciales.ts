// Carta inicial de ROAST (la carga `npm run db:seed` solo si la carta está vacía; después
// todo se edita desde el panel). Fuentes: los dos afiches del negocio (fuentes/) y los
// productos que el negocio agregó el 2026-10-29.
// Precios en pesos, sin puntos: 16900 = $16.900. Las imágenes son claves de
// src/data/imagenes.generadas.ts (fotos recortadas de los afiches).

export interface OpcionInicial {
  nombre: string;
  imagen?: string;
}

export interface GrupoInicial {
  titulo: string;
  /** Lo que dice el recibo antes de la opción («Carne: Res»); vacío: solo la opción. */
  etiqueta: string;
  opciones: OpcionInicial[];
}

export interface NivelInicial {
  nombre: string;
  detalle?: string;
  precio: number;
  toppingsIncluidos?: number;
}

export interface ProductoInicial {
  nombre: string;
  descripcion?: string;
  imagen?: string;
  niveles: NivelInicial[];
  grupos?: GrupoInicial[];
  lista?: ListaClave;
  precioToppingAdicional?: number;
  maxToppings?: number;
  nota?: string;
}

export interface CategoriaInicial {
  nombre: string;
  tituloPrincipal?: string;
  tituloPincel?: string;
  pincelPrimero?: boolean;
  lema?: string;
  productos: ProductoInicial[];
}

export type ListaClave = keyof typeof LISTAS;

export const LISTAS = {
  hamburguesa: {
    nombre: "Toppings de hamburguesa",
    toppings: [
      { nombre: "Chicharrón", imagen: "hamb-chicharron" },
      { nombre: "Plátano maduro", imagen: "hamb-platano-maduro" },
      { nombre: "Piña", imagen: "hamb-pina" },
      { nombre: "Tocineta", imagen: "hamb-tocineta" },
      { nombre: "Queso", imagen: "hamb-queso" },
      { nombre: "Mazorca", imagen: "hamb-mazorca" },
      { nombre: "Papitas fosforito", imagen: "hamb-papitas-fosforito" },
      // El guacamole se retiró (2026-10-29): el negocio lo cambió por piña, que ya estaba.
      { nombre: "Champiñones", imagen: "hamb-champinones" },
      { nombre: "Huevo", imagen: "hamb-huevo" },
    ],
  },
  salchipapa: {
    nombre: "Toppings de salchipapa y mazorcada",
    toppings: [
      { nombre: "Carne", imagen: "salchi-carne" },
      { nombre: "Pollo", imagen: "salchi-pollo" },
      { nombre: "Plátano", imagen: "salchi-platano" },
      { nombre: "Chicharrón", imagen: "salchi-chicharron" },
      { nombre: "Queso", imagen: "salchi-queso" },
      // Reemplaza al guacamole (2026-10-29).
      { nombre: "Piña", imagen: "hamb-pina" },
      { nombre: "Maíz tierno", imagen: "salchi-maiz-tierno" },
      { nombre: "Tocineta", imagen: "salchi-tocineta" },
    ],
  },
} satisfies Record<string, { nombre: string; toppings: OpcionInicial[] }>;

const CARNE: GrupoInicial = {
  titulo: "Elige tu carne",
  etiqueta: "Carne",
  opciones: [
    { nombre: "Res", imagen: "carne-res" },
    { nombre: "Pollo", imagen: "carne-pollo" },
  ],
};

export const CATEGORIAS: CategoriaInicial[] = [
  {
    nombre: "Hamburguesas",
    tituloPrincipal: "Arma tu",
    tituloPincel: "hamburguesa",
    lema: "Ingredientes de calidad, sabor único",
    productos: [
      {
        nombre: "Hamburguesa",
        descripcion: "1 carne + pan + cebolla, tomate y lechuga. Agrega los toppings que más te gusten.",
        imagen: "hamburguesa",
        niveles: [
          { nombre: "Sencilla", detalle: "1 carne + pan + cebolla, tomate y lechuga", precio: 16900 },
          { nombre: "Con 2 toppings", detalle: "1 carne + 2 toppings", precio: 19900, toppingsIncluidos: 2 },
        ],
        grupos: [CARNE],
        lista: "hamburguesa",
        precioToppingAdicional: 3900,
      },
    ],
  },
  {
    nombre: "Combo",
    tituloPincel: "En combo",
    tituloPrincipal: "con 2 toppings",
    pincelPrimero: true,
    lema: "Hamburguesa + papas + bebida",
    productos: [
      {
        nombre: "Combo con 2 toppings",
        descripcion: "Hamburguesa con 2 toppings + papas + bebida.",
        imagen: "combo",
        niveles: [{ nombre: "Combo", detalle: "Hamburguesa + papas + bebida", precio: 26900, toppingsIncluidos: 2 }],
        grupos: [CARNE],
        lista: "hamburguesa",
        maxToppings: 2,
      },
    ],
  },
  {
    nombre: "Perros",
    tituloPrincipal: "Perros",
    tituloPincel: "calientes",
    productos: [
      {
        nombre: "Perro",
        descripcion: "Pan, salchicha, queso y papitas fosforito.",
        niveles: [
          { nombre: "Sencillo", detalle: "Pan, salchicha, queso y papitas fosforito", precio: 8900 },
          { nombre: "Con 2 toppings", detalle: "Sencillo + 2 toppings", precio: 12900, toppingsIncluidos: 2 },
        ],
        lista: "hamburguesa",
        precioToppingAdicional: 3900,
      },
    ],
  },
  {
    nombre: "Salchipapas",
    tituloPrincipal: "Salchipapas",
    tituloPincel: "a tu gusto",
    lema: "Papas crujientes, salchicha premium y los toppings que más te gusten",
    productos: [
      {
        nombre: "Salchipapa",
        descripcion: "Salchicha, papa y queso. Agrega los toppings que más te gusten.",
        imagen: "salchipapas",
        niveles: [
          { nombre: "Sencilla", detalle: "Salchicha, papa y queso", precio: 15900 },
          { nombre: "Con 2 toppings", detalle: "Salchicha, papa, queso y 2 toppings", precio: 22900, toppingsIncluidos: 2 },
        ],
        lista: "salchipapa",
        precioToppingAdicional: 4900,
      },
      {
        nombre: "Salchipapa familiar",
        descripcion: "Salchicha, papa, queso y 2 toppings.",
        imagen: "salchipapas-bandeja",
        niveles: [{ nombre: "Familiar", detalle: "Salchicha, papa, queso y 2 toppings", precio: 41900, toppingsIncluidos: 2 }],
        lista: "salchipapa",
        maxToppings: 2,
      },
    ],
  },
  {
    nombre: "Mazorcadas",
    tituloPincel: "Mazorcadas",
    pincelPrimero: true,
    productos: [
      {
        nombre: "Mazorcada",
        descripcion: "Salchicha, mazorca y carne o pollo.",
        niveles: [{ nombre: "Mazorcada", precio: 22900 }],
        grupos: [{ titulo: "¿Carne o pollo?", etiqueta: "", opciones: [{ nombre: "Carne" }, { nombre: "Pollo" }] }],
      },
      {
        nombre: "Mazorcada familiar",
        descripcion: "Salchicha, mazorca, carne y pollo y 2 toppings.",
        niveles: [{ nombre: "Familiar", detalle: "Salchicha, mazorca, carne y pollo y 2 toppings", precio: 41900, toppingsIncluidos: 2 }],
        lista: "salchipapa",
        maxToppings: 2,
      },
    ],
  },
  {
    nombre: "Bebidas",
    tituloPincel: "Bebidas",
    pincelPrimero: true,
    productos: [
      { nombre: "Productos Coca-Cola", imagen: "coca-cola", niveles: [{ nombre: "Unidad", precio: 5000 }] },
      {
        nombre: "Cerveza negra 3 Cordilleras",
        imagen: "cerveza-3-cordilleras",
        niveles: [{ nombre: "Unidad", precio: 6500 }],
        nota: "El exceso de alcohol es perjudicial para la salud. Prohibida su venta a menores de edad.",
      },
    ],
  },
];

export const MESAS_INICIALES = 10;
