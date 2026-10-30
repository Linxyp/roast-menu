import Link from "next/link";

export default function PaginaNoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
      <div className="grid justify-items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-roast-446.webp" alt="ROAST Hamburguesas Artesanales" width={446} height={233} className="h-auto w-56" />
        <h1 className="font-display text-3xl font-bold uppercase">Esta página no existe</h1>
        <p className="text-crema/80">La carta de ROAST está en la página principal.</p>
        <Link href="/" className="boton-primario">
          Ver la carta
        </Link>
      </div>
    </main>
  );
}
