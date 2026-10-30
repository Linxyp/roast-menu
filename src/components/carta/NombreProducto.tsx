/**
 * Nombre sin partir las palabras con guion: el navegador cortaría «Coca-Cola» en el guion al saltar
 * de línea. Va dentro de un solo <span> para que un contenedor flex no se coma los espacios.
 */
export function NombreProducto({ nombre }: { nombre: string }) {
  return (
    <span>
      {nombre.split(/(\S+-\S+)/).map((parte, i) =>
        i % 2 ? (
          <span key={i} className="whitespace-nowrap">
            {parte}
          </span>
        ) : (
          parte
        ),
      )}
    </span>
  );
}
