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

// NEP-Zyklen werden fachlich zweistellig benannt: 2029 -> "NEP 29".
export const nepCycleLabel = year => `NEP ${String(year % 100).padStart(2, "0")}`;

const NEP_CYCLE_LIST_FORMAT = new Intl.ListFormat("de", { type: "conjunction" });

const nepCycleListLabel = years => NEP_CYCLE_LIST_FORMAT.format(years.map(nepCycleLabel));

// Umfang der hervorgehobenen internen OGE-Planung für Legende und Exporttitel. Eine lückenlose
// Auswahl ab dem ersten Zyklus ist ein echter Planungsstand ("bis NEP 29"); jede andere Auswahl
// zeigt nur einzelne Wechsel und nennt deshalb auch die fehlenden Zyklen.
export const ogeExecutingPlanningScopeLabel = (selectedYears, availableYears) => {
   const isLeadingRange = selectedYears.every((year, index) => year === availableYears[index]);
   if (isLeadingRange) return `bis ${nepCycleLabel(selectedYears.at(-1))}`;

   const missingYears = availableYears.filter(year => !selectedYears.includes(year));
   const selectedLabel = `nur für ${nepCycleListLabel(selectedYears)}`;
   return missingYears.length > 0 ? `${selectedLabel} (ohne ${nepCycleListLabel(missingYears)})` : selectedLabel;
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
