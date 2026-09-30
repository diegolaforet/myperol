# Auditoria y refactorizacion de rendimiento

## Alcance y conservacion

Revision de las tres rutas Astro, componentes compartidos, scripts de navegador,
estilos, recursos publicos, configuracion de build y funcion de contacto.
La web genera HTML estatico: no ejecuta un servidor de renderizado por cada visita.
Los principales costes observados estan en el navegador y en la descarga de medios.

Se conservan HTML, CSS, textos, IDs, atributos funcionales, formulas de precios,
materiales 3D, encuadres y secuencia de scroll. Los cambios de produccion estan en
los scripts y en la entrega adaptativa del mismo video del hero. No se modifican
dependencias de ejecucion.

## Problemas encontrados y soluciones

| Problema | Solucion aplicada | Efecto |
| --- | --- | --- |
| Visitar la calculadora descargaba Spline aunque no se utilizara o ya mostrara un resultado guardado. | Precarga al primer pointerdown/focusin sobre el cuestionario; el montaje sigue siendo bajo demanda. | Menos transferencia y compilacion JS durante la carga de `/precios` y al pasar por la seccion. |
| Las dos escenas tenian gestores independientes de descarga del mismo archivo. | `src/scripts/spline/resources.ts` comparte la promesa del motor y el buffer; cada decodificador recibe una copia independiente. Las promesas fallidas se liberan para permitir otro intento. | Una solicitud de escena por documento; evita repetir fetch y lectura del cuerpo cuando se usa la segunda escena. |
| La animacion de estimacion seguia ejecutando RAF fuera de pantalla y bajo reduced-motion. | IntersectionObserver sin margen, visibilitychange, cancelacion de RAF y stop del motor. En reduced-motion se dibuja la postura existente y se duerme. | Cero dibujos durante las ventanas de inactividad verificadas; menor consumo de CPU/GPU. |
| El modelo de estimacion intentaba reducir la resolucion, pero Spline restauraba su DPR original; el siguiente calculo reutilizaba una proporcion ya modificada. | Referencia estable del DPR del export, comprobacion de dimensiones antes de setSize y vigilancia del buffer. Se conserva la resolucion efectiva original. | Evita redimensionados redundantes y mantiene la nitidez previa; no se obtiene rendimiento degradando la imagen. |
| Se reescribian escalas y componentes constantes de rotacion en cada fotograma. | Calculo inicial de escalas y posiciones relativas; el bucle solo actualiza los componentes animados. | Menos calculos y escrituras sobre objetos del motor. |
| La estimacion podia dejar recursos vivos al fallar o acabar durante la inicializacion. | Dispose idempotente, limpieza de observadores/eventos/temporizadores y liberacion al finalizar una inicializacion pendiente. | Evita acumular trabajo entre estimaciones y gestiona la restauracion desde bfcache. |
| El carrusel escribia clases antes de leer geometria y recalculaba el centro de las flechas durante cada scroll. | Una fase de lectura seguida de escritura por RAF; el centro y el paso se recalculan al invalidar dimensiones con ResizeObserver. | Elimina la alternancia lectura/escritura que podia forzar layout en el callback. |
| Cada evento actualizaba todos los puntos y cancelaba el temporizador de una flecha ya ocultandose. | Solo se modifica el punto anterior/nuevo y las flechas cuyo estado cambia. El temporizador de salida permanece activo. | Menos mutaciones; la flecha termina de ocultarse aunque sigan llegando eventos. |
| Se creaban 82 botones de prefijo y 83 Intl.DisplayNames al cargar, con un listener por opcion. | Construccion unica al abrir, DocumentFragment, un Intl.DisplayNames reutilizable y delegacion del click. | Cero opciones ocultas creadas al arrancar y un unico listener para las opciones. |
| Todos los clicks intentaban cerrar menus que ya estaban cerrados; se repetian lecturas de localStorage por etiqueta. | Solo se cierran menus abiertos, se reutiliza el idioma leido y se descarta una apertura RAF si el menu ya fue cerrado. | Menos mutaciones globales y lecturas sincronas; evita reaperturas diferidas. |
| El hero publicaba y descargaba un MOV de 62,36 MB en todos los dispositivos. | Se generan variantes H.264 de 720p y 1080p desde la misma fuente; el MOV se conserva fuera de `public`. | Descarga de video reducida a 5,18 MB en movil y 20,68 MB en escritorio; `public` deja de incluir 62,36 MB sin uso directo. |
| La configuracion estricta de TypeScript no se ejecutaba y ocultaba tipos implicitos en calculadora, scroll y escena 3D. | Se tiparon los limites de cada modulo y `tsc --noEmit` forma parte de `prebuild`. | Los contratos del DOM, Spline y GSAP se validan antes de publicar. |

## Medicion

