"use client";

import { useId, useState } from "react";
import { subirFoto } from "@/app/admin/acciones";
import type { ImagenDTO } from "@/lib/carta";
import { Foto } from "../../carta/Foto";
import { IconoFoto } from "../../Iconos";

const MAX_MB = 8;
const LADO_MAX = 2000;

/**
 * Las fotos del celular pesan de 3 a 12 MB: se reducen aquí a 2000 px antes de subirlas, así suben
 * rápido con datos móviles y nunca pasan el límite. Solo JPG (cámara); si el navegador no la puede
 * leer, se sube tal cual y el servidor decide.
 */
async function reducir(archivo: File): Promise<Blob> {
  if (archivo.type !== "image/jpeg" || archivo.size <= 1.5 * 1024 * 1024) return archivo;
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();
    const reducida = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", 0.9));
    return reducida && reducida.size < archivo.size ? reducida : archivo;
  } catch {
    return archivo;
  }
}

/** Elegir una foto: se sube, el servidor la optimiza (WebP, sin metadatos) y queda la vista previa. */
export function SubirFoto({
  imagen,
  onCambiar,
  nombre,
  pequena = false,
}: {
  imagen: ImagenDTO | null;
  onCambiar: (imagen: ImagenDTO | null) => void;
  nombre: string;
  pequena?: boolean;
}) {
  const id = useId();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    const foto = await reducir(archivo);
    if (foto.size > MAX_MB * 1024 * 1024) {
      setSubiendo(false);
      setError(`La foto supera ${MAX_MB} MB. Usa una más liviana.`);
      return;
    }
    const formulario = new FormData();
    formulario.set("foto", foto, archivo.name);
    const resultado = await subirFoto(formulario);
    setSubiendo(false);
    if (resultado.ok) onCambiar(resultado.datos);
    else setError(resultado.error);
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${pequena ? "" : "sm:flex-nowrap"}`}>
      <div className={pequena ? "miniatura" : "miniatura size-28"}>
        <Foto imagen={imagen} alt="" sizes="112px" nombre={nombre} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={id} className="boton-panel cursor-pointer">
          <IconoFoto className="size-4" />
          {subiendo ? "Subiendo…" : imagen ? "Cambiar foto" : "Subir foto"}
        </label>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={subiendo}
          onChange={(e) => {
            void elegir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {imagen ? (
          <button type="button" className="boton-texto px-0 text-left text-sm" onClick={() => onCambiar(null)}>
            Quitar foto
          </button>
        ) : null}
        {error ? (
          <p className="campo-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
