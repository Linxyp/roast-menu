"""Pruebas de extremo a extremo de la carta en un navegador real (Playwright + Chromium).

Uso:  npm run test:e2e                    compila como en GitHub Pages (subcarpeta /roast-menu) y prueba
      npm run test:e2e -- --sin-compilar  usa la carpeta out/ que ya exista (compilada por esta prueba)

Requiere Python 3 con Playwright (pip install playwright && playwright install chromium).
Deja capturas en tests/e2e/capturas/ para revisar el diseño.
"""

from __future__ import annotations

import gzip
import json
import os
import re
import subprocess
import sys
import time
import traceback
import urllib.request
from pathlib import Path

from playwright.sync_api import Browser, Page, expect, sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
CAPTURAS = RAIZ / "tests" / "e2e" / "capturas"
BASE_PATH = "/roast-menu"
PUERTO = 3533
URL = f"http://localhost:{PUERTO}{BASE_PATH}/"
ENTORNO = {
    **os.environ,
    "NEXT_PUBLIC_BASE_PATH": BASE_PATH,
    "NEXT_PUBLIC_SITE_URL": URL,
    "MSYS_NO_PATHCONV": "1",
    "PORT": str(PUERTO),
}

PRECIOS = ["$16.900", "$19.900", "$3.900", "$26.900", "$22.900", "$4.900", "$5.000", "$6.500"]
TOPPINGS_HAMBURGUESA = ["Chicharrón", "Plátano maduro", "Piña", "Tocineta", "Queso", "Mazorca", "Papitas fosforito", "Guacamole", "Champiñones", "Huevo"]
TOPPINGS_SALCHIPAPAS = ["Carne", "Pollo", "Plátano", "Chicharrón", "Queso", "Guacamole", "Maíz tierno", "Tocineta"]


# ---------------------------------------------------------------- utilidades


class Vigilante:
    """Junta errores de consola, de la página y de red para fallar si aparece alguno."""

    def __init__(self, pagina: Page):
        self.errores: list[str] = []
        pagina.on("console", lambda m: self.errores.append(f"consola {m.type}: {m.text}") if m.type == "error" else None)
        pagina.on("pageerror", lambda e: self.errores.append(f"error JS: {e}"))
        pagina.on(
            "response",
            lambda r: self.errores.append(f"HTTP {r.status}: {r.url}")
            if r.status >= 400 and r.url.startswith(f"http://localhost:{PUERTO}")
            else None,
        )

    def revisar(self):
        assert not self.errores, "Errores en la página:\n" + "\n".join(self.errores)


def abrir(navegador: Browser, camino: str = "", movil: bool = True, **extra) -> tuple[Page, Vigilante]:
    opciones = (
        {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}
        if movil
        else {"viewport": {"width": 1280, "height": 860}}
    )
    contexto = navegador.new_context(locale="es-CO", **{**opciones, **extra})
    pagina = contexto.new_page()
    vigilante = Vigilante(pagina)
    pagina.goto(URL + camino, wait_until="networkidle")
    return pagina, vigilante


def capturar(pagina: Page, nombre: str, completa: bool = False):
    CAPTURAS.mkdir(parents=True, exist_ok=True)
    pagina.screenshot(path=str(CAPTURAS / f"{nombre}.png"), full_page=completa)


def recorrer(pagina: Page):
    """Baja por toda la página para que carguen las fotos diferidas."""
    alto = pagina.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < alto:
        pagina.evaluate(f"window.scrollTo(0, {y})")
        pagina.wait_for_timeout(80)
        y += 600
        alto = pagina.evaluate("document.documentElement.scrollHeight")
    pagina.evaluate("window.scrollTo(0, 0)")


def nombres_de(pagina: Page, seccion: str, paso: int) -> list[str]:
    return pagina.locator(f"#{seccion} .paso").nth(paso).locator(".opcion-nombre").all_inner_texts()


# ---------------------------------------------------------------- pruebas


def prueba_carta_completa_y_fotos(navegador: Browser):
    pagina, vigilante = abrir(navegador)
    expect(pagina).to_have_title(re.compile("ROAST"))
    expect(pagina.locator("html")).to_have_attribute("lang", "es-CO")
    expect(pagina.get_by_role("heading", level=1)).to_have_accessible_name("ROAST Hamburguesas Artesanales Menú")
    enlaces = pagina.get_by_role("navigation", name="Categorías del menú").get_by_role("link")
    expect(enlaces).to_have_text(["Hamburguesas", "Combo", "Salchipapas", "Bebidas"])
    for nombre in ["Arma tu hamburguesa", "En combo con 2 toppings", "Salchipapas a tu gusto", "Bebidas"]:
        expect(pagina.get_by_role("heading", level=2, name=nombre)).to_be_visible()

    texto = pagina.locator("main").inner_text()
    for precio in PRECIOS:
        assert precio in texto, f"No aparece {precio}"
    for frase in ["1 carne + pan + cebolla, tomate y lechuga", "Hamburguesa + papas + bebida", "Cada topping extra"]:
        assert frase.lower() in texto.lower(), f"No aparece «{frase}»"

    assert [n.title() for n in nombres_de(pagina, "hamburguesas", 0)] == ["Res", "Pollo"]
    assert [n.capitalize() for n in nombres_de(pagina, "hamburguesas", 1)] == TOPPINGS_HAMBURGUESA
    assert [n.capitalize() for n in nombres_de(pagina, "salchipapas", 0)] == TOPPINGS_SALCHIPAPAS

    recorrer(pagina)
    rotas = pagina.evaluate("[...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc || i.src)")
    assert not rotas, f"Fotos sin cargar: {rotas}"
    assert pagina.evaluate("[...document.images].every(i => i.hasAttribute('alt'))"), "Hay imágenes sin alt"
    capturar(pagina, "movil-carta", completa=True)
    vigilante.revisar()