Comparacion sobre `astro build` + `astro preview`, Chrome local, cache HTTP
desactivada, escritorios de 1440 x 1000 y viewport movil de 390 x 844.
El script espera 6 segundos en la portada y 1,2 segundos tras cargar las rutas
de servicios/calculadora. No se aplico throttling de red/CPU.

| Recursos de `/precios` antes de interactuar | Antes | Despues |
| --- | ---: | ---: |
| Suma de encodedBodySize de subrecursos, escritorio y movil | 4,04 MB | 175 KB |
| Opciones de prefijo creadas | 82 | 0 |
| Instancias Intl.DisplayNames | 83 | 0 |
| Descarga de runtime Spline / escena | Si | No |

Reduccion aproximada del 95,7% de los bytes de subrecursos en esta fase.
Es trabajo diferido hasta que se necesita, no una reduccion del peso del modelo.
La suma no incluye el documento HTML ni las cabeceras HTTP.

La portada mantiene practicamente el mismo volumen de transferencia: el hero
ya estaba optimizado con fuentes MP4 responsive, poster y pausa fuera de pantalla.
No se atribuye a este cambio una mejora del tiempo de carga de la portada.

La prueba del scroll 3D principal mantiene una mediana de dibujo cercana a 18 ms
en esta maquina, antes y despues. Su controlador manual, interpolacion GSAP,
pausa fuera de pantalla y limites de resolucion ya existian y se han conservado.
Un limite de 60 solicitudes/segundo no garantiza 60 FPS reales en todos los equipos.

## Verificacion

- Build de produccion correcto.
- Suite existente: 53 pruebas superadas y 5 omitidas por tipo de dispositivo.
- Regresiones nuevas: 8 pruebas superadas entre escritorio y movil.
- Comprobacion TypeScript estricta de los modulos refactorizados del carrusel,
  recursos compartidos y modelo de estimacion.
- Calculadora completa con soporte de hormigon y ceramica, persistencia,
  navegacion, ayuda, selector telefonico y traducciones verificadas.
- Canvas 3D comprobado mediante pixeles, movimiento, retroceso de scroll y
  presupuestos de resolucion del escenario principal. El modelo de estimacion
  conserva su DPR, pausa y vuelve a animarse.
- Comparacion automatica de capturas de Servicios y calculadora, ademas de
  inspeccion de las capturas del modelo principal en escritorio y movil.
- HTML y CSS de produccion sin cambios; no se han eliminado selectores que
  puedan participar en estados dinamicos.

Los JSON de recursos y capturas estan en `performance-artifacts/before-refactor`
y `performance-artifacts/after-refactor`; son artefactos locales ignorados por Git.
Las regresiones nuevas viven en `tests/runtime-performance.spec.ts`.

## Limites y costes conservados

- Video: `hero-1080.mp4` pesa 20,68 MB y `hero-720.mp4`, 5,18 MB en disco.
  Son el coste dominante de la portada. Cambiar el codec, bitrate o dimensiones
  requiere evaluar calidad y compatibilidad; las variantes actuales mantienen
  60 FPS y usan el mismo metraje de `source-assets/videos/videointro_hero.mov`.
- La escena `.splinecode` pesa 3,35 MB. El runtime principal generado ocupa
  aproximadamente 2,04 MB sin gzip. El build conserva la advertencia de chunks
  grandes; el motor se importa de forma diferida y no pertenece al arranque del hero.
- Se comparo tambien el modelo de estimacion anterior mediante su modulo original.
  En movil usa efectivamente DPR 3 (buffer de 1098 x 1428 para 366 x 476 CSS).
  Se descarto imponer el antiguo limite nominal de 1,35: ahorraba pixeles pero
  reducia la nitidez. Se mantiene el encuadre original, incluidos sus recortes,
  porque corregirlo seria un cambio visual fuera del objetivo de esta tarea.
- No se aplica Draco ni reduccion de poligonos: se usa una exportacion Spline,
  no un GLTF al que se pueda incorporar un decoder sin convertir la escena.
- Las imagenes de contenido ya usan WebP y carga diferida; los modulos de Astro
  ya tienen ejecucion diferida. Anadir async indiscriminadamente no mejora ese caso.
- La funcion Netlify se reviso a nivel de codigo. No se ha enviado correo real ni
  medido la latencia de produccion o del proveedor externo.
- Las mediciones locales prueban las reducciones de trabajo y preservacion de
  flujos, no equivalen a Core Web Vitals de usuarios reales ni a una garantia
  universal de FPS. El coste de shaders, video y filtros glass permanece.

## Reproduccion

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4331
# En otra terminal:
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4331'
npm.cmd run test:e2e
$env:AUDIT_URL = 'http://127.0.0.1:4331'
node scripts/audit-performance.mjs current
```

Usar el puerto que indique Astro si el solicitado esta ocupado. No se debe
reconstruir `dist` mientras se estan comparando rutas de una misma medicion.
