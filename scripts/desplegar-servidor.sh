#!/usr/bin/env bash
# Publica el sistema de ROAST en un servidor Linux (Ubuntu o Debian) con Docker.
# Se ejecuta desde el equipo de desarrollo (en Windows, con Git Bash):
#   npm run desplegar                  despliegue completo (la primera vez y cuando cambie la base)
#   npm run desplegar -- --solo-app    actualiza la aplicación sin tocar los datos
#
# Lee dos archivos que no se versionan (guía en docs/DESPLIEGUE.md):
#   .env.servidor   SERVIDOR=root@<ip>  LLAVE=<ruta de la llave SSH>  DOMINIO=<dominio>
#                   PROXY=propio (este proyecto publica 80/443 con su Caddy) o
#                   PROXY=compartido (otro proyecto ya los publica; además
#                   CADDY_COMPARTIDO=<contenedor de ese Caddy>, RED_PROXY=<su red>
#                   y SITIOS_CADDY=<carpeta que su Caddyfile importa>)
#   .env.produccion variables de la aplicación
#
# Pasos: prepara el servidor, construye la imagen aquí y la sube, levanta PostgreSQL y la
# aplicación, publica el sitio por HTTPS, aplica migraciones y la carta inicial por un
# túnel SSH, programa el respaldo diario y verifica.
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1

SOLO_APP=false
[ "${1:-}" = "--solo-app" ] && SOLO_APP=true

for archivo in .env.servidor .env.produccion; do
  [ -f "$archivo" ] || { echo "Falta $archivo (ver docs/DESPLIEGUE.md)." >&2; exit 1; }
done

# Lee una variable de un archivo .env sin ejecutarlo (los valores pueden tener espacios).
valor() { grep -E "^$2=" "$1" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

SERVIDOR=$(valor .env.servidor SERVIDOR)
LLAVE=$(valor .env.servidor LLAVE)
DOMINIO=$(valor .env.servidor DOMINIO)
PROXY=$(valor .env.servidor PROXY); PROXY=${PROXY:-propio}
CADDY_COMPARTIDO=$(valor .env.servidor CADDY_COMPARTIDO)
RED_PROXY=$(valor .env.servidor RED_PROXY)
SITIOS_CADDY=$(valor .env.servidor SITIOS_CADDY)
LLAVE="${LLAVE/#\~/$HOME}"
DESTINO=/opt/roast-menu
PUERTO_DB=5443 # PostgreSQL en 127.0.0.1 del servidor, solo para el túnel SSH
SSH_OPCIONES=(-i "$LLAVE" -o IdentitiesOnly=yes -o ConnectTimeout=20 -o ServerAliveInterval=30)
remoto() { ssh "${SSH_OPCIONES[@]}" "$SERVIDOR" "$@"; }

for nombre in SERVIDOR LLAVE DOMINIO; do
  [ -n "${!nombre}" ] || { echo "Define $nombre en .env.servidor." >&2; exit 1; }
done
case "$PROXY" in
  propio) ;;
  compartido)
    for nombre in CADDY_COMPARTIDO RED_PROXY SITIOS_CADDY; do
      [ -n "${!nombre}" ] || { echo "Con PROXY=compartido, define $nombre en .env.servidor." >&2; exit 1; }
    done ;;
  *) echo "PROXY debe ser propio o compartido." >&2; exit 1 ;;
esac
for nombre in APP_URL AUTH_SECRET POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB SEED_ADMIN_CLAVE; do
  [ -n "$(valor .env.produccion "$nombre")" ] || { echo "Define $nombre en .env.produccion." >&2; exit 1; }
done
[ "$(valor .env.produccion APP_URL)" = "https://$DOMINIO" ] || {
  echo "APP_URL de .env.produccion debe ser https://$DOMINIO (con ella se generan los QR de las mesas)." >&2
  exit 1
}

echo "==> 1/8 Conexión con $SERVIDOR"
remoto 'echo "    conectado a $(hostname) ($(. /etc/os-release && echo "$PRETTY_NAME")), memoria libre: $(free -m | awk "/Mem:/ {print \$7}") MB"'

