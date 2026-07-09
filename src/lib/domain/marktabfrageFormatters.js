import { haertegradStufeLabel, isPtgAnlage } from "@/lib/domain/marktabfrage";

export const projektTypLabel = feature => (isPtgAnlage(feature) ? "PtG-Anlage" : "H₂-Projekt");

export const projektTitle = feature => feature.properties.name || feature.properties.id || "Marktabfrage-Projekt";

// Kompakte Meta-Zeile für Trefferliste, Karten-Tooltip und Detailkopf.
export function projektMeta(feature) {
   const props = feature.properties;
   return [
      projektTypLabel(feature),
      props.kategorie,
      props.haertegradStufe === null ? null : haertegradStufeLabel(props.haertegradStufe),
      props.inbetriebnahmeJahr === null ? null : `IBN ${props.inbetriebnahmeJahr}`
   ]
      .filter(Boolean)
      .join(" · ");
}
