import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Códigos de conexión transitoria (nunca errores de datos: esos no se reintentan). */
const REINTENTABLES = new Set(["P1017", "P1001", "P1002", "P1008"]);

function conReintento(cliente: PrismaClient) {
  return cliente.$extends({
    name: "reintento-conexion",
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          // Docker Desktop en Windows a veces cierra en silencio una conexión del pool;
          // un único reintento basta: el pool abre una nueva.
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !REINTENTABLES.has(error.code)) throw error;
          return await query(args);
        }
      },
    },
  });
}

export function crearCliente(url = process.env.DATABASE_URL) {
  const adapter = new PrismaPg({
    connectionString: url,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    idleTimeoutMillis: 15_000,
  });
  return conReintento(new PrismaClient({ adapter }));
}

type ClienteBase = ReturnType<typeof crearCliente>;

declare global {
  var __roastDb: ClienteBase | undefined;
}

// Evita abrir un pool nuevo en cada recarga en caliente de `next dev`.
export const db = globalThis.__roastDb ?? crearCliente();
if (process.env.NODE_ENV !== "production") globalThis.__roastDb = db;

/** Lo que comparten `db` y el cliente de una transacción interactiva. */
export type Tx = Omit<ClienteBase, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export { Prisma };
