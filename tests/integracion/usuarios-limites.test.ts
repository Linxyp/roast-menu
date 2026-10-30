import { beforeEach, describe, expect, test } from "vitest";
import { verificarClave } from "@/server/auth/clave";
import { db } from "@/server/db";
import { contarIntento, exigirLimite, reiniciarLimite } from "@/server/limite";
import { actualizarUsuario, crearUsuario, restablecerClave } from "@/server/usuarios";
import { vaciarBase } from "./fabrica";

beforeEach(vaciarBase);

const nuevo = (usuario: string, rol: "ADMIN" | "PERSONAL" = "PERSONAL", clave = "Roast-caja-2026") =>
  crearUsuario({ usuario, nombre: usuario, rol, clave });
const idDe = async (usuario: string) => (await db.usuario.findUniqueOrThrow({ where: { usuario } })).id;

describe("usuarios del panel", () => {
  test("guarda la contraseña cifrada y normaliza el usuario", async () => {
    await crearUsuario({ usuario: "  Caja ", nombre: "Caja principal", rol: "PERSONAL", clave: "Roast-caja-2026" });
    const caja = await db.usuario.findUniqueOrThrow({ where: { usuario: "caja" } });
    expect(caja).toMatchObject({ nombre: "Caja principal", rol: "PERSONAL", activo: true });
    expect(caja.claveHash).not.toContain("Roast-caja-2026");
    expect(await verificarClave("Roast-caja-2026", caja.claveHash)).toBe(true);
    expect(await verificarClave("roast-caja-2026", caja.claveHash)).toBe(false);

    await expect(nuevo("CAJA")).rejects.toThrow("Ese usuario ya existe.");
    await expect(nuevo("con espacio")).rejects.toThrow("sin espacios");
    await expect(nuevo("mesero", "PERSONAL", "corta1")).rejects.toThrow("Usa al menos 8 caracteres.");
    await expect(nuevo("mesero", "PERSONAL", "solamenteletras")).rejects.toThrow("Combina letras y números.");
  });

  test("siempre queda al menos un administrador activo", async () => {
    await nuevo("admin", "ADMIN");
    const admin = await idDe("admin");
    await expect(actualizarUsuario(admin, { rol: "PERSONAL" })).rejects.toThrow("al menos un administrador activo");
    await expect(actualizarUsuario(admin, { activo: false })).rejects.toThrow("al menos un administrador activo");

    await nuevo("duena", "ADMIN");
    await actualizarUsuario(admin, { rol: "PERSONAL" });
    await expect(db.usuario.findUniqueOrThrow({ where: { id: admin } })).resolves.toMatchObject({ rol: "PERSONAL" });
  });

  test("desactivar a alguien o cambiarle la contraseña cierra sus sesiones abiertas", async () => {
    await nuevo("caja");
    const caja = await idDe("caja");
    const abrirSesion = (id: string) =>
      db.sesion.create({ data: { id, usuarioId: caja, expiraEn: new Date(Date.now() + 3_600_000) } });

    await abrirSesion("sesion-1");
    await restablecerClave(caja, "Clave-nueva-2026");
    expect(await db.sesion.count()).toBe(0);
    expect(await verificarClave("Clave-nueva-2026", (await db.usuario.findUniqueOrThrow({ where: { id: caja } })).claveHash)).toBe(true);

    await abrirSesion("sesion-2");
    await actualizarUsuario(caja, { activo: false });
    expect(await db.sesion.count()).toBe(0);
  });
});

describe("límite de intentos", () => {
  test("bloquea al pasar el límite, cada clave por separado, y se puede reiniciar", async () => {
    const regla = { limite: 3, segundos: 60 };
    expect(await Promise.all([1, 2, 3].map(() => contarIntento("ip:1", regla)))).toEqual([true, true, true]);
    expect(await contarIntento("ip:1", regla)).toBe(false);
    expect(await contarIntento("ip:2", regla)).toBe(true);
    await expect(exigirLimite("ip:1", regla, "Espera unos minutos.")).rejects.toMatchObject({ estado: 429, message: "Espera unos minutos." });

    await reiniciarLimite("ip:1");
    expect(await contarIntento("ip:1", regla)).toBe(true);
  });

  test("cuando vence la ventana vuelve a contar desde cero", async () => {
    const regla = { limite: 1, segundos: 60 };
    expect(await contarIntento("usuario:ana", regla)).toBe(true);
    expect(await contarIntento("usuario:ana", regla)).toBe(false);
    await db.limiteTasa.update({ where: { clave: "usuario:ana" }, data: { expiraEn: new Date(Date.now() - 1000) } });
    expect(await contarIntento("usuario:ana", regla)).toBe(true);
  });
});
