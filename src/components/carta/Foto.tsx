import type { ImagenDTO } from "@/lib/carta";

interface Props {
  imagen: ImagenDTO | null;
  /** Texto alternativo; "" si la foto es decorativa (el nombre ya está escrito al lado). */
  alt: string;
  /** Ancho con que se muestra, para que el navegador elija entre la versión grande y la pequeña. */
  sizes: string;
  prioridad?: boolean;
  className?: string;
  /** Texto del respaldo cuando el producto aún no tiene foto. */
  nombre?: string;
}

/** Foto ya optimizada (WebP en dos tamaños) con su espacio reservado para que nada salte al cargar. */
export function Foto({ imagen, alt, sizes, prioridad = false, className, nombre }: Props) {
  if (!imagen) return <SinFoto nombre={nombre} className={className} />;
  const doble = imagen.ancho > 480;
  return (
    // Las fotos ya vienen optimizadas desde el servidor; next/image no aportaría nada aquí.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagen.url}
      srcSet={doble ? `${imagen.mini} 480w, ${imagen.url} ${imagen.ancho}w` : undefined}
      sizes={doble ? sizes : undefined}
      width={imagen.ancho}
      height={imagen.alto}
      alt={alt}
      loading={prioridad ? "eager" : "lazy"}
      fetchPriority={prioridad ? "high" : undefined}
      decoding="async"
      className={className}
      data-transparente={imagen.transparente || undefined}
      style={imagen.transparente ? undefined : { backgroundColor: imagen.color }}
    />
  );
}

/** Respaldo con la marca para productos sin foto (se reemplaza subiendo una desde el panel). */
function SinFoto({ nombre, className = "" }: { nombre?: string; className?: string }) {
  return (
    <span className={`sin-foto ${className}`} role="presentation">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo-roast-446.webp" alt="" width={446} height={233} className="sin-foto-logo" />
      {nombre ? <span className="sin-foto-nombre">{nombre}</span> : null}
    </span>
  );
}