def prueba_sin_botones_falsos(navegador: Browser):
    """Una carta de solo consulta: nada que parezca botón sin hacer algo real."""
    pagina, vigilante = abrir(navegador)
    assert pagina.locator("button, [role=button], input, select, textarea").count() == 0
    destinos = pagina.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
    for destino in destinos:
        if destino.startswith("#"):
            assert pagina.locator(destino).count() == 1, f"El enlace {destino} no lleva a ninguna sección"
        else:
            assert destino.startswith("https://"), f"Enlace inesperado: {destino}"
    vigilante.revisar()


def prueba_sin_desborde_horizontal(navegador: Browser):
    for ancho in [320, 360, 390, 430, 768, 1024, 1440]:
        pagina, _ = abrir(navegador, movil=False, viewport={"width": ancho, "height": 800})
        sobra = pagina.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert sobra <= 0, f"A {ancho}px la página se desborda {sobra}px a lo ancho"
        pagina.context.close()


def prueba_navegacion_por_categorias(navegador: Browser):
    pagina, vigilante = abrir(navegador)
    nav = pagina.get_by_role("navigation", name="Categorías del menú")
    for nombre, seccion in [("Salchipapas", "salchipapas"), ("Bebidas", "bebidas"), ("Combo", "combo"), ("Hamburguesas", "hamburguesas")]:
        nav.get_by_role("link", name=nombre).click()
        pagina.wait_for_timeout(1000)
        arriba = pagina.evaluate(f"document.getElementById('{seccion}').getBoundingClientRect().top")
        alto_nav = pagina.evaluate("document.querySelector('.nav-categorias').getBoundingClientRect().height")
        assert alto_nav - 2 <= arriba <= alto_nav + 40, f"{nombre}: la sección quedó en {arriba:.0f}px (barra de {alto_nav:.0f}px)"
        expect(nav.get_by_role("link", name=nombre)).to_have_attribute("aria-current", "true")
        expect(nav.locator("[aria-current]")).to_have_count(1)
    vigilante.revisar()


def prueba_teclado(navegador: Browser):
    pagina, vigilante = abrir(navegador, movil=False)
    pagina.keyboard.press("Tab")
    expect(pagina.get_by_role("link", name="Saltar al menú")).to_be_focused()
    pagina.keyboard.press("Enter")
    pagina.wait_for_timeout(600)
    assert pagina.evaluate("document.activeElement.id") == "menu"
    pagina.keyboard.press("Shift+Tab")
    expect(pagina.get_by_role("link", name="Bebidas")).to_be_focused()
    vigilante.revisar()


def correr_axe(pagina: Page, momento: str) -> list[str]:
    pagina.add_script_tag(path=str(RAIZ / "node_modules" / "axe-core" / "axe.min.js"))
    violaciones = pagina.evaluate(
        """async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => ({
            id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map(n => n.target.join(' '))
        }))"""
    )
    return [f"[{momento}] {v['impacto']} {v['id']}: {v['ayuda']} → {v['nodos']}" for v in violaciones]


def prueba_accesibilidad_axe(navegador: Browser):
    pagina, vigilante = abrir(navegador)
    recorrer(pagina)
    problemas = correr_axe(pagina, "carta móvil")
    escritorio, _ = abrir(navegador, movil=False)
    problemas += correr_axe(escritorio, "carta escritorio")
    qr, _ = abrir(navegador, "qr/", movil=False)
    problemas += correr_axe(qr, "página del QR")
    assert not problemas, "axe-core encontró problemas:\n" + "\n".join(problemas)
    vigilante.revisar()


def prueba_escritorio(navegador: Browser):
    pagina, vigilante = abrir(navegador, movil=False)
    recorrer(pagina)
    capturar(pagina, "escritorio-carta", completa=True)
    # Foto y precios lado a lado en pantallas grandes
    foto = pagina.locator("#hamburguesas .destacado-foto").bounding_box()
    tabla = pagina.locator("#hamburguesas .tabla-precios").bounding_box()
    assert foto and tabla and tabla["x"] > foto["x"] + foto["width"] - 1, "En escritorio la tabla debe ir junto a la foto"
    # Toppings de la hamburguesa en 2 filas de 5, como en el afiche
    filas = pagina.evaluate("new Set([...document.querySelectorAll('#hamburguesas .paso:nth-of-type(2) .opcion')].map(e => Math.round(e.getBoundingClientRect().top))).size")
    assert filas == 2, f"Los toppings de la hamburguesa ocupan {filas} filas"
    vigilante.revisar()


