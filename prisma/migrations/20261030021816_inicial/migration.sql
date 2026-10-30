-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'PERSONAL');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('NUEVO', 'PREPARANDO', 'LISTO', 'ENTREGADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'PERSONAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vistaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imagen" (
    "id" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1a1612',
    "transparente" BOOLEAN NOT NULL DEFAULT false,
    "grande" BYTEA NOT NULL,
    "mini" BYTEA NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tituloPrincipal" TEXT,
    "tituloPincel" TEXT,
    "pincelPrimero" BOOLEAN NOT NULL DEFAULT false,
    "lema" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "agotado" BOOLEAN NOT NULL DEFAULT false,
    "listaToppingsId" TEXT,
    "precioToppingAdicional" INTEGER,
    "maxToppings" INTEGER,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelPrecio" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "detalle" TEXT,
    "precio" INTEGER NOT NULL,
    "toppingsIncluidos" INTEGER NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NivelPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoOpciones" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GrupoOpciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcionGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioExtra" INTEGER NOT NULL DEFAULT 0,
    "imagenId" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpcionGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaToppings" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListaToppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topping" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "imagenId" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Topping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT,
    "codigo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "numero" INTEGER NOT NULL,
    "mesaId" TEXT,
    "mesaNumero" INTEGER NOT NULL,
    "cliente" TEXT NOT NULL,
    "nota" TEXT,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'NUEVO',
    "total" INTEGER NOT NULL,
    "metodoPago" TEXT,
    "pagadoEn" TIMESTAMP(3),
    "impresoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "detalles" TEXT[],
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "nota" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContadorPedidos" (
    "fecha" DATE NOT NULL,
    "ultimo" INTEGER NOT NULL,

    CONSTRAINT "ContadorPedidos_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "Ajustes" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombreNegocio" TEXT NOT NULL DEFAULT 'ROAST Hamburguesas Artesanales',
    "pieRecibo" TEXT NOT NULL DEFAULT '¡Gracias por tu visita!',
    "anchoRecibo" INTEGER NOT NULL DEFAULT 80,
    "metodosPago" TEXT[] DEFAULT ARRAY['Efectivo', 'Nequi', 'Daviplata', 'Tarjeta']::TEXT[],
    "recibiendoPedidos" BOOLEAN NOT NULL DEFAULT true,
    "direccion" TEXT NOT NULL DEFAULT '',
    "horario" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimiteTasa" (
    "clave" TEXT NOT NULL,
    "conteo" INTEGER NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteTasa_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_orden_idx" ON "Producto"("categoriaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_numero_key" ON "Mesa"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_codigo_key" ON "Mesa"("codigo");

-- CreateIndex
CREATE INDEX "Pedido_estado_pagadoEn_idx" ON "Pedido"("estado", "pagadoEn");

-- CreateIndex
CREATE INDEX "Pedido_mesaId_estado_idx" ON "Pedido"("mesaId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_pagadoEn_idx" ON "Pedido"("pagadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_fecha_numero_key" ON "Pedido"("fecha", "numero");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_listaToppingsId_fkey" FOREIGN KEY ("listaToppingsId") REFERENCES "ListaToppings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelPrecio" ADD CONSTRAINT "NivelPrecio_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoOpciones" ADD CONSTRAINT "GrupoOpciones_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcionGrupo" ADD CONSTRAINT "OpcionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoOpciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcionGrupo" ADD CONSTRAINT "OpcionGrupo_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topping" ADD CONSTRAINT "Topping_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaToppings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topping" ADD CONSTRAINT "Topping_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
