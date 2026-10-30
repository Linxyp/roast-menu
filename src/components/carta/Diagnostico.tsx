/**
 * Avisa al servidor de lo que falle en el celular de un cliente: errores de JavaScript, archivos que
 * no cargaron y problemas que detecte la app (p. ej. una hoja aplastada). Quedan en el registro del
 * servidor (`docker compose logs roast-app | grep diagnóstico`) con el navegador de quien lo vio.
 * Va en el HTML y en ES5 para atrapar también lo que pase antes de que cargue la app.
 */
const GUION = `(function () {
  var enviados = 0;
  function reportar(tipo, detalle) {
    if (enviados++ >= 6 || !window.fetch) return;
    try {
      fetch("/api/diagnostico", {
        method: "POST",
        keepalive: true,
        body: JSON.stringify({ tipo: tipo, detalle: String(detalle).slice(0, 400), ruta: location.pathname })
      }).catch(function () {});
    } catch (e) {}
  }
  window.__roastReportar = reportar;
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) reportar("archivo", t.src || t.href);
    else reportar("error", (e.message || "") + " @ " + (e.filename || "") + ":" + (e.lineno || ""));
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    reportar("promesa", r && (r.stack || r.message) ? r.stack || r.message : r);
  });
})();`;

export function Diagnostico() {
  return <script dangerouslySetInnerHTML={{ __html: GUION }} />;
}
