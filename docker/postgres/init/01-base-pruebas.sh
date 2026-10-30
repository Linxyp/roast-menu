#!/bin/sh
# Se ejecuta solo la primera vez que se crea el volumen de datos:
# crea la base aislada de las pruebas de integración.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE roast_test OWNER "$POSTGRES_USER";
EOSQL
