import { NextResponse, type NextRequest } from "next/server";

/**
 * Antes de cada página:
 *  1. Barrera rápida del panel: sin cookie de sesión se va a /admin/ingresar.
 *     La validación real (sesión vigente, usuario activo, rol) ocurre en cada
 *     página, acción y API.
 *  2. Expone la ruta actual (x-ruta-actual) para volver a ella tras ingresar.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const panel = pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/ingresar"));
  const conSesion = request.cookies.has("roast_sesion") || request.cookies.has("__Host-roast_sesion");
  if (panel && !conSesion) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/ingresar";
    url.search = "";
    url.searchParams.set("siguiente", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  const cabeceras = new Headers(request.headers);
  cabeceras.set("x-ruta-actual", `${pathname}${search}`);
  return NextResponse.next({ request: { headers: cabeceras } });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
