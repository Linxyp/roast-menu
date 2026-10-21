import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { normalizarUrlPublica } from "../../src/lib/url.ts";
// @ts-expect-error: script de Node en JavaScript, sin tipos
import { generarQR, leerQR } from "../../scripts/generar-qr.mjs";

describe("URL pública", () => {
  test("queda con https, sin parámetros y con / final", () => {
    assert.equal(normalizarUrlPublica("https://roast.com.co"), "https://roast.com.co/");
    assert.equal(normalizarUrlPublica(" https://linxyp.github.io/roast-menu "), "https://linxyp.github.io/roast-menu/");
    assert.equal(normalizarUrlPublica("https://roast.com.co/carta/?utm=x#arriba"), "https://roast.com.co/carta/");
  });
  test("rechaza lo que no es una dirección web", () => {
    for (const valor of [undefined, "", "roast.com.co", "ftp://roast.com.co", "javascript:alert(1)"]) {
      assert.equal(normalizarUrlPublica(valor), "", String(valor));
    }
  });
});

test("el QR generado se lee exactamente con la URL de la carta", async () => {
  const carpeta = mkdtempSync(path.join(tmpdir(), "roast-qr-"));
  try {
    const url = "https://linxyp.github.io/roast-menu/";
    const { png } = await generarQR(url, carpeta);
    assert.equal(leerQR(png), url);
    assert.equal(leerQR(readFileSync(path.join(carpeta, "roast-menu-qr.png"))), url);
    assert.match(readFileSync(path.join(carpeta, "roast-menu-qr.svg"), "utf8"), /^<svg/);
    assert.equal(JSON.parse(readFileSync(path.join(carpeta, "qr.json"), "utf8")).url, url);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});
