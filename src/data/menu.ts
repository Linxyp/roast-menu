// CARTA DE ROAST — fuente única de productos, precios, toppings y fotos.
// Todo sale de los dos afiches del negocio (fuentes/). Para cambiar un precio o un topping se edita
// solo este archivo y se vuelve a publicar. Precios en pesos colombianos, sin puntos: 16900 = $16.900.

import type { Categoria, Opcion, Producto } from "./tipos.ts";

export const CATEGORIAS: Categoria[] = [
  {
    id: "hamburguesas",
    nombre: "Hamburguesas",
    titulo: { principal: "Arma tu", pincel: "hamburguesa", pincelPrimero: false },
    lema: "Ingredientes de calidad, sabor único",
  },
  {
    id: "combo",
    nombre: "Combo",
    titulo: { pincel: "En combo", principal: "con 2 toppings", pincelPrimero: true },
    lema: "Hamburguesa + papas + bebida",
  },
  {
    id: "salchipapas",
    nombre: "Salchipapas",
    titulo: { principal: "Salchipapas", pincel: "a tu gusto", pincelPrimero: false },
    lema: "Papas crujientes, salchicha premium y los toppings que más te gusten",
  },
  {
    id: "bebidas",
    nombre: "Bebidas",
    titulo: { pincel: "Bebidas", pincelPrimero: true },
  },
];

const CARNES: Opcion[] = [
  { id: "res", nombre: "Res", imagen: "carne-res" },
  { id: "pollo", nombre: "Pollo", imagen: "carne-pollo" },
];

const TOPPINGS_HAMBURGUESA: Opcion[] = [
  { id: "chicharron", nombre: "Chicharrón", imagen: "hamb-chicharron" },
  { id: "platano-maduro", nombre: "Plátano maduro", imagen: "hamb-platano-maduro" },
  { id: "pina", nombre: "Piña", imagen: "hamb-pina" },
  { id: "tocineta", nombre: "Tocineta", imagen: "hamb-tocineta" },
  { id: "queso", nombre: "Queso", imagen: "hamb-queso" },
  { id: "mazorca", nombre: "Mazorca", imagen: "hamb-mazorca" },
  { id: "papitas-fosforito", nombre: "Papitas fosforito", imagen: "hamb-papitas-fosforito" },
  { id: "guacamole", nombre: "Guacamole", imagen: "hamb-guacamole" },
  { id: "champinones", nombre: "Champiñones", imagen: "hamb-champinones" },
  { id: "huevo", nombre: "Huevo", imagen: "hamb-huevo" },
];

const TOPPINGS_SALCHIPAPAS: Opcion[] = [
  { id: "carne", nombre: "Carne", imagen: "salchi-carne" },
  { id: "pollo", nombre: "Pollo", imagen: "salchi-pollo" },
  { id: "platano", nombre: "Plátano", imagen: "salchi-platano" },
  { id: "chicharron", nombre: "Chicharrón", imagen: "salchi-chicharron" },
  { id: "queso", nombre: "Queso", imagen: "salchi-queso" },
  { id: "guacamole", nombre: "Guacamole", imagen: "salchi-guacamole" },
  { id: "maiz-tierno", nombre: "Maíz tierno", imagen: "salchi-maiz-tierno" },
  { id: "tocineta", nombre: "Tocineta", imagen: "salchi-tocineta" },
];

export const PRODUCTOS: Producto[] = [
  {
    tipo: "armable",
    id: "hamburguesa",
    categoria: "hamburguesas",
    nombre: "Hamburguesa",
    imagen: "hamburguesa",
    altImagen: "Hamburguesa artesanal de ROAST",
    precios: [
      { nombre: "Sencilla", detalle: "1 carne + pan + cebolla, tomate y lechuga", precio: 16900 },
      { nombre: "Con 2 toppings", detalle: "1 carne + 2 toppings", precio: 19900 },
      { nombre: "Topping adicional", detalle: "Cada topping extra", precio: 3900 },
    ],
    pasos: [
      { titulo: "Elige tu carne", eleccion: "una", opciones: CARNES },
      {
        titulo: "Elige tus toppings",
        ayuda: "Agrega los toppings que más te gusten",
        eleccion: "varias",
        opciones: TOPPINGS_HAMBURGUESA,
      },
    ],
  },
  {
    tipo: "armable",
    id: "combo",
    categoria: "combo",
    nombre: "Combo",
    imagen: "combo",
    altImagen: "Combo de hamburguesa, papas y bebida",
    // Lo que incluye ya va en el encabezado de la sección (lema e íconos), como en el afiche.
    precios: [{ nombre: "Combo", precio: 26900 }],
  },
  {
    tipo: "armable",
    id: "salchipapas",
    categoria: "salchipapas",
    nombre: "Salchipapas",
    imagen: "salchipapas",
    altImagen: "Salchipapas de ROAST",
    precios: [
      { nombre: "Salchipapas con 2 toppings", precio: 22900 },
      { nombre: "Topping adicional", precio: 4900 },
    ],
    pasos: [
      {
        titulo: "Elige tus toppings",
        ayuda: "Agrega los toppings que más te gusten",
        eleccion: "varias",
        opciones: TOPPINGS_SALCHIPAPAS,
      },
    ],
  },
  {
    tipo: "simple",
    id: "coca-cola",
    categoria: "bebidas",
    nombre: "Coca-Cola en lata",
    precio: 5000,
    imagen: "coca-cola",
  },
  {
    tipo: "simple",
    id: "cerveza-negra-3-cordilleras",
    categoria: "bebidas",
    nombre: "Cerveza negra 3 Cordilleras",
    precio: 6500,
    imagen: "cerveza-3-cordilleras",
    nota: "El exceso de alcohol es perjudicial para la salud. Prohibida su venta a menores de edad.",
  },
];

export function productosDe(categoria: Categoria["id"]): Producto[] {
  return PRODUCTOS.filter((producto) => producto.categoria === categoria);
}
