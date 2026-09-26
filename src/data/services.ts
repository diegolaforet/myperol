export interface Service {
  space: string;
  technical?: string;
  image: string;
  title: string;
  summary: string;
  translationKey?: string;
}

export const homeServices: Service[] = [
  {
    "space": "vivienda",
    "technical": "MP SYSTEM HOME es un pavimento continuo diseñado para viviendas, villas y proyectos residenciales donde la estética debe convivir con el uso diario. El sistema se configura según el soporte, las condiciones de la superficie y el acabado seleccionado, combinando preparación mecánica, imprimación de alta adherencia, capas de resina y protección final.\n\nEl resultado es una superficie uniforme, sin las juntas visuales tradicionales, resistente al desgaste cotidiano y fácil de mantener. Disponible en acabados lisos, minerales o decorativos, permite integrar el pavimento con la arquitectura, la iluminación y el diseño interior del espacio.",
    "image": "/assets/card-images/services/home-card.webp",
    "title": "HOME",
    "summary": "Continuidad que transforma la forma de vivir cada espacio."
  },
  {
    "space": "garaje",
    "technical": "MP SYSTEM GARAGE esta desarrollado para soportar el peso de los vehiculos, el transito frecuente, la abrasion y las exigencias propias de un garaje de uso intensivo. Su configuracion multicapa combina preparacion mecanica del soporte, imprimacion epoxi, refuerzo con aridos seleccionados, capa de resina y una terminacion protectora adaptada al nivel de uso.\n\nPuede incorporar acabados lisos, decorativos o antideslizantes, ofreciendo una superficie resistente, continua y facil de limpiar. Cada sistema se ajusta segun la exposicion solar, la presencia de aceites, las pendientes, los desagues y las condiciones de humedad del soporte.",
    "image": "/assets/card-images/services/garaje-card.webp",
    "title": "GARAGE",
    "summary": "Convierte tu garaje en un espacio a la altura de lo que guarda."
  },
  {
    "space": "local-comercial",
    "technical": "MP SYSTEM BUSINESS esta disenado para espacios comerciales donde el pavimento forma parte de la experiencia del cliente. Clinicas, tiendas, restaurantes, oficinas, gimnasios y showrooms requieren superficies capaces de soportar transito diario sin perder coherencia estetica.\n\nEl sistema combina una base tecnicamente preparada, capas continuas de altas prestaciones y una proteccion final seleccionada segun el uso, la limpieza y el nivel de deslizamiento requerido. Su acabado puede personalizarse en color, textura y grado de brillo para integrarse con la identidad visual del negocio y facilitar un mantenimiento eficiente.",
    "image": "/assets/card-images/services/local-card.webp",
    "title": "BUSINESS",
    "summary": "Un espacio mas limpio, mas solido y mas memorable."
  },
  {
    "space": "industria",
    "technical": "MP SYSTEM INDUSTRY esta desarrollado para entornos sometidos a cargas, abrasion, transito tecnico y limpieza frecuente. Cada solucion se disena a partir de las exigencias reales de la actividad: tipo de maquinaria, intensidad de uso, exposicion quimica, temperatura, seguridad y tiempo disponible para la ejecucion.\n\nSegun el proyecto, puede configurarse como sistema multicapa, autonivelante o reforzado con arido. Su estructura proporciona adherencia, resistencia mecanica y una textura adaptada al entorno de trabajo, creando un pavimento fiable, mantenible y preparado para un uso profesional prolongado.",
    "image": "/assets/card-images/services/industria-card.webp",
    "title": "INDUSTRY",
    "summary": "Rendimiento continuo para espacios que no pueden detenerse."
  },
  {
    "space": "exterior",
    "technical": "MP SYSTEM OUTDOOR esta concebido para terrazas, accesos, porches y zonas expuestas donde el pavimento debe responder a cambios termicos, radiacion solar, agua y transito exterior. No se aplica como una solucion generica: cada superficie se estudia segun su soporte, exposicion, pendientes, juntas y sistema de drenaje.\n\nLa solucion puede incorporar capas de adherencia, regularizacion, revestimientos compatibles con exterior y terminaciones resistentes a la radiacion ultravioleta. El nivel de textura se adapta al uso previsto para mejorar la seguridad sin renunciar a una superficie integrada con la arquitectura.",
    "image": "/assets/card-images/services/outdoor-card.webp",
    "title": "OUTDOOR",
    "summary": "El exterior tambien puede sentirse continuo."
  }
];

export const standaloneServices: Service[] = [
  {
    "space": "vivienda",
    "technical": "MP SYSTEM HOME es un pavimento continuo diseñado para viviendas, villas y proyectos residenciales donde la estética debe convivir con el uso diario. El sistema se configura según el soporte, las condiciones de la superficie y el acabado seleccionado, combinando preparación mecánica, imprimación de alta adherencia, capas de resina y protección final.\n\nEl resultado es una superficie uniforme, sin las juntas visuales tradicionales, resistente al desgaste cotidiano y fácil de mantener. Disponible en acabados lisos, minerales o decorativos, permite integrar el pavimento con la arquitectura, la iluminación y el diseño interior del espacio.",
    "image": "/assets/card-images/services/home-card.webp",
    "title": "HOME",
    "summary": "Continuidad que transforma la forma de vivir cada espacio."
  },
  {
    "space": "garaje",
    "image": "/assets/card-images/services/garaje-card.webp",
    "title": "GARAGE",
    "summary": "Texto placeholder para explicar una mejora visual del espacio.",
    "translationKey": "feature_card_2_text"
  },
  {
    "space": "local-comercial",
    "image": "/assets/card-images/services/local-card.webp",
    "title": "BUSSINES",
    "summary": "Texto placeholder para una tarjeta comercial sin imagen por ahora.",
    "translationKey": "feature_card_3_text"
  },
  {
    "space": "industria",
    "image": "/assets/card-images/services/industria-card.webp",
    "title": "INDUSTRY",
    "summary": "Texto placeholder para destacar orden, amplitud y continuidad.",
    "translationKey": "feature_card_4_text"
  },
  {
    "space": "exterior",
    "image": "/assets/card-images/services/outdoor-card.webp",
    "title": "OUTDOOR",
    "summary": "Texto placeholder para explicar el impacto del suelo en el ambiente.",
    "translationKey": "feature_card_5_text"
  }
];
