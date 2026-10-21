import { IMAGENES } from "@/data/imagenes.generadas";
import { ruta } from "@/lib/ruta";

interface Props {
  /** Clave en imagenes.generadas.ts. */
  id: string;
  /** Texto alternativo; "" si la foto es decorativa (su nombre ya está escrito al lado). */
  alt: string;
  /** Ancho con que se muestra, para que el navegador elija el archivo justo. */
  sizes: string;
  /** Solo para la imagen principal de la primera pantalla. */
  prioridad?: boolean;
  className?: string;
}

/** Foto ya optimizada (WebP en uno o varios anchos), con su tamaño reservado para que nada salte al cargar. */
export function Foto({ id, alt, sizes, prioridad = false, className }: Props) {
  const info = IMAGENES[id];
  if (!info) return null;
  const archivo = (ancho: number) => ruta(`/img/${id}-${ancho}.webp`);
  return (
    // Sitio estático: las variantes ya vienen optimizadas, next/image no aportaría nada aquí.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={archivo(info.ancho)}
      srcSet={info.anchos.length > 1 ? info.anchos.map((ancho) => `${archivo(ancho)} ${ancho}w`).join(", ") : undefined}
      sizes={info.anchos.length > 1 ? sizes : undefined}
      width={info.ancho}
      height={info.alto}
      alt={alt}
      loading={prioridad ? "eager" : "lazy"}
      fetchPriority={prioridad ? "high" : undefined}
      decoding="async"
      className={className}
      data-transparente={info.transparente || undefined}
      style={info.transparente ? undefined : { backgroundColor: info.color }}
    />
  );
}
