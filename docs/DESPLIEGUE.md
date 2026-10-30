# Publicar el sistema en un servidor

`scripts/desplegar-servidor.sh` (o `npm run desplegar`) instala o actualiza el sistema en un servidor
Linux (Ubuntu o Debian) con Docker. Se ejecuta desde el equipo de desarrollo; en Windows, con Git Bash.
La imagen se construye en este equipo y se sube ya lista: el servidor no compila nada.

## Archivos que no se versionan

**`.env.servidor`**

```ini
SERVIDOR=root@<ip-del-servidor>
LLAVE=~/.ssh/<llave-privada>
DOMINIO=<dominio>              # sin dominio propio: <ip-con-guiones>.sslip.io
PROXY=propio                   # o compartido (ver abajo)
```

**`.env.produccion`**

```ini
APP_URL=https://<dominio>      # debe coincidir con DOMINIO: con ella se generan los QR de las mesas
AUTH_SECRET=<64 caracteres aleatorios>
TRUST_PROXY=1                  # detrás de Caddy: la IP real del cliente llega en X-Forwarded-For
POSTGRES_USER=roast
POSTGRES_PASSWORD=<aleatoria>
POSTGRES_DB=roast
SEED_ADMIN_USUARIO=admin       # primer administrador (lo crea la siembra; no viaja al servidor)
SEED_ADMIN_NOMBRE=Administrador
SEED_ADMIN_CLAVE=<al menos 8 caracteres, letras y números>
```

## Servidor propio o compartido

- `PROXY=propio`: el proyecto publica los puertos 80/443 con su propio Caddy (HTTPS automático).
  El script se niega si otro servicio ya los usa.
- `PROXY=compartido`: otro proyecto del mismo servidor ya publica 80/443 con Caddy. Se agregan
  `CADDY_COMPARTIDO=<contenedor de ese Caddy>`, `RED_PROXY=<su red de Docker>` y
  `SITIOS_CADDY=<carpeta que su Caddyfile importa>`; ese Caddyfile debe tener la línea
  `import <carpeta>/*.caddy`. El script deja allí `roast-menu.caddy`, valida la configuración
  completa y solo entonces **recarga** ese Caddy (nunca lo reinicia); si no es válida, deja todo
  como estaba.

En ambos casos el canal en vivo del panel (`/api/admin/eventos`) pasa sin compresión ni búfer.

## Uso

```bash
npm run desplegar                  # completo: también migraciones y carta inicial
npm run desplegar -- --solo-app    # solo la aplicación (los datos no se tocan)
```

Pasos: prepara el servidor (instala Docker si falta), construye y sube la imagen, levanta PostgreSQL
y la aplicación en `/opt/roast-menu`, publica el sitio por HTTPS, aplica migraciones y la siembra por
un túnel SSH (la siembra es idempotente: nunca pisa la carta ni las mesas ya editadas), programa un
respaldo diario de la base (`/opt/roast-menu/respaldos`, 30 días) y verifica `https://<dominio>/api/salud`.

## Después de publicar

1. Entrar a `https://<dominio>/admin` con el administrador de `.env.produccion` y cambiar la clave en
   Ajustes si se compartió.
2. Mesas → Imprimir códigos QR (6 por hoja), recortar y poner cada uno en su mesa.
3. Si cambia el dominio, actualizar `DOMINIO` y `APP_URL`, volver a publicar y reimprimir los QR.
