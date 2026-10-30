// Deja la base de pruebas como una instalación nueva para la prueba de punta a punta:
// migraciones al día, tablas vacías y la siembra inicial (carta, 8 mesas, administrador).
// La última línea que imprime es el JSON { número de mesa: código }.
import { execSync } from "node:child_process";
import { RAIZ, urlBasePruebas } from "../integracion/base-pruebas";

async function main() {
  const env = { ...process.env, DATABASE_URL: urlBasePruebas() };
  process.env.DATABASE_URL = env.DATABASE_URL;
  execSync("npx prisma migrate deploy", { cwd: RAIZ, env, stdio: "ignore" });

  const { vaciarBase } = await import("../integracion/fabrica");
  const { db } = await import("../../src/server/db");
  await vaciarBase();
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { cwd: RAIZ, env, stdio: "ignore" });
  const mesas = await db.mesa.findMany({ orderBy: { numero: "asc" }, select: { numero: true, codigo: true } });
  await db.$disconnect();
  console.log(JSON.stringify(Object.fromEntries(mesas.map((m) => [m.numero, m.codigo]))));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
