"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoAjustes, IconoCarta, IconoGrafica, IconoMesa, IconoReloj } from "../Iconos";

const ENLACES = [
  { ruta: "/admin", nombre: "Pedidos", Icono: IconoReloj, soloAdmin: false },
  { ruta: "/admin/mesas", nombre: "Mesas", Icono: IconoMesa, soloAdmin: false },
  { ruta: "/admin/carta", nombre: "Carta", Icono: IconoCarta, soloAdmin: true },
  { ruta: "/admin/ventas", nombre: "Ventas", Icono: IconoGrafica, soloAdmin: false },
  { ruta: "/admin/ajustes", nombre: "Ajustes", Icono: IconoAjustes, soloAdmin: false },
];

export function EnlacesPanel({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="panel-enlaces">
      {ENLACES.filter((e) => esAdmin || !e.soloAdmin).map(({ ruta: destino, nombre, Icono }) => {
        const actual = destino === "/admin" ? ruta === "/admin" : ruta.startsWith(destino);
        return (
          <Link key={destino} href={destino} className="panel-enlace" aria-current={actual ? "page" : undefined}>
            <Icono className="size-5" />
            {nombre}
          </Link>
        );
      })}
    </nav>
  );
}
