import { afterAll } from "vitest";
import { urlBasePruebas } from "./base-pruebas";

// Antes de que cada archivo importe los servicios: todos usan la base de pruebas.
process.env.DATABASE_URL = urlBasePruebas();
process.env.APP_URL = "https://roast.ejemplo";
process.env.AUTH_SECRET ||= "secreto-solo-para-pruebas-".repeat(3);

afterAll(async () => {
  const { db } = await import("@/server/db");
  await db.$disconnect();
});
