import { execSync } from "node:child_process";
import { RAIZ, urlBasePruebas } from "./base-pruebas";

/** Una vez antes de todas las pruebas: deja las migraciones al día en la base de pruebas. */
export default function preparar() {
  execSync("npx prisma migrate deploy", {
    cwd: RAIZ,
    env: { ...process.env, DATABASE_URL: urlBasePruebas() },
    stdio: "inherit",
  });
}
