"""Prueba de punta a punta del sistema ROAST en un navegador real (Playwright + Chromium).

    npm run test:e2e                                   compila (next build) y prueba
    python tests/e2e/test_sistema.py --sin-compilar    prueba la compilación que ya existe
    python tests/e2e/test_sistema.py --docker          prueba la imagen de producción (docker build)

Recorre lo que hace el restaurante en un día: el cliente pide desde el QR de su mesa, el
panel lo recibe en vivo, sale la comanda, la cocina avanza el pedido, la caja cobra y las
ventas cuadran. También edita la carta, agrega una mesa (y lee su QR), prueba permisos,
accesibilidad (axe) y que nada se desborde en un celular.

Usa la base DATABASE_URL_TEST (debe llamarse «…_test»): la vacía y la vuelve a sembrar.
Requiere el Postgres de docker-compose encendido, .env y Playwright para Python
(pip install playwright && python -m playwright install chromium).
Las capturas y el registro del servidor quedan en tests/e2e/capturas/.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from collections.abc import Callable
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import Browser, Page, expect, sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

RAIZ = Path(__file__).resolve().parents[2]
CAPTURAS = RAIZ / "tests" / "e2e" / "capturas"
PUERTO = 3521
BASE = f"http://localhost:{PUERTO}"
ADMIN = ("admin", "Prueba-e2e-2026")
CAJA = ("caja", "Caja-e2e-2026")
NPX = shutil.which("npx") or "npx"
CONTENEDOR = "roast-e2e"
AXE = (RAIZ / "node_modules" / "axe-core" / "axe.min.js").read_text(encoding="utf-8")
JSQR = (RAIZ / "node_modules" / "jsqr" / "dist" / "jsQR.js").read_text(encoding="utf-8")
ESCRITORIO = {"viewport": {"width": 1366, "height": 860}, "bypass_csp": True}
CELULAR = {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True, "bypass_csp": True}

# Dibuja el SVG del QR en un lienzo y lo lee con jsQR, como lo haría la cámara de un celular.
LEER_QR = """async (svg) => {
  const copia = svg.cloneNode(true);
  copia.setAttribute("width", "400");
  copia.setAttribute("height", "400");
  const imagen = new Image();
  imagen.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  await imagen.decode();
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 440;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 440, 440);
  ctx.drawImage(imagen, 20, 20, 400, 400);
  return jsQR(ctx.getImageData(0, 0, 440, 440).data, 440, 440)?.data ?? null;
}"""

expect.set_options(timeout=10_000)
errores_consola: list[str] = []
# Errores de consola que un paso provoca a propósito (p. ej. el 409 de un pedido rechazado).
tolerados: set[str] = set()
paginas: dict[str, Page] = {}


# ---------------------------------------------------------------------------
# Entorno, base y servidor
# ---------------------------------------------------------------------------


def entorno() -> dict[str, str]:
    """Variables de .env (sin pisar las ya definidas) apuntando a la base de pruebas."""
    env = dict(os.environ)
    archivo = RAIZ / ".env"
    if archivo.exists():
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\s*([A-Za-z_]\w*)\s*=\s*(.*)", linea)
            if m:
                env.setdefault(m.group(1), m.group(2).strip().strip("\"'"))
    url = env.get("DATABASE_URL_TEST", "")
    if not re.search(r"/\w+_test(\?|$)", url):
        sys.exit("DATABASE_URL_TEST debe apuntar a una base «…_test»: esta prueba borra sus datos.")
    env.update(
        DATABASE_URL=url,
        APP_URL=BASE,
        SEED_ADMIN_USUARIO=ADMIN[0],
        SEED_ADMIN_CLAVE=ADMIN[1],
        SEED_ADMIN_NOMBRE="Administrador",
    )
    env.setdefault("AUTH_SECRET", "secreto-solo-para-pruebas-e2e-" * 2)
    return env


def preparar_base(env: dict[str, str]) -> dict[str, str]:
    """Base vacía y sembrada; devuelve {número de mesa: código}."""
    salida = subprocess.run(
        [NPX, "tsx", "--conditions=react-server", "tests/e2e/preparar-base.ts"],
        cwd=RAIZ, env=env, capture_output=True, text=True, encoding="utf-8",
    )
    if salida.returncode != 0:
        sys.exit(f"No se pudo preparar la base de pruebas:\n{salida.stderr}")
    return json.loads(salida.stdout.strip().splitlines()[-1])


def iniciar_servidor(env: dict[str, str], en_docker: bool) -> Callable[[], None]:
    """Arranca `next start` (o la imagen de producción en Docker) y devuelve cómo detenerlo."""
    with socket.socket() as s:
        if s.connect_ex(("127.0.0.1", PUERTO)) == 0:
            sys.exit(f"El puerto {PUERTO} está ocupado: cierra el servidor que quedó abierto.")
    registro = CAPTURAS / "servidor.log"
    if en_docker:
        # El contenedor llega al Postgres de este equipo por host.docker.internal.
        url = re.sub(r"@(127\.0\.0\.1|localhost):", "@host.docker.internal:", env["DATABASE_URL"])
        subprocess.run(["docker", "rm", "-f", CONTENEDOR], capture_output=True)
        subprocess.run(
            [
                "docker", "run", "-d", "--name", CONTENEDOR, "-p", f"{PUERTO}:3000", "--add-host=host.docker.internal:host-gateway",
                "-e", f"DATABASE_URL={url}", "-e", f"APP_URL={BASE}", "-e", f"AUTH_SECRET={env['AUTH_SECRET']}", "roast-menu:latest",
            ],
            check=True, capture_output=True,
        )

        def vivo() -> bool:
            estado = subprocess.run(["docker", "inspect", "-f", "{{.State.Running}}", CONTENEDOR], capture_output=True, text=True)
            return estado.stdout.strip() == "true"

        def detener() -> None:
            with open(registro, "w", encoding="utf-8") as salida:
                subprocess.run(["docker", "logs", CONTENEDOR], stdout=salida, stderr=subprocess.STDOUT)
            subprocess.run(["docker", "rm", "-f", CONTENEDOR], capture_output=True)
    else:
        salida = open(registro, "w", encoding="utf-8")
        aparte = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
        proceso = subprocess.Popen(
            [NPX, "next", "start", "-p", str(PUERTO)], cwd=RAIZ, env=env, stdout=salida, stderr=subprocess.STDOUT, **aparte
        )

        def vivo() -> bool:
            return proceso.poll() is None

        def detener() -> None:
            if proceso.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(proceso.pid), "/T", "/F"], capture_output=True)
                else:
                    os.killpg(proceso.pid, signal.SIGTERM)
                proceso.wait(timeout=20)
            salida.close()

    limite = time.time() + 90
    while time.time() < limite:
        if not vivo():
            detener()
            sys.exit("El servidor se cerró al arrancar (ver tests/e2e/capturas/servidor.log).")
        try:
            with urllib.request.urlopen(f"{BASE}/api/salud", timeout=3) as respuesta:
                if respuesta.status == 200:
                    return detener
        except OSError:
            time.sleep(0.5)
    detener()
    sys.exit("El servidor no respondió en 90 s (ver tests/e2e/capturas/servidor.log).")


# ---------------------------------------------------------------------------
# Ayudas
# ---------------------------------------------------------------------------


def vigilar(pagina: Page, quien: str) -> Page:
    def consola(mensaje) -> None:
        if mensaje.type == "error" and not any(t in mensaje.text for t in tolerados):
            errores_consola.append(f"[{quien}] {mensaje.text}")

    pagina.on("console", consola)
    pagina.on("pageerror", lambda e: errores_consola.append(f"[{quien}] {e}"))
    paginas[quien] = pagina
    return pagina


@contextmanager
def paso(nombre: str):
    print(f"• {nombre}…", end="", flush=True)
    inicio = time.time()
    try:
        yield
    except Exception:
        print(" ✘", flush=True)
        for quien, pagina in paginas.items():
            if not pagina.is_closed():
                pagina.screenshot(path=CAPTURAS / f"fallo-{quien}.png", full_page=True)
        raise
    print(f" ✔ ({time.time() - inicio:.1f} s)", flush=True)


def accesibilidad(pagina: Page, donde: str) -> None:
    """axe-core: falla con problemas graves o críticos; los menores solo se avisan."""
    # Con una hoja a media animación (opacidad < 1) el contraste se mediría mal.
    pagina.wait_for_function("() => document.getAnimations().every((a) => a.playState !== 'running')")
    if not pagina.evaluate("() => 'axe' in window"):
        pagina.add_script_tag(content=AXE)
    violaciones = pagina.evaluate(
        """async () => (await axe.run(document, { resultTypes: ["violations"] })).violations
             .map((v) => ({ regla: v.id, impacto: v.impact, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))"""
    )
    graves = [v for v in violaciones if v["impacto"] in ("serious", "critical")]
    for v in violaciones:
        if v not in graves:
            print(f"\n    aviso de accesibilidad en {donde}: {v['regla']} {v['nodos']}", end="")
    assert not graves, f"Accesibilidad en {donde}: {json.dumps(graves, ensure_ascii=False)}"


def sin_desborde(pagina: Page, donde: str) -> None:
    ancho = pagina.evaluate("() => document.documentElement.scrollWidth")
    vista = pagina.viewport_size["width"]
    assert ancho <= vista, f"{donde}: la página mide {ancho} px en una pantalla de {vista} px"


def ingresar(pagina: Page, usuario: str, clave: str) -> None:
    pagina.get_by_label("Usuario").fill(usuario)
    pagina.get_by_label("Contraseña").fill(clave)
    pagina.get_by_role("button", name="Ingresar").click()


def interruptor(pagina: Page, etiqueta: str, activo: bool) -> None:
    """Cambia un interruptor del panel y espera a que el servidor guarde el cambio."""
    with pagina.expect_response(lambda r: r.request.method == "POST" and "next-action" in r.request.headers):
        pagina.get_by_label(etiqueta).set_checked(activo)


def armar(pagina: Page, producto: str, opciones=(), toppings=(), nota: str | None = None, boton="Armar y agregar") -> None:
    """Abre un producto en la carta de la mesa, lo arma y lo agrega al pedido."""
    pagina.get_by_role("button", name=f"{boton} {producto}").click()
    hoja = pagina.locator("dialog[open]")
    expect(hoja).to_be_visible()
    for opcion in opciones:
        hoja.locator("label.opcion", has_text=opcion).first.click()
    for topping in toppings:
        hoja.locator("label.opcion", has_text=re.compile(f"^{topping}")).first.click()
    if nota:
        hoja.get_by_label("Indicaciones para la cocina").fill(nota)
    hoja.locator("button[type=submit]").click()
    expect(pagina.locator("dialog[open]")).to_have_count(0)


def tarjeta(pagina: Page, numero: int, mesa: int):
    return pagina.get_by_role("article", name=f"Pedido {numero}, mesa {mesa}")


def menu(pagina: Page):
    return pagina.get_by_role("navigation", name="Secciones del panel")


# ---------------------------------------------------------------------------
# Recorrido
# ---------------------------------------------------------------------------


def probar(navegador: Browser, mesas: dict[str, str]) -> None:
    panel = navegador.new_context(**ESCRITORIO)
    pp = vigilar(panel.new_page(), "panel")
    cliente = navegador.new_context(**CELULAR)
    cp = vigilar(cliente.new_page(), "cliente")

    with paso("El panel pide ingresar y rechaza una contraseña equivocada"):
        pp.goto(f"{BASE}/admin/mesas")
        expect(pp).to_have_url(re.compile(r"/admin/ingresar\?siguiente="))
        accesibilidad(pp, "ingreso al panel")
        ingresar(pp, ADMIN[0], "No-es-la-clave-1")
        expect(pp.locator("p[role=alert]")).to_have_text("Usuario o contraseña incorrectos.")

    with paso("El administrador ingresa y llega a la página que pidió"):
        ingresar(pp, *ADMIN)
        expect(pp).to_have_url(f"{BASE}/admin/mesas")
        for seccion in ["Pedidos", "Mesas", "Carta", "Ventas", "Ajustes"]:
            expect(menu(pp).get_by_role("link", name=seccion)).to_be_visible()
        expect(pp.get_by_role("link", name=re.compile(r"^Mesa 10\b"))).to_be_visible()
        accesibilidad(pp, "mesas")
        menu(pp).get_by_role("link", name="Pedidos").click()
        expect(pp.locator(".indicador-vivo[data-conectado=true]")).to_be_visible()
        accesibilidad(pp, "tablero de pedidos")

    with paso("La carta general (sin mesa) se ve pero no deja pedir"):
        cp.goto(BASE + "/")
        expect(cp.get_by_role("article", name="Hamburguesa")).to_be_visible()
        expect(cp.get_by_role("button", name="Ver opciones de Hamburguesa")).to_be_visible()
        expect(cp.get_by_role("button", name=re.compile("^Armar y agregar"))).to_have_count(0)
        expect(cp.locator(".barra-pedido-boton")).to_have_count(0)
        sin_desborde(cp, "carta general")
        accesibilidad(cp, "carta general")

    with paso("Mesa 3 arma su pedido: hamburguesa de pollo con 3 toppings, 2 perros y gaseosa"):
        cp.goto(f"{BASE}/m/{mesas['3']}")
        expect(cp.get_by_text("Mesa 3").first).to_be_visible()
        sin_desborde(cp, "carta de la mesa")
        accesibilidad(cp, "carta de la mesa")
        armar(cp, "Hamburguesa", opciones=["Pollo"], toppings=["Piña", "Tocineta", "Queso"], nota="sin cebolla")
        armar(cp, "Perro")
        armar(cp, "Productos Coca-Cola", boton="Agregar", nota="Coca-Cola Zero")
        cp.locator(".barra-pedido-boton").click()
        hoja = cp.locator("dialog[open]")
        hoja.get_by_role("group", name="Cantidad de Perro sencillo").get_by_role("button", name="Agregar uno").click()
        for texto in ["Hamburguesa con 2 toppings", "$23.800", "Perro sencillo", "$17.800", "Productos Coca-Cola", "$5.000", "$46.600"]:
            expect(hoja).to_contain_text(texto)
        expect(cp.locator(".barra-pedido-boton")).to_have_attribute("aria-label", re.compile(r"4 productos, total \$46\.600"))
        sin_desborde(cp, "pedido en el celular")
        accesibilidad(cp, "pedido en el celular")
        cp.screenshot(path=CAPTURAS / "cliente-pedido.png")

    with paso("El cliente envía y ve «Mis pedidos»"):
        hoja.get_by_role("button", name=re.compile("Enviar pedido")).click()
        expect(hoja.locator("#error-cliente")).to_be_visible()  # falta el nombre
        hoja.get_by_label("Tu nombre").fill("Ana")
        hoja.get_by_role("button", name=re.compile("Enviar pedido")).click()
        expect(cp.get_by_role("heading", name="Mis pedidos")).to_be_visible()
        seguimiento = cp.locator("article.seguimiento").first
        expect(seguimiento).to_contain_text("Pedido #1")
        expect(seguimiento).to_contain_text("$46.600")
        expect(seguimiento).to_contain_text("«sin cebolla»")
        accesibilidad(cp, "mis pedidos")

    with paso("El panel recibe el pedido en vivo con todo el detalle"):
        pedido = tarjeta(pp, 1, 3)
        expect(pedido).to_be_visible(timeout=15_000)
        for texto in [
            "Ana", "Hamburguesa con 2 toppings", "Carne: Pollo", "Toppings: Piña, Tocineta, Queso",
            "1 topping adicional (+$3.900 c/u)", "«sin cebolla»", "Perro sencillo", "«Coca-Cola Zero»", "$46.600",
        ]:
            expect(pedido).to_contain_text(texto)
        expect(pedido.locator(".pedido-item-cantidad")).to_have_text(["1×", "2×", "1×"])
        pp.screenshot(path=CAPTURAS / "panel-pedido-nuevo.png")

    with paso("Sale la comanda para la cocina"):
        pedido.get_by_role("button", name="Imprimir comanda del pedido 1").click()
        expect(pedido.get_by_role("button", name="Reimprimir comanda del pedido 1")).to_be_visible()
        ruta = pp.locator("iframe[aria-hidden=true]").last.get_attribute("src")
        assert ruta and ruta.startswith("/admin/imprimir/pedido/"), ruta
        comanda = vigilar(panel.new_page(), "comanda")
        comanda.goto(BASE + ruta)
        recibo = comanda.locator(".recibo")
        for texto in ["Comanda", "#1", "MESA 3", "Cliente: Ana", "Hamburguesa con 2 toppings", "Carne: Pollo", "«sin cebolla»", "Perro sencillo", "$46.600", "POR COBRAR"]:
            expect(recibo).to_contain_text(texto)
        comanda.screenshot(path=CAPTURAS / "comanda.png", full_page=True)
        comanda.close()

    with paso("La cocina lo prepara y el cliente ve el avance en su celular"):
        pedido.get_by_role("button", name="Preparar", exact=True).click()
        pedido.get_by_role("button", name="Listo", exact=True).click()
        expect(pedido.get_by_role("button", name="Entregado", exact=True)).to_be_visible()
        expect(cp.locator("ol.seguimiento-pasos li[aria-current=step]")).to_have_text("Listo", timeout=15_000)

    with paso("Se entrega y se cobra en efectivo"):
        pedido.get_by_role("button", name="Entregado", exact=True).click()
        pedido.get_by_role("button", name="Cobrar", exact=True).click()
        dialogo = pp.locator("dialog[open]")
        expect(dialogo).to_contain_text("$46.600")
        accesibilidad(pp, "cobro")
        dialogo.get_by_role("button", name="Efectivo").click()
        expect(pedido).to_have_count(0)
        expect(pp.get_by_text("0 abiertos")).to_be_visible()
        expect(cp.locator("article.seguimiento").first).to_contain_text("pagado", timeout=15_000)

    with paso("Ventas del día y descarga para Excel"):
        menu(pp).get_by_role("link", name="Ventas").click()
        expect(pp.locator(".kpi").first).to_contain_text("$46.600")
        expect(pp.locator("main")).to_contain_text("Efectivo")
        with pp.expect_download() as descarga:
            pp.get_by_role("link", name=re.compile("Descargar CSV")).click()
        csv = Path(descarga.value.path()).read_text(encoding="utf-8-sig")
        assert csv.startswith("Fecha;Hora;Pedido;Mesa;Cliente"), csv[:80]
        assert ";1;3;Ana;" in csv and "2 x Perro sencillo" in csv and csv.rstrip().endswith(";Efectivo;46600"), csv
        accesibilidad(pp, "ventas")

    with paso("Con la recepción en pausa el cliente no puede enviar pedidos"):
        menu(pp).get_by_role("link", name="Pedidos").click()
        interruptor(pp, "Recibir pedidos por QR", False)
        expect(pp.get_by_text("Los pedidos por QR están en pausa")).to_be_visible()
        cp.get_by_role("button", name="Pedir algo más").click()
        armar(cp, "Productos Coca-Cola", boton="Agregar")
        cp.locator(".barra-pedido-boton").click()
        tolerados.add("status of 409")  # el servidor rechaza el pedido: es lo que se prueba
        cp.locator("dialog[open]").get_by_role("button", name=re.compile("Enviar pedido")).click()
        expect(cp.locator("dialog[open] .pedido-error")).to_contain_text("no estamos recibiendo pedidos")
        tolerados.discard("status of 409")
        cp.reload()
        cp.locator(".barra-pedido-boton").click()
        expect(cp.locator("dialog[open]").get_by_role("note")).to_contain_text("no estamos recibiendo pedidos")

    with paso("Al reanudar llega el pedido, y el panel lo puede cancelar"):
        interruptor(pp, "Recibir pedidos por QR", True)
        expect(pp.get_by_text("Los pedidos por QR están en pausa")).to_have_count(0)
        cp.reload()
        cp.locator(".barra-pedido-boton").click()
        hoja = cp.locator("dialog[open]")
        expect(hoja.get_by_label("Tu nombre")).to_have_value("Ana")  # lo recuerda del primer pedido
        hoja.get_by_role("button", name=re.compile("Enviar pedido")).click()
        expect(cp.get_by_role("heading", name="Mis pedidos")).to_be_visible()
        segundo = tarjeta(pp, 2, 3)
        expect(segundo).to_be_visible(timeout=15_000)
        segundo.get_by_role("button", name="Cancelar pedido 2").click()
        pp.locator("dialog[open]").get_by_role("button", name="Sí, cancelar pedido").click()
        expect(segundo).to_have_count(0)
        expect(cp.locator("article.seguimiento", has_text="Pedido #2")).to_contain_text("cancelado", timeout=15_000)

    with paso("El administrador cambia un precio y las mesas lo ven al instante"):
        menu(pp).get_by_role("link", name="Carta").click()
        accesibilidad(pp, "carta del panel")
        pp.locator(".fila", has_text="Productos Coca-Cola").get_by_role("link", name="Editar").click()
        expect(pp.get_by_role("heading", name=re.compile("Productos Coca-Cola"))).to_be_visible()
        pp.get_by_label("Precio ($)").fill("5500")
        accesibilidad(pp, "editor de producto")
        pp.get_by_role("button", name="Guardar producto").click()
        expect(pp).to_have_url(f"{BASE}/admin/carta")
        expect(pp.locator(".fila", has_text="Productos Coca-Cola")).to_contain_text("$5.500")
        cp.goto(f"{BASE}/m/{mesas['3']}")
        expect(cp.locator("article.bebida", has_text="Productos Coca-Cola")).to_contain_text("$5.500")

    with paso("Un producto agotado se ve en la carta pero no se puede pedir"):
        fila_perro = pp.locator(".fila", has_text="Perro")
        fila_perro.get_by_label("Agotado").check()
        expect(fila_perro.locator(".etiqueta", has_text="Agotado")).to_be_visible()
        cp.reload()
        cp.get_by_role("button", name=re.compile(r"^Agotado por hoy\s*: Perro$")).click()
        expect(cp.locator("dialog[open] button[type=submit]")).to_be_disabled()
        cp.keyboard.press("Escape")
        fila_perro.get_by_label("Agotado").uncheck()
        expect(fila_perro.locator(".etiqueta", has_text="Agotado")).to_have_count(0)
        cp.reload()
        expect(cp.get_by_role("button", name="Armar y agregar Perro")).to_be_visible()

    with paso("Agregar una mesa crea su QR, y el QR abre la carta de esa mesa"):
        pp.goto(f"{BASE}/admin/mesas/configurar")
        accesibilidad(pp, "configurar mesas")
        pp.get_by_label("Agregar mesas").fill("1")
        pp.get_by_role("button", name="Agregar", exact=True).click()
        expect(pp.get_by_role("status")).to_contain_text("Se agregó 1 mesa")
        pp.goto(f"{BASE}/admin/mesas/qr")
        expect(pp.locator("article.qr-tarjeta-mesa")).to_have_count(11)
        pp.add_script_tag(content=JSQR)
        leido_3 = pp.get_by_role("article", name="Código QR de la mesa 3").locator("svg").evaluate(LEER_QR)
        assert leido_3 == f"{BASE}/m/{mesas['3']}", leido_3
        leido_11 = pp.get_by_role("article", name="Código QR de la mesa 11").locator("svg").evaluate(LEER_QR)
        assert leido_11 and re.fullmatch(rf"{BASE}/m/[2-9a-z]{{8}}", leido_11), leido_11
        pp.screenshot(path=CAPTURAS / "panel-qr.png")
        cp.goto(leido_11)
        expect(cp.get_by_text("Mesa 11").first).to_be_visible()

    with paso("Un usuario de caja cobra pero no edita la carta"):
        menu(pp).get_by_role("link", name="Ajustes").click()
        accesibilidad(pp, "ajustes")
        pp.locator("#n-nombre").fill("Caja")
        pp.get_by_label("Usuario para ingresar").fill(CAJA[0])
        pp.locator("#n-clave").fill(CAJA[1])
        pp.get_by_role("button", name="Crear usuario").click()
        expect(pp.get_by_text("Usuario: caja")).to_be_visible()
        caja = navegador.new_context(**ESCRITORIO)
        kp = vigilar(caja.new_page(), "caja")
        kp.goto(f"{BASE}/admin")
        ingresar(kp, *CAJA)
        expect(kp.get_by_role("heading", name="Pedidos")).to_be_visible()
        expect(menu(kp).get_by_role("link", name="Carta")).to_have_count(0)
        kp.goto(f"{BASE}/admin/carta")
        expect(kp).to_have_url(re.compile(r"/admin\?aviso=permiso"))
        caja.close()

    with paso("El panel en un celular: menú abajo y nada se desborda"):
        movil = navegador.new_context(**CELULAR, storage_state=panel.storage_state())
        mp = vigilar(movil.new_page(), "panel-movil")
        for ruta in ["/admin", "/admin/mesas", "/admin/mesas/configurar", "/admin/carta", "/admin/carta/toppings", "/admin/ventas", "/admin/ajustes"]:
            mp.goto(BASE + ruta)
            expect(menu(mp)).to_be_visible()
            sin_desborde(mp, f"panel {ruta}")
        mp.goto(f"{BASE}/admin")
        mp.screenshot(path=CAPTURAS / "panel-celular.png")
        movil.close()

    panel.close()
    cliente.close()


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--sin-compilar", action="store_true", help="usar la compilación (o la imagen) que ya existe")
    argumentos.add_argument("--docker", action="store_true", help="probar la imagen de producción en lugar de next start")
    opciones = argumentos.parse_args()

    CAPTURAS.mkdir(parents=True, exist_ok=True)
    env = entorno()
    print("Preparando la base de pruebas…", flush=True)
    mesas = preparar_base(env)
    if not opciones.sin_compilar and opciones.docker:
        print("Construyendo la imagen de producción (docker build)…", flush=True)
        subprocess.run(["docker", "build", "--target", "runner", "-t", "roast-menu:latest", "."], cwd=RAIZ, check=True)
    elif not opciones.sin_compilar:
        print("Compilando (next build)…", flush=True)
        subprocess.run([NPX, "next", "build"], cwd=RAIZ, env=env, check=True)
    detener = iniciar_servidor(env, opciones.docker)
    inicio = time.time()
    try:
        with sync_playwright() as p:
            navegador = p.chromium.launch()
            try:
                probar(navegador, mesas)
            finally:
                navegador.close()
    finally:
        detener()
    assert not errores_consola, "Errores en la consola del navegador:\n" + "\n".join(errores_consola)
    print(f"\nTodo en orden ({time.time() - inicio:.0f} s). Capturas en tests/e2e/capturas/")


if __name__ == "__main__":
    main()
