import { divIcon, point } from "leaflet";

// Cluster in der Kategoriefarbe, wenn alle enthaltenen Projekte dieselbe Kategorie haben;
// gemischte Cluster bleiben neutral, statt eine dominante Kategorie vorzutäuschen.
// Die Stufen sind auf die real vorkommenden Cluster-Größen (2 bis einige Dutzend) zugeschnitten
// und kodieren die Anzahl mehrfach: Durchmesser, Farbtönung der Fläche, Halo-Breite und
// Schriftgröße wachsen mit, damit sich z. B. 2er- und 17er-Cluster auf einen Blick unterscheiden.
const CLUSTER_TIERS = [
   { minCount: 25, modifier: "projekt-cluster--xl", size: 40 },
   { minCount: 10, modifier: "projekt-cluster--lg", size: 33 },
   { minCount: 5, modifier: "projekt-cluster--md", size: 27 },
   { minCount: 0, modifier: "projekt-cluster--sm", size: 22 }
];

export function createClusterIcon(cluster) {
   // Wie die Einzelmarker (keyboard={false}): kein Tab-Stopp auf der Karte. leaflet.markercluster
   // bietet dafür keine Option; iconCreateFunction läuft in Marker._initIcon aber vor dem
   // keyboard-Check, daher wirkt das Setzen hier zuverlässig pro Cluster-Instanz.
   cluster.options.keyboard = false;

   const akzentColors = new Set(
      cluster.getAllChildMarkers().map(marker => marker.options.icon?.options?.projektAkzentColor)
   );
   const uniformColor = akzentColors.size === 1 ? (akzentColors.values().next().value ?? null) : null;
   const count = cluster.getChildCount();
   const tier = CLUSTER_TIERS.find(candidate => count >= candidate.minCount);

   return divIcon({
      className: "projekt-cluster-icon",
      html: `<span class="projekt-cluster ${tier.modifier}"${uniformColor ? ` style="--projekt-cluster-color:${uniformColor}"` : ""}>${count}</span>`,
      iconSize: point(tier.size, tier.size)
   });
}
