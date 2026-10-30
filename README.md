# ROAST Hamburguesas Artesanales — carta QR y pedidos por mesa

Sistema del restaurante: cada mesa tiene su código QR; el cliente ve la carta con fotos, descripción
y precios, arma su pedido (carne, toppings, cantidades, indicaciones) y lo envía. El pedido llega al
instante al panel, sale la comanda para la cocina y la caja cobra sabiendo exactamente cuánto paga
cada cliente y cada mesa. Todo lo de la carta se edita desde el panel.

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, PostgreSQL 16 con Prisma 7.

## Qué hay

| Dirección | Para quién | Qué hace |
| --- | --- | --- |
| `/m/<código>` | Cliente (QR de la mesa) | Carta, armar productos, carrito, enviar y seguir el pedido («Mis pedidos») |
| `/` | Cualquiera | Carta de solo consulta (sin pedir) |
| `/admin` | Personal | **Pedidos** en vivo (sonido, comandas, preparar → listo → entregado → cobrar) |
| `/admin/mesas` | Personal | Cuenta de cada mesa, cobrar la mesa completa; agregar/quitar mesas y **QR imprimibles** |
| `/admin/carta` | Administrador | Productos, fotos, precios, elecciones (carne…), toppings, agotados, categorías |
| `/admin/ventas` | Personal | Lo cobrado por día o rango: por método de pago, producto y mesa; descarga CSV (Excel) |
| `/admin/ajustes` | Administrador | Negocio, métodos de pago, papel de la impresora, usuarios del panel |

Roles: **Administrador** (todo) y **Personal** (pedidos, mesas, cobros y ventas; no edita la carta).

### Cómo se cobra

- El precio lo calcula siempre el servidor con la carta del momento: el celular no decide precios.
- Si un producto tiene varios precios («Sencilla», «Con 2 toppings»…), se cobra la combinación más
  económica para el cliente, sumando toppings adicionales y recargos de las opciones.
- Cada pedido guarda una copia de lo pedido (nombres, detalles y precios): cambiar la carta después
  no altera pedidos ni ventas pasadas.
- El cobro va aparte del estado en cocina. Un pedido sale del tablero cuando está entregado y pagado.

## Desarrollo

```bash
cp .env.example .env     # llenar POSTGRES_PASSWORD, AUTH_SECRET y SEED_ADMIN_CLAVE
npm install
npm run db:up            # PostgreSQL en Docker (127.0.0.1:5547)
npm run db:migrar
npm run db:seed          # carta inicial, 10 mesas y el administrador (se puede repetir)
npm run dev              # http://localhost:3520 — panel en /admin
```

La carta inicial está en `prisma/datos-iniciales.ts`; después de sembrarla, todo se edita en el
panel. Las fotos de los afiches se recortan con `npm run imagenes` (Python con Pillow y numpy).

## Pruebas

```bash
npm test                     # lógica de precios y carta inicial
npm run test:integracion     # servicios contra PostgreSQL (base roast_test, que se vacía)
npm run test:e2e             # navegador real: pedido de punta a punta, panel, QR, accesibilidad, celular
npm run test:e2e -- --docker # lo mismo contra la imagen de producción
```

Las de integración y de punta a punta usan `DATABASE_URL_TEST` y se niegan a correr si esa base no
se llama `…_test`. La de punta a punta necesita Playwright para Python
(`pip install playwright && python -m playwright install chromium`).

## Impresora de comandas

Impresora térmica de 58 u 80 mm instalada en el computador del restaurante, panel abierto en Google
Chrome. Para que las comandas salgan solas, abrir Chrome con `--kiosk-printing` y activar
«Imprimir comandas solas» en Pedidos (en un solo equipo). Detalle en el panel: Ajustes → Impresora.

## Publicar

En un servidor con Docker: `npm run desplegar` (guía en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)).
La dirección de antes en GitHub Pages, que ya está en un QR impreso, ahora solo lleva a la carta del
sistema (variable `URL_SISTEMA` del repositorio; ver `.github/workflows/publicar.yml`).

## Pendiente de confirmar con el negocio

Se dejaron así sin inventar datos; todo se cambia desde el panel:

- Toppings del perro: se usó la lista de la hamburguesa (el afiche no la trae).
- Salchipapa y mazorcada familiares: incluyen 2 toppings y no venden adicionales.
- Qué bebida trae el combo y los sabores de «Productos Coca-Cola» (el cliente lo indica en la nota).
- Métodos de pago (Efectivo, Nequi, Daviplata, Tarjeta), dirección, horario e Instagram.
- Fotos del perro y de las mazorcadas (se suben en Carta → Editar).
