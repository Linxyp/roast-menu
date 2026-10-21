# ROAST Hamburguesas Artesanales — carta digital (QR)

Carta de solo consulta para que los clientes escaneen un QR y vean el menú: hamburguesas (carne y
toppings), combo, salchipapas y bebidas, con los precios y fotos de los afiches del negocio.
Sitio 100 % estático (Next.js 16 + React + TypeScript + Tailwind 4): carga rápido y se publica gratis.

## Editar la carta

| Qué | Dónde |
| --- | --- |
| Precios, toppings, textos, orden de categorías | `src/data/menu.ts` (precios sin puntos: `16900` = $16.900) |
| Dirección, horario, Instagram (salen en el pie solo si se llenan) | `src/data/negocio.ts` |
| Fotos (recortes de los afiches o fotos propias) | `scripts/recortes.json` y luego `npm run imagenes` |

`tests/unit/datos.test.ts` compara la carta con los afiches: si se cambia un precio a propósito, se
actualiza también allí (si no, la publicación se detiene avisando la diferencia).

`npm run imagenes` necesita Python con Pillow y numpy (rembg opcional, para el fondo de las bebidas).
Las imágenes generadas se guardan en el repositorio, así que publicar no necesita Python.

## Probar en el computador

```bash
npm install
npm run dev            # http://localhost:3520
npm test               # datos de la carta, QR y URL
npm run test:e2e       # navegador real: carta completa, fotos, accesibilidad, QR, celular y escritorio
```

## Publicar en una URL estable (GitHub Pages, gratis)

1. En GitHub, crear un repositorio **público** llamado `roast-menu` (sin README).
2. Subir el proyecto:

   ```bash
   git init -b main
   git config user.name "<usuario>"          # si git no tiene nombre y correo configurados
   git config user.email "<correo de GitHub>"
   git add .
   git commit -m "Carta digital ROAST"
   git remote add origin https://github.com/<usuario>/roast-menu.git
   git push -u origin main
   ```

3. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Si la primera publicación arrancó antes de este paso, volver a correrla en la pestaña **Actions**.

En unos 2 minutos la carta queda en `https://<usuario>.github.io/roast-menu/` y cada `git push`
la vuelve a publicar sola.

**El QR** se genera en cada publicación con la URL real del sitio y se verifica leyéndolo de vuelta.
Para imprimirlo: abrir `https://<usuario>.github.io/roast-menu/qr/` (tarjeta lista para imprimir y
botones para descargar el QR en SVG —para imprenta— o PNG).

### Dominio propio (recomendado antes de imprimir muchos QR)

Un QR impreso es para siempre: conviene que apunte a un dominio del negocio (por ejemplo
`carta.roast.com.co`). En el proveedor del dominio se crea un registro **CNAME** de `carta` hacia
`<usuario>.github.io`, y en **Settings → Pages → Custom domain** se escribe `carta.roast.com.co`
(con «Enforce HTTPS»). La siguiente publicación genera el QR con el dominio nuevo automáticamente.

### Otro hosting

`npm run build` deja el sitio en `out/`; sirve en Netlify, Cloudflare Pages, Vercel o cualquier
servidor web. Compilar con la URL definitiva para que el QR y la vista previa al compartir la usen:

```bash
NEXT_PUBLIC_SITE_URL=https://carta.roast.com.co/ npm run build
```

Si el sitio queda dentro de una subcarpeta, agregar `NEXT_PUBLIC_BASE_PATH=/subcarpeta`.

### Rehacer el QR a mano

```bash
npm run qr -- https://carta.roast.com.co/ --verificar-en-linea
```

Comprueba que la dirección ya muestre la carta, genera `public/qr/roast-menu-qr.svg` y `.png` y
confirma que el código se lee exactamente con esa URL.

## Datos que no estaban en los afiches

No se inventaron: quedan para confirmar con el negocio.

- Dirección, horario e Instagram (`src/data/negocio.ts`, vacíos).
- Qué bebida trae el combo (la carta dice «Hamburguesa + papas + bebida», igual que el afiche).
- Se agregó bajo la cerveza el aviso «El exceso de alcohol es perjudicial para la salud. Prohibida su
  venta a menores de edad.»; se puede editar o quitar en `src/data/menu.ts` (`nota`).
