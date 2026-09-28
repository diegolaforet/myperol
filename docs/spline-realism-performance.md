# Resina epoxi: acabado y rendimiento en Spline

## Integracion aplicada

El proyecto utiliza `@splinetool/runtime` 1.12.98, no un iframe ni spline-viewer.
La escena local ocupa 3.354.401 bytes (3,20 MiB). Este cambio no modifica ni
recomprime el archivo binario: el acabado se debe editar y reexportar en Spline.

- `src/scripts/flooring/bootstrap.ts`: IntersectionObserver con margen de 600 px.
  Solo entonces importa el controlador, runtime, GSAP y archivo .splinecode.
- `src/scripts/spline/visibility.ts`: observacion del canvas sin margen, junto a
  visibilidad de pestana y pagehide/pageshow. Una promesa cancelable permite
  descargar por proximidad y esperar a la entrada real antes de crear WebGL.
- `src/scripts/flooring/scene.ts`: Application en modo manual, sin controles de
  puntero; pausa inmediata fuera de pantalla, incluso durante la preparacion
  de los primeros fotogramas. Una navegacion durante start() libera los recursos
  despues de terminar la decodificacion, sin destruir un motor a medio crear.
- `src/scripts/spline/resolution.ts`: limite compartido de DPR 1,75 en escritorio
  y 1,35 con puntero tactil; presupuesto adicional de 2.073.600 / 1.100.000 pixeles.
- `src/scripts/calculator-estimate-spline.ts`: mismo control de visibilidad y
  presupuesto de pixeles. La calculadora precarga al interactuar con el formulario;
  no instancia la escena de estimacion hasta mostrar su canvas.
- `src/scripts/spline/resources.ts`: mantiene una sola descarga compartida y
  entrega una copia del buffer a cada decodificador. Se conserva el comportamiento.

El scroll sigue actualizando una timeline GSAP con scrub de 0,35 s; el controlador
agrupa las solicitudes de dibujo en requestAnimationFrame y limita a 60 Hz.
No se crean bucles continuos para una imagen que ya esta en reposo.

`stop()` suspende el motor, pero NO libera sus texturas o geometria. Se conservan
para volver a la misma posicion sin descargar/compilar otra vez. `dispose()` las
libera al desmontar la escena o abandonar definitivamente la pagina. El modelo de
carga tambien se destruye al terminar la estimacion. Los buffers de descarga se
conservan durante la vida de la pagina para evitar peticiones duplicadas.
No se fuerza WEBGL_lose_context, ni se usan propiedades privadas del renderer.

No se puede garantizar 60 FPS en todos los dispositivos ni carga instantanea:
la decodificacion y compilacion de shaders del runtime siguen teniendo un coste.

## 1. Materiales: receta de partida

Estos valores son propuestas artisticas para esta escena, no presets oficiales ni
una garantia de equivalencia entre versiones del editor. Trabajar en una copia.

| Capa | Roughness | Metalness | Detalle |
| --- | --- | --- | --- |
| Hormigon | 0,85 | 0 | Textura de 1024 px; relieve sutil |
| Imprimacion | 0,35 | 0 | Material sencillo |
| Silice | 0,75 | 0 | Textura de 512 px, sin granos geometricos |
| Epoxi | 0,16 | 0 | Reflejo ancho de ventana/softbox |
| Sellador | 0,12 | 0 | Brillo suave, sin refraccion de pantalla |

1. Selecciona `epoxi`; en Material > Lighting elige Physical y comienza con
   Roughness 0,16 y Metalness 0. La resina pigmentada es un dielectrico: subir
   Metalness para conseguir brillo cambia el material a metal.
2. Conserva el color/textura actual. Una microvariacion de rugosidad entre 0,12 y
   0,22 evita el aspecto de espejo perfecto. No necesita geometria adicional.
3. Si la version del editor dispone de Environment/HDRi, utiliza un solo entorno
   de estudio con ventanas amplias, de 1024 x 512 px. Empieza con intensidad 1 y
   rotacion horizontal 35 grados; ajusta para obtener una franja clara legible
   sin quemar los blancos. Es iluminacion basada en imagen, no ray tracing.
4. Empieza con Clearcoat, Glass, Reflection, Bloom, DOF y SSAO desactivados.
   Los reflejos del entorno son suficientes para esta primera prueba. No apiles
   Reflection/Glass para simular el sellado. Si necesitas un clearcoat adicional,
   pruebalo solo en epoxi, a 0,25 y Coat Rough 0,12, y mide el coste.
5. Para la via de menor coste compatible con el runtime actual: Material > + >
   Matcap. Abre su miniatura y carga un Matcap de estudio neutro de 512 x 512 px;
   prueba blending Screen al 25% sobre la textura de color. Ajusta su rotacion
   para colocar el brillo. Es una aproximacion dependiente de la vista, no una
   reflexion real de la habitacion. No requiere luces dinamicas.

La documentacion actual indica que los nuevos mapas PBR y lobulos avanzados
requieren la ruta WebGPU. Este proyecto conserva runtime 1.12.98: no activar
funciones nuevas ni cambiar de renderer sin verificar la exportacion con esta
version. El Matcap evita depender de esas funciones nuevas. Una migracion a otro
runtime debe validarse por separado en Safari, Chrome y moviles reales.

