import { getMeasureUnits, getOfficialIds, isLeitungFeature } from "@/lib/domain/pipeline";

// Kennzahlen werden auf Maßnahmen-Ebene summiert: Bei Verdichterstandorten zählen die
// verschachtelten Einzelmaßnahmen, nicht die Parent-Aggregate. Über `unitMatches(unit, feature)`
// fließen nur die Einzelmaßnahmen ein, die den aktiven Filtern (und der Suche) entsprechen — ein
// Standort, der nur wegen einer passenden Maßnahme sichtbar bleibt, zählt sonst mit seinem
// vollen Bündel.
export function sumPipelineMetrics(collection, unitMatches = () => true) {
   return collection.features.reduce(
      (metrics, feature) => {
         getMeasureUnits(feature)
            .filter(unit => unitMatches(unit, feature))
            .forEach(unit => {
               metrics.count += Math.max(1, getOfficialIds(unit).length);
               // Längen sind nur für Leitungen fachlich summierbar.
               if (isLeitungFeature(unit) && Number.isFinite(unit.laengeKm)) metrics.lengthKm += unit.laengeKm;
               if (Number.isFinite(unit.kostenMioEur)) metrics.costMioEur += unit.kostenMioEur;
            });

         return metrics;
      },
      { count: 0, lengthKm: 0, costMioEur: 0 }
   );
}
