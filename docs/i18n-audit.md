# Auditoria de localizacion

## Resultado

- Idiomas: espanol, ingles, aleman, frances, ruso y ucraniano.
- Antes: 75 claves por idioma. No faltaban claves entre los diccionarios, pero
  gran parte de Servicios y Calculadora no estaba conectada a ellos.
- Extraidas y traducidas: **103 cadenas o plantillas unicas hardcodeadas**.
- Corregida: **1 asociacion incorrecta**, el nombre accesible de Servicios usaba
  la clave de novedades. Tiene ahora su propia clave `services_aria`.
- Anadida: **1 etiqueta accesible**, `language_select`, para identificar el selector.
- Total: **180 claves por idioma**, 1.080 valores, misma estructura plana, ninguna
  clave vacia y los mismos parametros de interpolacion en los seis idiomas.
- Reparada adicionalmente `nav_home`, que estaba vacia en espanol.

El recuento corresponde a mensajes unicos, no al numero de veces que aparecian en
HTML/JS. Las reutilizaciones de Ayuda, Continuar, Atras y las opciones del formulario
comparten clave. `i18n-inventory.json` enumera los mensajes incluidos en el recuento.

## Alcance

Revisados los componentes Astro, las tres rutas, las plantillas generadas por JS,
datos de servicios, metadatos de documento/redes sociales, estados de carga/error,
atributos accesibles, ayudas, paises telefonicos y formato de importes.

Los nombres MyPerol y MP SYSTEM HOME/GARAGE/BUSINESS/INDUSTRY/OUTDOOR se mantienen
como marcas. Se corrigio BUSSINES en la ruta independiente. Los textos provisionales
existentes del segundo carrusel se conservaron y se tradujeron como provisionales;
no se inventaron prestaciones comerciales para sustituirlos.

Se normalizaron tildes y puntuacion del espanol y se revisaron terminos tecnicos.
Por ejemplo, el acabado protector transparente deja de llamarse un sellador de
juntas en ruso/ucraniano. El texto tecnico completo de los cinco sistemas conserva
los requisitos de preparacion, uso, limpieza, exposicion y mantenimiento.

Los mensajes de consola, las claves funcionales (`hormigon`, `vivienda`, etc.) y
el correo interno que recibe la empresa no son interfaz para el visitante y no se
traducen. El visitante recibe errores localizados, nunca el texto interno del servidor.
La funcion de envio incorpora el codigo estable `MISSING_FIELDS` sin cambiar el
contrato de los datos obligatorios ni enviar correos durante las pruebas.

## Arquitectura

- `src/i18n/json/{es,en,de,fr,ru,uk}.json`: fuente de todos los mensajes.
- `src/i18n/client.ts`: traduccion, interpolacion, carga diferida de idiomas,
  atributos, plantillas con nodos conservados e Intl.NumberFormat.
- `src/scripts/site.ts`: eleccion/persistencia del idioma y notificacion
  `i18n:updated` una vez aplicado el diccionario. Las cargas antiguas no pueden
  sobrescribir una seleccion mas reciente. El idioma funciona si localStorage
  esta deshabilitado durante la sesion.
- `src/data/services.ts`: solo identidad, rutas y claves; ambos listados comparten
  descriptores y conservan sus respectivos textos de resumen.
- `scripts/audit-i18n.mjs`: paridad, valores vacios, parametros, marcado HTML
  permitido, referencias estaticas y textos sin marcar en plantillas Astro.
- `tests/i18n.spec.ts`: comprobaciones de navegador en los seis idiomas.

La calculadora actualiza titulos, acciones, progreso, ayudas y estados de envio
mediante claves. Al cambiar de idioma no vuelve a ejecutar la navegacion entre
pasos ni borra respuestas. Se conservan todos los ID, name, valores internos y
atributos funcionales. La formula matematica no cambia. Los paises usan
Intl.DisplayNames; los importes siguen siendo EUR y se formatean por idioma.

La frase del resultado permite reordenar `{space}` sin recrear el nodo funcional
`data-price-result-space`. Las traducciones de HTML solo admiten el marcado
controlado de los diccionarios; datos del usuario se insertan como texto.

## Validacion y limites

Resultado local: compilacion correcta, 26 pruebas nuevas de localizacion y 10 de
regresion aprobadas en escritorio/movil. Se revisaron capturas de textos largos
en aleman y ruso, junto a las comprobaciones de anchura de las seis traducciones.

`npm run check:i18n` ejecuta la auditoria y tambien se invoca antes de cada build.
Las pruebas de navegador recorren las tres rutas, los cinco detalles de servicio,
el paso adicional de ceramica, las ayudas, cambios de idioma durante el formulario,
los importes, paises, errores y confirmaciones de envio, y persistencia al recargar.
Los envios se interceptan localmente, sin peticiones reales al proveedor de correo.

La deteccion estatica no sustituye una revision humana de nuevas expresiones JS
arbitrarias. Las traducciones se han revisado contextualmente, pero no se ha
realizado una validacion editorial externa por hablantes nativos.

Los metadatos se traducen en el navegador. La respuesta HTML inicial permanece en
espanol: SEO multilingue con URLs por idioma/SSR es una ampliacion distinta y no
se ha introducido en esta auditoria.
