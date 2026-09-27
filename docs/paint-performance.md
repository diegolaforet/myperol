# Contencion y coste de pintado

## Cambios

- `src/styles/design.css`: Servicios y Calculadora usan `content-visibility:
  auto` con `contain-intrinsic-size: none auto <altura>`. Las reservas iniciales
  son responsive; `auto` conserva la altura real despues del primer render.
  No se contiene el escenario sticky del 3D ni se cambian sus dimensiones.
- El modal de ayuda queda fuera de la seccion contenida en `Calculator.astro`:
  conserva su posicion fija respecto al viewport. Mientras el selector de
  prefijos esta abierto se desactiva temporalmente la contencion de Calculadora,
  para permitir que el desplegable sobresalga sin quedar recortado.
- Las tarjetas, sus revelados, las opciones y las acciones de la calculadora
  transicionan exclusivamente `transform`/`opacity`. Las sombras y colores
  conservan sus valores de reposo/hover, pero cambian una vez al entrar/salir:
  no se interpolan sombras ni filtros por fotograma. La flecha de Servicios
  solo transiciona su transformacion. El foco del campo de superficie tampoco
  interpola su sombra.
- `translateZ(0)`/`translate3d` y `backface-visibility: hidden` se aplican a las
  tarjetas y a la superficie de la calculadora, incluidos revelados y pasos.
  No se anade `will-change` permanente a todos los elementos. Se conservan los
  filtros glass y sus tokens; promover capas no elimina el coste de un blur.
- `calculator.ts`: debounce de 50 ms exclusivamente para guardar superficie
  en sessionStorage. Validacion y saneamiento inmediatos; escritura pendiente
  forzada en blur, pagehide y pestana oculta. Los cambios de paso guardan al
  instante y cancelan cualquier escritura pendiente. La matematica no cambia.
- El controlador WebGL existente cancela su RAF y llama a `stop()` cuando su
  IntersectionObserver detecta que el canvas sale del viewport. Se conserva;
  las pruebas ahora comprueban cero dibujos adicionales en Servicios y en
  Calculadora, tambien al mover el scroll dentro de esas secciones.
- El scroll de entrada cede ante saltos externos. Su detector de scroll nativo
  solo opera durante un arrastre de scrollbar; no interpreta ajustes de layout
  como entradas del usuario ni consulta geometria durante el scroll del 3D.

## Verificacion

`tests/paint-performance.spec.ts` verifica la omision real de contenido fuera
de pantalla, la altura recordada, las propiedades animadas, la agrupacion del
guardado, la validacion inmediata, los modales y el selector de prefijos.
`tests/redesign.spec.ts` conserva las comprobaciones de pixeles del canvas,
animacion reversible, calculos, escritorio/movil y menus de servicio.

Se compararon capturas antes/despues de Servicios y Calculadora a 1440 y 390 px:
mismas dimensiones y ningun canal de color con diferencia superior a 10/255.
Estas comprobaciones no equivalen a una garantia de 60 FPS en cualquier GPU.

Referencia: [MDN content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility).
