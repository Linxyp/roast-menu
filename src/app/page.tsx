import { PaginaCarta } from "@/components/carta/PaginaCarta";
import { ProveedorPedido } from "@/components/pedido/ProveedorPedido";
import { cargarCarta } from "@/server/carta";

// La carta cambia desde el panel: se arma en cada visita.
export const dynamic = "force-dynamic";

/** Carta general (sin mesa): se ve todo, pero para pedir hay que escanear el QR de la mesa. */
export default async function Inicio() {
  const carta = await cargarCarta();
  return (
    <ProveedorPedido carta={carta} mesa={null}>
      <PaginaCarta carta={carta} mesa={null} />
    </ProveedorPedido>
  );
}
