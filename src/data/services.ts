import type messages from "../i18n/json/es.json";

export interface Service {
  space: string;
  image: string;
  title: string;
  translationKey: keyof typeof messages;
  technicalKey?: keyof typeof messages;
  disabled?: boolean;
}

// Product names are brands; all descriptive copy lives in the dictionaries.
export const homeServices: Service[] = [
  {
    "space": "vivienda",
    "image": "/assets/card-images/services/home-card.webp",
    "title": "HOME",
    "translationKey": "service_home_summary",
    "technicalKey": "service_home_technical"
  },
  {
    "space": "garaje",
    "image": "/assets/card-images/services/garaje-card.webp",
    "title": "GARAGE",
    "translationKey": "service_garage_summary",
    "technicalKey": "service_garage_technical"
  },
  {
    "space": "local-comercial",
    "image": "/assets/card-images/services/local-card.webp",
    "title": "BUSINESS",
    "translationKey": "service_business_summary",
    "technicalKey": "service_business_technical"
  },
  {
    "space": "industria",
    "disabled": true,
    "image": "/assets/card-images/services/industria-card.webp",
    "title": "INDUSTRY",
    "translationKey": "service_industry_summary",
    "technicalKey": "service_industry_technical"
  },
  {
    "space": "exterior",
    "disabled": true,
    "image": "/assets/card-images/services/outdoor-card.webp",
    "title": "OUTDOOR",
    "translationKey": "service_outdoor_summary",
    "technicalKey": "service_outdoor_technical"
  }
];

export const standaloneServices: Service[] = homeServices.map((service, index) =>
  index === 0 ? service : {
    ...service,
    technicalKey: undefined,
    translationKey: `feature_card_${index + 1}_text` as keyof typeof messages,
  }
);
