# Informe de rendimiento WebGL

## Alcance

La escena sigue siendo la exportacion original de Spline. Se mantienen los
materiales, las cinco capas, la camara, la secuencia GSAP, el scroll reversible
y el encuadre responsive. No se modifica la logica de la calculadora.

## Renderizado y scroll

- `src/scripts/flooring/render-controller.ts` gestiona una unica solicitud
  `requestAnimationFrame` pendiente. Las actualizaciones intermedias del scroll
  se agrupan y se aplica el estado mas reciente antes de solicitar un dibujo.
- GSAP ScrollTrigger conserva `scrub: 0.35`. Su interpolacion actualiza el estado
  objetivo; ya no aplica todas las transformaciones 3D en cada callback.
- El controlador limita las solicitudes de dibujo a 60 Hz, conservando la fase
  temporal en pantallas de 90/120/144 Hz. No reduce el scroll de la pagina a esa
  frecuencia ni anade otro sistema de scroll virtual.
- Se comparan posiciones, escalas y rotaciones mediante un `Float64Array`
  reutilizable. Un estado identico no genera otra solicitud de render.
- El modo manual de Spline evita dibujos continuos. Su bucle interno permanece
  activo durante una rafaga de movimiento y se detiene 120 ms despues del ultimo
  dibujo. Esto evita introducir un fotograma de latencia en cada reactivacion.
- Un `IntersectionObserver`, sin margen de precarga, suspende el render cuando
  el canvas sale realmente del viewport. Se cancela tambien el RAF pendiente.
  `visibilitychange` hace lo mismo cuando se oculta la pestana.
- Al volver a entrar se fuerza un dibujo del estado actual. El observador de
  carga anticipada es independiente y mantiene sus 1200 px de margen.
- `interactive: false` elimina el gestor de interaccion/orbita de Spline,
  innecesario porque esta escena solo se controla mediante scroll. Evita su
  trabajo por fotograma y las lecturas de geometria del DOM asociadas.

## Resolucion y composicion

Se aplican y verifican los limites, mas restrictivos que DPR 2:

| Dispositivo | DPR maximo | Presupuesto maximo de pixeles |
| --- | ---: | ---: |
| Escritorio | 1.75 | 2,073,600 |
| Puntero tactil/coarse | 1.35 | 1,100,000 |

El factor efectivo tambien respeta el DPR del dispositivo y la raiz cuadrada
del presupuesto dividido por el area CSS. `ResizeObserver` recalcula dimensiones
fuera del bucle de animacion, con debounce de 120 ms. No se leen dimensiones
del DOM en el controlador de render.

Se encontro y corrigio una sobrescritura real: el ResizeObserver interno de
Spline volvia a asignar el buffer al DPR nativo despues del ajuste inicial.
En la prueba de 390 x 844 con DPR 3, se dibujaban 2,962,440 pixeles.
Ahora se mide el DPR efectivo del runtime y un MutationObserver vigila solo
los atributos width/height del canvas. Si el motor sobrescribe el presupuesto,
se reaplica una vez; las dimensiones correctas no generan otro reajuste.
El resultado medido es 601,920 pixeles, un 79.7% menos, sin cambiar el tamano CSS
ni el encuadre. La prueba simula otra sobrescritura para evitar regresiones.

El canvas conserva `translateZ(0)` y el escenario sticky conserva su contencion
de layout/pintura. `will-change: transform, opacity` solo se activa mientras la
escena es visible. Estas propiedades optimizan la composicion CSS; no sustituyen
el trabajo de shaders de WebGL ni garantizan rendimiento por si mismas.

## Carga inicial

- El bootstrap del 3D es un modulo pequeno; motor, timeline y escena se cargan
  bajo demanda. No se descarga la escena estando en la portada.
- La descarga binaria y los imports del motor/GSAP se realizan en paralelo.
- Solo se precargan explicitamente la fuente Latin de Lexend y, en index,
  el poster del video. No se precarga el motor 3D.
- Los scripts procesados por Astro son modulos y difieren su ejecucion hasta
  despues del parseo HTML. No se utiliza `async` para romper su orden.
- Se eliminaron las imagenes decorativas de dos heroes que estaban ocultos por
  CSS; no aportaban contenido visible y podian provocar descargas innecesarias.
- CSS y JS se empaquetan y minifican en `npm run build`. Colores y filtros siguen
  centralizados en `src/styles/tokens.css`.
- Los botones por seccion conservan su observador y transiciones CSS, sin
  listeners globales de scroll para gestionar su visibilidad.

## Geometria, compresion y workers

