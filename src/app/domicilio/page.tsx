import type { Metadata } from "next";
import { PaginaCarta } from "@/components/carta/PaginaCarta";
import { ProveedorPedido } from "@/components/pedido/ProveedorPedido";
import { datosDomicilio } from "@/server/ajustes";
import { cargarCarta } from "@/server/carta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Domicilios · ROAST Hamburguesas Artesanales",
  description: "Arma tu pedido con la carta de ROAST y te lo llevamos a tu casa.",
};

/** Lo que abre el QR de domicilios: la carta completa y, al enviar, los datos de entrega. */
export default async function PaginaDomicilio() {
  const [carta, domicilio] = await Promise.all([cargarCarta(), datosDomicilio()]);
  const destino = { tipo: "domicilio", domicilio } as const;
  return (
    <ProveedorPedido carta={carta} destino={destino}>
      <PaginaCarta carta={carta} destino={destino} />
    </ProveedorPedido>
  );
}
