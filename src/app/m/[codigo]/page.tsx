import type { Metadata } from "next";
import Link from "next/link";
import { PaginaCarta } from "@/components/carta/PaginaCarta";
import { ProveedorPedido } from "@/components/pedido/ProveedorPedido";
import { cargarCarta } from "@/server/carta";
import { mesaPorCodigo } from "@/server/mesas";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mesa = await mesaPorCodigo((await params).codigo);
  return { title: mesa ? `Mesa ${mesa.numero} · ROAST` : "ROAST", robots: { index: false, follow: false } };
}

/** Carta de una mesa: lo que se escanea en el QR. Desde aquí se arma y se envía el pedido. */
export default async function PaginaMesa({ params }: Props) {
  const { codigo } = await params;
  const mesa = await mesaPorCodigo(codigo);
  if (!mesa || !mesa.activa) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
        <div className="grid max-w-md justify-items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-roast-446.webp" alt="ROAST Hamburguesas Artesanales" width={446} height={233} className="h-auto w-56" />
          <h1 className="font-display text-3xl font-bold uppercase">Este código QR ya no está activo</h1>
          <p className="text-crema/80">Pide al personal el código de tu mesa. Mientras tanto puedes ver la carta.</p>
          <Link href="/" className="boton-primario">
            Ver la carta
          </Link>
        </div>
      </main>
    );
  }
  const carta = await cargarCarta();
  const datosMesa = { codigo: mesa.codigo, numero: mesa.numero, nombre: mesa.nombre };
  return (
    <ProveedorPedido carta={carta} mesa={datosMesa}>
      <PaginaCarta carta={carta} mesa={datosMesa} />
    </ProveedorPedido>
  );
}
