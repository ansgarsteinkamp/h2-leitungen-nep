import { LEISTUNG_REFERENZJAHR, getLeistungMw, isPtgAnlage } from "@/lib/domain/marktabfrage";

// Kennzahlen der Marktabfrage-Ansicht: Projektanzahlen je Typ und die Summe der
// kategoriegerechten H₂-Leistung im Referenzjahr über die aktuell gefilterten Projekte.
export function sumMarktabfrageMetrics(collection, referenzjahr = LEISTUNG_REFERENZJAHR) {
   return collection.features.reduce(
      (metrics, feature) => {
         if (isPtgAnlage(feature)) {
            metrics.ptgCount += 1;
         } else {
            metrics.wasserstoffCount += 1;
         }

         const leistung = getLeistungMw(feature, referenzjahr);
         if (leistung !== null) metrics.leistungMw += leistung;

         return metrics;
      },
      { leistungMw: 0, ptgCount: 0, wasserstoffCount: 0 }
   );
}
