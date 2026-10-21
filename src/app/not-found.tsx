import Link from "next/link";
import { Foto } from "@/components/Foto";

export default function PaginaNoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
      <div className="grid justify-items-center gap-5">
        <Foto id="logo-roast" alt="ROAST Hamburguesas Artesanales" sizes="220px" prioridad className="h-auto w-56" />
        <h1 className="font-display text-3xl font-bold uppercase">Esta página no existe</h1>
        <p className="text-crema/80">El menú de ROAST está en la página principal.</p>
        <Link href="/" className="boton-primario">
          Ver el menú
        </Link>
      </div>
    </main>
  );
}
