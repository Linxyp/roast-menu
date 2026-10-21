"""Genera las imágenes optimizadas del menú ROAST a partir de los afiches de fuentes/.

Uso:  npm run imagenes   (o: python scripts/procesar-imagenes.py)

Requiere Python 3 con Pillow (soporte WebP) y numpy. Si rembg está instalado recorta el fondo
de las bebidas; si no, las deja con su fondo original. Las zonas de cada foto están en
scripts/recortes.json: para cambiar una foto basta con editar ese archivo y volver a correr esto.

Salidas (todas se versionan; el sitio no depende de Python para compilar):
  public/img/<id>-<ancho>.webp         fotos (uno o varios anchos para srcset)
  public/img/logo-roast-<ancho>.webp   logo dorado con fondo transparente
  public/og-roast.jpg                  vista previa al compartir el enlace (1200x630)
  src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico
  src/data/imagenes.generadas.ts       tamaño, proporción y color base de cada imagen
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
CONFIG = json.loads((RAIZ / "scripts" / "recortes.json").read_text(encoding="utf-8"))
SALIDA = RAIZ / "public" / "img"
MANIFIESTO = RAIZ / "src" / "data" / "imagenes.generadas.ts"
CARBON = (13, 11, 9)

AFICHES = {clave: Image.open(RAIZ / ruta).convert("RGB") for clave, ruta in CONFIG["afiches"].items()}


def fuente(item: dict) -> Image.Image:
    if "archivo" in item:
        imagen = Image.open(RAIZ / item["archivo"]).convert("RGB")
        return imagen.crop(tuple(item["caja"])) if "caja" in item else imagen
    imagen = AFICHES[item["afiche"]].crop(tuple(item["caja"]))
    return tapar(imagen, item["caja"], item.get("tapar", []))


def tapar(imagen: Image.Image, caja: list[int], zonas: list[list[int]]) -> Image.Image:
    """Cubre restos de letras del afiche con el color del fondo que las rodea."""
    if not zonas:
        return imagen
    pixeles = np.asarray(imagen).copy()
    for x0, y0, x1, y1 in zonas:
        x0, x1 = max(0, x0 - caja[0]), min(pixeles.shape[1], x1 - caja[0])
        y0, y1 = max(0, y0 - caja[1]), min(pixeles.shape[0], y1 - caja[1])
        borde = np.concatenate([
            pixeles[max(0, y0 - 3):y0, x0:x1].reshape(-1, 3),
            pixeles[y1:y1 + 3, x0:x1].reshape(-1, 3),
            pixeles[y0:y1, x1:x1 + 3].reshape(-1, 3),
        ])
        pixeles[y0:y1, x0:x1] = np.median(borde, axis=0).astype(np.uint8)
    return Image.fromarray(pixeles)


def anchos_para(ancho: int) -> list[int]:
    """El ancho original y versiones más pequeñas solo cuando ahorran peso de verdad."""
    return [ancho] + [w for w in (1200, 800, 400) if w < ancho * 0.85]


def color_base(imagen: Image.Image) -> str:
    """Color promedio (de los píxeles visibles) para pintar el espacio mientras carga la foto."""
    datos = np.asarray(imagen.convert("RGBA")).reshape(-1, 4).astype(float)
    visibles = datos[datos[:, 3] > 128] if imagen.mode == "RGBA" else datos
    if len(visibles) == 0:
        visibles = datos
    r, g, b = (visibles[:, :3].mean(axis=0) * 0.6).astype(int)  # más oscuro: el sitio es negro carbón
    return f"#{r:02x}{g:02x}{b:02x}"


def sin_fondo(imagen: Image.Image) -> Image.Image | None:
    try:
        from rembg import new_session, remove
    except ImportError:
        print("  rembg no está instalado: la bebida queda con su fondo original")
        return None
    recorte = remove(
        imagen,
        session=new_session("u2net"),
        alpha_matting=True,
        alpha_matting_foreground_threshold=235,
        alpha_matting_background_threshold=20,
        alpha_matting_erode_size=6,
    )
    alfa = np.asarray(recorte)[:, :, 3]
    alfa = np.where(alfa < 24, 0, alfa).astype(np.uint8)  # limpia el halo del fondo
    recorte.putalpha(Image.fromarray(alfa))
    caja = recorte.getbbox()
    if not caja:
        return None
    recorte = recorte.crop(caja)
    margen = round(recorte.height * 0.04)
    lienzo = Image.new("RGBA", (recorte.width + 2 * margen, recorte.height + 2 * margen), (0, 0, 0, 0))
    lienzo.paste(recorte, (margen, margen))
    return lienzo


def guardar_variantes(nombre: str, imagen: Image.Image, calidad: int) -> dict:
    variantes = []
    for ancho in anchos_para(imagen.width):
        alto = round(imagen.height * ancho / imagen.width)
        copia = imagen if ancho == imagen.width else imagen.resize((ancho, alto), Image.LANCZOS)
        copia.save(SALIDA / f"{nombre}-{ancho}.webp", "WEBP", quality=calidad, method=6)
        variantes.append(ancho)
    return {
        "anchos": variantes,
        "ancho": imagen.width,
        "alto": imagen.height,
        "color": color_base(imagen),
        "transparente": imagen.mode == "RGBA",
    }


def extraer_logo(cfg: dict) -> Image.Image:
    """Separa el logo dorado del fondo oscuro: la luminosidad se vuelve opacidad."""
    rgb = np.asarray(fuente(cfg)).astype(float) / 255
    valor = rgb.max(axis=2)
    alfa = np.clip((valor - cfg["negro"]) / (cfg["blanco"] - cfg["negro"]), 0, 1)
    alfa = alfa * alfa * (3 - 2 * alfa)
    color = np.clip(rgb / np.maximum(valor, 1e-3)[:, :, None] * np.clip(valor / cfg["blanco"], 0, 1)[:, :, None], 0, 1)
    rgba = np.dstack([color, alfa])
    logo = Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA")
    caja = Image.fromarray((alfa > 0.04).astype(np.uint8) * 255).getbbox()
    return logo.crop(caja) if caja else logo


def lienzo_carbon(ancho: int, alto: int) -> Image.Image:
    """Fondo negro carbón con un brillo cálido suave al centro, como el de los afiches."""
    y, x = np.mgrid[0:alto, 0:ancho]
    distancia = np.sqrt(((x - ancho * 0.5) / ancho) ** 2 + ((y - alto * 0.45) / alto) ** 2)
    brillo = np.clip(1 - distancia * 1.6, 0, 1)[:, :, None]
    base = np.array(CARBON, dtype=float)[None, None, :]
    calido = np.array((48, 32, 16), dtype=float)[None, None, :]
    return Image.fromarray((base + (calido - base) * brillo * 0.55).astype(np.uint8), "RGB")


def con_logo(tamano: int, escala: float, logo: Image.Image) -> Image.Image:
    lienzo = lienzo_carbon(tamano, tamano).convert("RGBA")
    ancho = round(tamano * escala)
    alto = round(logo.height * ancho / logo.width)
    pieza = logo.resize((ancho, alto), Image.LANCZOS)
    lienzo.alpha_composite(pieza, ((tamano - ancho) // 2, (tamano - alto) // 2))
    return lienzo.convert("RGB")


def imagen_compartir(logo: Image.Image, foto: Image.Image) -> Image.Image:
    ancho, alto = 1200, 630
    lienzo = lienzo_carbon(ancho, alto).convert("RGBA")
    foto_alto = alto
    foto_ancho = round(foto.width * foto_alto / foto.height)
    pieza = foto.resize((foto_ancho, foto_alto), Image.LANCZOS).convert("RGBA")
    rampa = np.clip(np.linspace(-0.15, 1.6, foto_ancho), 0, 1)
    mascara = Image.fromarray((np.tile(rampa, (foto_alto, 1)) * 255).astype(np.uint8))
    pieza.putalpha(mascara)
    lienzo.alpha_composite(pieza, (ancho - foto_ancho, 0))
    logo_ancho = 470
    logo_alto = round(logo.height * logo_ancho / logo.width)
    lienzo.alpha_composite(logo.resize((logo_ancho, logo_alto), Image.LANCZOS), (70, (alto - logo_alto) // 2))
    return lienzo.convert("RGB")


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for viejo in SALIDA.glob("*.webp"):
        viejo.unlink()
    manifiesto: dict[str, dict] = {}

    for nombre, item in CONFIG["fotos"].items():
        imagen = fuente(item)
        if item.get("sin_fondo"):
            imagen = sin_fondo(imagen) or imagen
        manifiesto[nombre] = guardar_variantes(nombre, imagen, 82)
        print(f"  {nombre}: {imagen.width}x{imagen.height}")

    logo = extraer_logo(CONFIG["logo"])
    manifiesto["logo-roast"] = guardar_variantes("logo-roast", logo, 90)
    print(f"  logo-roast: {logo.width}x{logo.height}")

    app = RAIZ / "src" / "app"
    con_logo(512, 0.84, logo).save(app / "icon.png", optimize=True)
    con_logo(180, 0.86, logo).save(app / "apple-icon.png", optimize=True)
    # En 16-48 px el logo completo no se lee: el favicon usa solo la "O" con la llama.
    # Next exige que los PNG dentro del .ico sean RGBA.
    con_logo(64, 0.9, extraer_logo(CONFIG["marca"])).convert("RGBA").save(
        app / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    imagen_compartir(logo, fuente(CONFIG["fotos"]["hamburguesa"])).save(
        RAIZ / "public" / "og-roast.jpg", quality=86, optimize=True, progressive=True
    )

    MANIFIESTO.write_text(
        "// Archivo generado por scripts/procesar-imagenes.py (npm run imagenes). No editar a mano.\n\n"
        "export interface InfoImagen {\n  anchos: readonly number[];\n  ancho: number;\n  alto: number;\n"
        "  color: string;\n  transparente: boolean;\n}\n\n"
        f"export const IMAGENES: Record<string, InfoImagen> = {json.dumps(manifiesto, indent=2, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    peso = sum(f.stat().st_size for f in SALIDA.glob("*.webp")) / 1024
    print(f"Listo: {len(manifiesto)} imágenes ({peso:.0f} KB en public/img) y manifiesto en {MANIFIESTO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
