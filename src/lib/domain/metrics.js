export function sumPipelineMetrics(collection) {
   return collection.features.reduce(
      (metrics, feature) => {
         const { kostenMioEur, laengeKm } = feature.properties;

         metrics.count += 1;
         if (Number.isFinite(laengeKm)) metrics.lengthKm += laengeKm;
         if (Number.isFinite(kostenMioEur)) metrics.costMioEur += kostenMioEur;

         return metrics;
      },
      { count: 0, lengthKm: 0, costMioEur: 0 }
   );
}