echo "==> 2/8 Preparación del servidor (proxy $PROXY)"
remoto "DESTINO=$DESTINO PROXY=$PROXY CADDY=$CADDY_COMPARTIDO RED=$RED_PROXY SITIOS=$SITIOS_CADDY PUERTO_DB=$PUERTO_DB bash -s" <<'PREPARAR'
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  echo "    instalando Docker…"
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
mkdir -p "$DESTINO/respaldos"
# El puerto local de la base no puede estar tomado por otro proyecto.
if ss -ltnH "( sport = :$PUERTO_DB )" 2>/dev/null | grep -q . \
  && ! docker ps --format '{{.Names}} {{.Ports}}' | grep -E "^roast-menu-.*:$PUERTO_DB->" >/dev/null; then
  echo "    El puerto $PUERTO_DB ya lo usa otro servicio; cambia PUERTO_DB en el script." >&2
  exit 1
fi
if [ "$PROXY" = propio ]; then
  # No se toca un servidor que ya publica otro sitio en 80/443.
  ajenos=$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':(80|443)->' | grep -v '^roast-menu-' || true)
  otros=$(ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v docker-proxy || true)
  if [ -n "$ajenos$otros" ]; then
    echo "    Los puertos 80/443 ya los usa otro servicio; usa PROXY=compartido:" >&2
    echo "$ajenos$otros" >&2
    exit 1
  fi
  if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
    ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
  fi
else
  # El Caddy del otro proyecto debe estar corriendo, en su red, e importar la carpeta de sitios.
  docker ps --format '{{.Names}}' | grep -qx "$CADDY" || { echo "    No está corriendo el contenedor $CADDY." >&2; exit 1; }
  docker network inspect "$RED" >/dev/null 2>&1 || { echo "    No existe la red $RED." >&2; exit 1; }
  if ! docker exec "$CADDY" grep -qF "import $SITIOS/*.caddy" /etc/caddy/Caddyfile </dev/null; then
    echo "    El Caddyfile de $CADDY aún no tiene la línea: import $SITIOS/*.caddy" >&2
    exit 1
  fi
fi
echo "    listo (Docker $(docker --version | cut -d' ' -f3 | tr -d ,))"
PREPARAR

echo "==> 3/8 Construcción de la imagen (en este equipo)"
docker build -q --target runner -t roast-menu:latest . >/dev/null
echo "    imagen lista ($(docker image inspect roast-menu:latest --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1048576}'))"

echo "==> 4/8 Envío de la imagen y la configuración"
docker save roast-menu:latest | gzip -1 | remoto 'gunzip | docker load' | sed 's/^/    /'
scp -q "${SSH_OPCIONES[@]}" docker-compose.prod.yml "$SERVIDOR:$DESTINO/docker-compose.yml"
scp -q "${SSH_OPCIONES[@]}" docker-compose.compartido.yml "$SERVIDOR:$DESTINO/docker-compose.compartido.yml"
scp -q "${SSH_OPCIONES[@]}" Caddyfile "$SERVIDOR:$DESTINO/Caddyfile"
{
  # La clave inicial del administrador no viaja: la siembra corre desde este equipo.
  grep -v '^SEED_' .env.produccion
  printf '\nDOMINIO=%s\nPUERTO_DB=%s\n' "$DOMINIO" "$PUERTO_DB"
  # Docker Compose lee estas variables del .env: así un `docker compose …` manual en el
  # servidor usa los mismos archivos y perfiles que este script.
  if [ "$PROXY" = propio ]; then
    printf 'COMPOSE_PROFILES=proxy-propio\n'
  else
    printf 'RED_PROXY=%s\nCOMPOSE_PATH_SEPARATOR=:\nCOMPOSE_FILE=docker-compose.yml:docker-compose.compartido.yml\n' "$RED_PROXY"
  fi
} | remoto "umask 077 && cat > $DESTINO/.env"

echo "==> 5/8 Arranque de PostgreSQL y la aplicación"
remoto "cd $DESTINO && docker compose up -d --remove-orphans </dev/null 2>&1 | sed 's/^/    /'"

echo "==> 6/8 Publicación por HTTPS en $DOMINIO"
if [ "$PROXY" = propio ]; then
  echo "    Caddy propio (certificado automático)"
