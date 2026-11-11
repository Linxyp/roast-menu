-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('MESA', 'DOMICILIO');

-- AlterTable
ALTER TABLE "Ajustes" ADD COLUMN     "costoDomicilio" INTEGER,
ADD COLUMN     "domiciliosActivos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pedidoMinimoDomicilio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telefonoNegocio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "zonaDomicilio" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "barrio" TEXT,
ADD COLUMN     "costoEnvio" INTEGER,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "pagaCon" INTEGER,
ADD COLUMN     "pagoPreferido" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "tipo" "TipoPedido" NOT NULL DEFAULT 'MESA',
ALTER COLUMN "mesaNumero" DROP NOT NULL;
