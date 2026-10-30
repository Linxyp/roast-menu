/**
 * Con datos móviles la carta se ve antes de que cargue su JavaScript: un toque en «Armar y agregar»
 * o «Ver opciones» en ese momento se perdería. Este guion (en el HTML, sin esperar a nada) anota el
 * producto tocado y marca el botón como «cargando»; ProveedorPedido lo abre apenas está listo.
 * ES5 a propósito: corre igual en celulares viejos.
 */
const GUION = `(function () {
  document.addEventListener("click", function (e) {
    if (window.__roastListo) return;
    var boton = e.target && e.target.closest ? e.target.closest("[data-producto]") : null;
    if (!boton) return;
    window.__roastPendiente = boton.getAttribute("data-producto");
    boton.setAttribute("aria-busy", "true");
  }, true);
})();`;

export function ToquesTempranos() {
  return <script dangerouslySetInnerHTML={{ __html: GUION }} />;
}