Fuentes: [Lighting](https://docs.spline.design/materials-shading/shading-and-reflection/lighting-layer),
[PBR](https://docs.spline.design/materials-shading/basics/pbr-materials),
[Matcap](https://docs.spline.design/materials-shading/shading-and-reflection/matcap-layer).

## 2. Baking: luces y sombras sin iluminacion dinamica

La documentacion consultada no describe un boton de horneado de lightmaps en
Spline. `Apply & Edit` hornea booleanas, no luces. Para lightmaps reales usa
Blender/Cycles; para brillo economico dentro de Spline usa Matcap.

1. En una copia del modelo en Blender, conserva cada capa como objeto separado,
   con sus transformaciones originales y UV sin solapamientos.
2. Prepara una imagen destino de 1024 x 1024 por material principal (512 px para
   las capas pequenas), con margen de horneado de 8 px. Selecciona su nodo Image
   Texture como destino activo en todos los materiales que vas a hornear.
3. En Cycles > Render > Bake selecciona Diffuse; activa Color, Direct e Indirect.
   Empieza con 64 samples y guarda las imagenes. Hornea AO por separado si hace
   falta, con influencia muy discreta; no hornees el reflejo especular principal.
4. Las capas se separan y alargan durante el scroll: NO hornees sombras de una
   capa sobre otra. Quedarian impresas al abrirlas. Hornea el detalle propio de
   cada pieza aislada; usa el entorno o Matcap para el brillo que sigue la vista.
5. Importa/reasigna las texturas en Spline con proyeccion UV, conservando las
   dimensiones y transformaciones originales. Usa el color horneado sin otra
   capa Lighting que vuelva a iluminarlo, y anade el Matcap sutil si lo necesitas.
6. Desactiva las luces direccionales, puntuales y spot, las sombras dinamicas y
   los efectos de oclusion de pantalla. Compara la escena antes/despues, abierta
   y cerrada. Si usas PBR con entorno, manten ese entorno: el baking no sustituye
   las reflexiones dependientes del punto de vista.

Fuente: [Blender: Render Baking](https://docs.blender.org/manual/en/4.5/render/cycles/baking.html).

## 3. Exportacion para este proyecto

1. Conserva los nombres `hormigon`, `imprimacion`, `silice`, `epoxi`, `sellador`
   y `cameraPrincipal`. No combines estas cinco capas: el JS las anima por separado.
   Conserva sus pivotes, escala, posicion inicial y dimensiones. El controlador
   contiene las profundidades originales; cambiar geometria exige recalibrarlas.
2. Elimina objetos y assets de prueba que nunca se ven en NINGUN punto del scroll.
   Las caras inferiores aparecen al separar las capas: no las elimines solo por
   estar ocultas al principio. Usa el menor numero de subdivisiones que conserve
   el contorno; objetivo propuesto para estas cinco losas: menos de 10.000 triangulos.
3. Export > Code Export > Play Settings > Compression: ON.
   Geometry Quality: Performance. Revisa los cantos; si se deforman usa Default.
   Image Quality: comienza en 80% si el control es numerico. Si tu editor muestra
   presets, elige el intermedio y compara al tamano final, no a zoom extremo.
4. Reduce las texturas ANTES de importar: 1024 px para la superficie principal,
   512 px en secundarias/Matcap. Para color fotografico sin alfa usa JPEG/WebP a
   calidad 80; conserva mapas de normales/rugosidad sin artefactos de compresion.
   Reutiliza los mismos assets. Menor peso de descarga no implica igual reduccion
   de memoria GPU: tambien importa la resolucion de las imagenes.
5. Page Scroll: Yes tanto en escritorio como touch. Orbit, Pan, Zoom, On Hover y
   Animated Turntable: desactivados. La web controla el movimiento.
   Preload: No; la carga la controla el observer del proyecto. Mantener el fondo y
   la camara existentes. Mantener el renderer compatible con la exportacion actual;
   no forzar WebGPU-only para publico general.
6. Export > Performance: revisa objetos, poligonos, texturas, luces y export size.
   Resuelve las alertas rojas y elimina assets sin uso. Objetivo propuesto: menos de
   2 MB para la escena, comparando siempre calidad visual; no es una garantia.
7. Exporta `.splinecode`, guardalo con un nombre nuevo en `public/assets/3d/` y
   actualiza `SCENE_URL` en `src/scripts/spline/resources.ts` para invalidar cache.
   No conviertas a GLB/Draco: este integrador consume Spline y la conversion no
   preserva automaticamente sus materiales/eventos. No se ha aplicado Draco aqui.

Fuentes: [Optimizacion](https://docs.spline.design/exporting-your-scene/how-to-optimize-your-scene),
[Play Settings](https://docs.spline.design/exporting-your-scene/play-settings),
[Limitaciones GLB](https://docs.spline.design/exporting-your-scene/files/exporting-as-gtlf-glb).

## Verificacion

`npm run build` genera los bundles. Con el preview arrancado, ejecutar las pruebas
de `spline-lifecycle.spec.ts` y las pruebas de 3D en `redesign.spec.ts`, junto a
`runtime-performance.spec.ts`. Cubren descarga por proximidad sin crear WebGL,
entrada/salida, limite de pixeles, avance/retroceso, canvas no vacio y estimacion.
Las mediciones de Playwright local no certifican 60 FPS en hardware movil real.