No se ha aplicado decimacion ni una conversion ficticia a Draco/GLTF. El archivo
es `.splinecode`, no un GLB; convertirlo sin el proyecto fuente editable podria
alterar materiales y animaciones. Su contenido permanece intacto: 3,354,401 bytes.
Gzip lo reduce a 3,285,184 bytes, aproximadamente un 2.1%; volver a comprimir ese
binario no resolveria el cuello de botella de renderizado.

La optimizacion aplicada es el control del trabajo WebGL, no la alteracion de
poligonos o materiales. Tampoco se modifica el frustum culling interno del motor.

Se evaluo el uso de workers. La API instalada de Spline requiere un canvas DOM y
no ofrece aqui una ruta publica equivalente con OffscreenCanvas. Los calculos
propios son pequenos; la inicializacion del motor y compilacion de shaders siguen
pudiendo ocupar el hilo principal. La carga anticipada reduce su coincidencia con
la entrada al modelo, pero no convierte esa inicializacion en trabajo de worker.

## Verificacion reproducible

Archivos principales:

```text
src/scripts/flooring/bootstrap.ts          Carga por proximidad
src/scripts/flooring/scene.ts              Escena, timeline y presupuesto de pixeles
src/scripts/flooring/render-controller.ts  RAF, agrupacion, limite y suspension
src/scripts/section-controls.ts           Visibilidad de botones mediante IO
src/styles/tokens.css                     Colores, tipografia y filtros
src/styles/design.css                     Presentacion y composicion condicional
tests/redesign.spec.ts                    Regresiones funcionales y WebGL
tests/performance.spec.ts                 Carga diferida, idiomas y controles
```

Los tokens compartidos incluyen `--palette-white` (#fff), `--palette-smoke`
(#e9e9eb), `--palette-ink` (#17181b), `--palette-charcoal` (#202124),
`--palette-graphite` (#303238), `--font-ui`, `--model-edge-gutter` y
`--glass-blur` (22px). Los filtros completos se reutilizan mediante
`--filter-glass-*`; no se han cambiado sus valores visuales en esta pasada.

La auditoria acumulada de la portada, con cache desactivada durante seis segundos
y sobre el build de produccion local, registra 16.05 MB transferidos en escritorio
y 4.75 MB en movil, frente a 56.36 MB antes de la refactorizacion de carga.
Esta diferencia incluye las variantes de video y la carga diferida implementadas
en la pasada anterior; no se atribuye al nuevo controlador WebGL. No se solicita
el archivo Spline permaneciendo en la portada. Los atributos funcionales de la
calculadora coinciden con la captura anterior a la refactorizacion.

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4325
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4325'
npx playwright test
$env:AUDIT_URL='http://127.0.0.1:4325'
node scripts/audit-performance.mjs final
```

Si el puerto esta ocupado, utilizar en ambas variables la URL real que anuncie
Astro. La prueba usa el build de produccion, no los bundles de desarrollo de Vite.

La suite comprueba calculadora, idiomas, controles, modales, sticky, movimiento y
reversion del modelo, pixeles no blancos del canvas, encuadre movil, presupuestos
de resolucion, limite de solicitudes y ausencia de dibujos en reposo/fuera de
pantalla. Las capturas y trazas se generan en `test-results/`; las mediciones de
carga en `performance-artifacts/`.

Resultado final: build correcto; 34 pruebas superadas y 4 omitidas por no aplicar
al viewport correspondiente. El servidor de desarrollo tambien carga el modelo
sin errores JavaScript. En esta maquina fue necesario arrancarlo fuera del
sandbox: esbuild necesita leer directorios superiores para resolver paquetes.
La configuracion original de Astro no se modifica para eludir esa restriccion.

Medicion final sobre Chrome local, durante un recorrido programado de 2 segundos:

| Entorno | Buffer | Mediana entre dibujos | P95 entre dibujos |
| --- | ---: | ---: | ---: |
| Escritorio 1440 x 1000 | 1,440,000 px | 17.8 ms | 24.3 ms |
| Movil emulado 390 x 844, DPR 3 | 601,920 px | 18.1 ms | 19.2 ms |

En ambos casos se verifican cero dibujos adicionales en reposo y fuera de pantalla.
Estos intervalos incluyen estados que no requieren redibujar; no equivalen a una
promesa de 60 FPS sostenidos. Tampoco son resultados de un telefono fisico.

El objetivo de 60 Hz es un limite de trabajo, no una garantia de 60 FPS en todos
los telefonos. La GPU, temperatura, navegador, red y compilacion inicial afectan
al resultado. Las pruebas de escritorio con emulacion movil no sustituyen una
medicion en dispositivos fisicos.

Vite sigue avisando del tamano del runtime Spline. Es un chunk dinamico, pero su
peso y la compilacion inicial de shaders siguen siendo costes reales al entrar
en esta parte de la pagina; no se han ocultado ni eliminado esos limites.
