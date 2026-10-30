import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EnlacesPanel } from "@/components/panel/EnlacesPanel";
import { PanelVivo } from "@/components/panel/PanelVivo";
import { IconoSalir } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { salir } from "../acciones";
import "../admin.css";

export const metadata: Metadata = {
  title: { default: "Panel · ROAST", template: "%s · Panel ROAST" },
  robots: { index: false, follow: false },
};

export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const usuario = await requerirPagina();
  return (
    <PanelVivo>
      <div className="panel">
        <header className="panel-menu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-roast-446.webp" alt="ROAST" width={446} height={233} className="panel-logo" />
          <EnlacesPanel esAdmin={usuario.rol === "ADMIN"} />
          <form action={salir} className="panel-salir-movil">
            <button type="submit" className="boton-panel boton-panel-mini" aria-label="Salir del panel">
              <IconoSalir className="size-4" />
            </button>
          </form>
          <div className="panel-usuario">
            <span>
              {usuario.nombre}
              <br />
              <small className="text-crema/60">{usuario.rol === "ADMIN" ? "Administrador" : "Personal"}</small>
            </span>
            <form action={salir}>
              <button type="submit" className="boton-panel w-full">
                <IconoSalir className="size-4" />
                Salir
              </button>
            </form>
          </div>
        </header>
        <main className="panel-contenido">{children}</main>
      </div>
    </PanelVivo>
  );
}
