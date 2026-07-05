import { getOfficialIds } from "@/lib/domain/pipeline";

const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const INTEGER_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const COST_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export const boolLabel = value => (value ? "Ja" : "Nein");

export const listLabel = value => {
   if (Array.isArray(value)) return value.length ? value.join(", ") : "unbekannt";
   return value ?? "unbekannt";
};

export const numberLabel = (value, unit = "") => {
   if (value === null || value === undefined || value === "") return "unbekannt";
   return `${NUMBER_FORMAT.format(value)}${unit ? ` ${unit}` : ""}`;
};

export const costLabel = value => {
   if (value === null || value === undefined || value === "") return "unbekannt";
   return `${COST_FORMAT.format(value)} Mio. EUR`;
};

export const metricIntegerLabel = value => INTEGER_FORMAT.format(value);

export const metricLengthLabel = value => INTEGER_FORMAT.format(Math.round(value));

export const metricCostLabel = value => {
   if (Math.abs(value) >= 1000) return `${COST_FORMAT.format(value / 1000)} Mrd.`;
   return `${COST_FORMAT.format(value)} Mio.`;
};

export const cleanText = value => {
   if (value === null || value === undefined || value === "") return "unbekannt";
   return String(value);
};

export const pipelineTitle = feature => feature.properties.name || feature.properties.id || "H₂-Maßnahme";

const commissioningYearsLabel = props => {
   if (props.ibnJahr) return `IBN ${props.ibnJahr}`;
   if (Array.isArray(props.ibnJahre) && props.ibnJahre.length > 0) return `IBN ${props.ibnJahre.join("/")}`;
   return null;
};

export const pipelineMeta = feature => {
   const props = feature.properties;
   // Offizielle Maßnahmen-IDs haben Vorrang vor der technischen Feature-ID; bei
   // Verdichterstandorten ist props.id ein synthetischer Wert wie "verdichterstandort:…".
   const idLabel = getOfficialIds(feature).join(", ") || props.id;
   return [idLabel, props.massnahmenart ?? props.leitungstyp, commissioningYearsLabel(props)]
      .filter(Boolean)
      .join(" · ");
};