else
  # Bloque de este sitio para el Caddy compartido (el mismo del Caddyfile, con el dominio
  # escrito). Se valida la configuración completa antes de aplicarla; si no es válida, se
  # deja todo como estaba. Solo se recarga ese Caddy, nunca se reinicia.
  {
    echo "# ROAST ($DESTINO). Lo escribe scripts/desplegar-servidor.sh de ese proyecto."
    sed -e '/^#/d' -e "s/{\$DOMINIO}/$DOMINIO/" Caddyfile
  } | remoto "docker exec -i $CADDY_COMPARTIDO sh -c 'mkdir -p $SITIOS_CADDY && cat > $SITIOS_CADDY/roast-menu.caddy.nuevo'"
  remoto "docker exec $CADDY_COMPARTIDO sh -c '
    cd $SITIOS_CADDY
    [ -f roast-menu.caddy ] && cp roast-menu.caddy roast-menu.caddy.anterior
    mv roast-menu.caddy.nuevo roast-menu.caddy
    if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
      caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile && rm -f roast-menu.caddy.anterior && echo \"    sitio agregado al Caddy compartido\"
    else
      echo \"    configuración inválida: se deja el Caddy como estaba\" >&2
      if [ -f roast-menu.caddy.anterior ]; then mv roast-menu.caddy.anterior roast-menu.caddy; else rm -f roast-menu.caddy; fi
      exit 1
    fi' </dev/null"
fi

if [ "$SOLO_APP" = false ]; then
  echo "==> 7/8 Migraciones y carta inicial (por túnel SSH)"
  PUERTO_LOCAL=15443
  ssh "${SSH_OPCIONES[@]}" -N -o ExitOnForwardFailure=yes -L "$PUERTO_LOCAL:127.0.0.1:$PUERTO_DB" "$SERVIDOR" &
  TUNEL=$!
  trap 'kill $TUNEL 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    (exec 3<>"/dev/tcp/127.0.0.1/$PUERTO_LOCAL") 2>/dev/null && break
    sleep 1
  done
  export DATABASE_URL="postgresql://$(valor .env.produccion POSTGRES_USER):$(valor .env.produccion POSTGRES_PASSWORD)@127.0.0.1:$PUERTO_LOCAL/$(valor .env.produccion POSTGRES_DB)"
  for nombre in AUTH_SECRET SEED_ADMIN_USUARIO SEED_ADMIN_NOMBRE SEED_ADMIN_CLAVE; do
    export "$nombre=$(valor .env.produccion "$nombre")"
  done
  npx prisma migrate deploy 2>&1 | grep -E "migrat|No pending" | sed 's/^/    /'
  # Idempotente: solo crea lo que falta (nunca pisa la carta ni las mesas ya editadas).
  npm run --silent db:seed | sed 's/^/    /'
  kill $TUNEL 2>/dev/null || true
  trap - EXIT
else
  echo "==> 7/8 Datos sin cambios (--solo-app)"
fi

echo "==> 8/8 Respaldo diario y verificación"
remoto "DESTINO=$DESTINO bash -s" <<'PROGRAMAR'
set -euo pipefail
umask 077
cat > /etc/cron.d/roast-menu <<CRON
SHELL=/bin/sh
# Respaldo diario de la base de ROAST (07:30 UTC = 02:30 en Colombia); se conservan 30 días.
30 7 * * * root cd $DESTINO && docker compose exec -T roast-db sh -c 'pg_dump -U "\$POSTGRES_USER" -d "\$POSTGRES_DB" -Fc' > $DESTINO/respaldos/roast-\$(date +\%F).dump && find $DESTINO/respaldos -name '*.dump' -mtime +30 -delete
CRON
PROGRAMAR

for _ in $(seq 1 30); do
  if salud=$(curl -fsS -m 10 "https://$DOMINIO/api/salud" 2>/dev/null); then
    echo "    $salud"
    echo
    echo "Publicado en https://$DOMINIO  (panel: https://$DOMINIO/admin)"
    exit 0
  fi
  sleep 5
done
echo "La aplicación no respondió por HTTPS. Revisa en el servidor: 'cd $DESTINO && docker compose logs roast-app' y los registros del Caddy." >&2
exit 1
