import { Foto } from "./Foto";

export function Encabezado() {
  return (
    <header className="encabezado">
      <h1>
        <Foto
          id="logo-roast"
          alt="ROAST Hamburguesas Artesanales"
          sizes="(min-width: 640px) 340px, 72vw"
          prioridad
          className="encabezado-logo"
        />
        <span className="encabezado-menu">Menú</span>
      </h1>
    </header>
  );
}