def prueba_pagina_qr(navegador: Browser):
    pagina, vigilante = abrir(navegador, "qr/", movil=False)
    codigo = pagina.get_by_role("img", name=re.compile("Código QR que abre la carta"))
    expect(codigo).to_have_attribute("aria-label", f"Código QR que abre la carta: {URL}")
    expect(codigo.locator("svg")).to_have_count(1)
    for nombre in ["Descargar SVG", "Descargar PNG"]:
        href = pagina.get_by_role("link", name=nombre).get_attribute("href")
        with urllib.request.urlopen(f"http://localhost:{PUERTO}{href}") as respuesta:
            assert respuesta.status == 200
    info = json.loads((RAIZ / "out" / "qr" / "qr.json").read_text(encoding="utf-8"))
    assert info["url"] == URL
    capturar(pagina, "escritorio-qr")
    vigilante.revisar()


def prueba_pagina_inexistente(navegador: Browser):
    pagina, _ = abrir(navegador, "no-existe/")
    expect(pagina.get_by_role("heading", name="Esta página no existe")).to_be_visible()
    pagina.get_by_role("link", name="Ver el menú").click()
    expect(pagina.get_by_role("navigation", name="Categorías del menú")).to_be_visible()


def prueba_peso_de_carga(navegador: Browser):
    """Lo que descarga un celular al abrir la carta. El hosting comprime HTML, CSS y JS (gzip), así que se miden así."""
    contexto = navegador.new_context(viewport={"width": 390, "height": 844})
    pagina = contexto.new_page()
    bytes_por_tipo: dict[str, int] = {}

    def contar(respuesta):
        try:
            cuerpo = respuesta.body()
        except Exception:
            return
        tipo = respuesta.request.resource_type
        tamano = len(gzip.compress(cuerpo, 6)) if tipo in ("document", "script", "stylesheet") else len(cuerpo)
        bytes_por_tipo[tipo] = bytes_por_tipo.get(tipo, 0) + tamano

    pagina.on("response", contar)
    pagina.goto(URL, wait_until="networkidle")
    lcp = pagina.evaluate(
        """() => new Promise(listo => {
            new PerformanceObserver(l => { const e = l.getEntries(); listo(Math.round(e[e.length - 1].startTime)); })
              .observe({ type: 'largest-contentful-paint', buffered: true });
            setTimeout(() => listo(-1), 3000);
        })"""
    )
    total = sum(bytes_por_tipo.values())
    resumen = ", ".join(f"{tipo} {kb / 1024:.0f} KB" for tipo, kb in sorted(bytes_por_tipo.items()))
    print(f"      primera carga: {total / 1024:.0f} KB transferidos → {resumen}; LCP local {lcp} ms")
    assert total < 600 * 1024, f"La primera carga pesa {total / 1024:.0f} KB"
    assert 0 < lcp < 2500, f"LCP de {lcp} ms"
    contexto.close()


# ---------------------------------------------------------------- ejecución


def compilar():
    print("Compilando como en GitHub Pages…")
    resultado = subprocess.run("npm run build", cwd=RAIZ, env=ENTORNO, shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if resultado.returncode != 0:
        print(resultado.stdout[-4000:], resultado.stderr[-4000:])
        sys.exit("La compilación falló")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # la consola de Windows usa cp1252
    if "--sin-compilar" not in sys.argv:
        compilar()
    servidor = subprocess.Popen(["node", "scripts/servir.mjs"], cwd=RAIZ, env=ENTORNO, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(URL, timeout=1)
                break
            except Exception:
                time.sleep(0.2)
        else:
            sys.exit(f"No se pudo servir la carta en {URL} (¿el puerto {PUERTO} está ocupado?)")
        pruebas = [(nombre, funcion) for nombre, funcion in globals().items() if nombre.startswith("prueba_")]
        fallas = 0
        with sync_playwright() as p:
            navegador = p.chromium.launch()
            for nombre, funcion in pruebas:
                inicio = time.time()
                legible = nombre.removeprefix("prueba_").replace("_", " ")
                try:
                    funcion(navegador)
                    print(f"  ✔ {legible} ({time.time() - inicio:.1f} s)")
                except Exception:
                    fallas += 1
                    print(f"  ✖ {legible}\n    " + traceback.format_exc().replace("\n", "\n    "))
                finally:
                    for contexto in navegador.contexts:
                        contexto.close()
            navegador.close()
        print(f"\n{len(pruebas) - fallas} de {len(pruebas)} pruebas pasaron. Capturas en tests/e2e/capturas/")
        return 1 if fallas else 0
    finally:
        servidor.terminate()


if __name__ == "__main__":
    sys.exit(main())
