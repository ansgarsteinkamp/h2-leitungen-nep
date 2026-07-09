import { divIcon, point } from "leaflet";

import { projektMarkerSvg } from "@/components/theme/marktabfrageShapes";
import { getProjektAkzentColor } from "@/components/theme/marktabfrageTheme";

// Positionen pro Feature gecacht: react-leaflet v5 vergleicht position per Referenz, ein bei
// jedem Render neues Array würde setLatLng auf jedem Marker auslösen und die Cluster-Gruppe
// zum kompletten Recluster (removeLayer/addLayer inkl. Unspiderfy) zwingen.
const projektCenterCache = new WeakMap();

export const getProjektCenter = feature => {
   let center = projektCenterCache.get(feature);
   if (!center) {
      const [lon, lat] = feature.geometry.coordinates;
      center = [lat, lon];
      projektCenterCache.set(feature, center);
   }
   return center;
};

// Die Marker sind DivIcons mit Kategorie-Form (Kreis, Dreieck, Quadrat) statt einheitlicher
// CircleMarker; der Hover-Effekt läuft über CSS (.projekt-marker). Es gibt nur sechs Varianten
// (3 Kategorien × selected), die modulweit gecacht werden: Stabile Icon-Referenzen verhindern —
// analog zu getProjektCenter — setIcon-Kaskaden bei jedem Re-Render der Karte.
const projektIconCache = new Map();

export const createProjektIcon = (feature, { selected }) => {
   const { kategorie } = feature.properties;
   const cacheKey = `${kategorie}:${selected}`;
   let icon = projektIconCache.get(cacheKey);
   if (!icon) {
      const { html, size } = projektMarkerSvg(kategorie, { selected });
      // projektAkzentColor reist als Icon-Option mit: `icon` ist — anders als eine Custom-Prop am
      // Marker — dokumentierter react-leaflet/Leaflet-Vertrag (marker.options.icon), worüber
      // createClusterIcon die Akzentfarbe für einheitlich gefärbte Cluster liest.
      icon = divIcon({
         className: "projekt-marker",
         html,
         iconSize: point(size, size),
         projektAkzentColor: getProjektAkzentColor(feature)
      });
      projektIconCache.set(cacheKey, icon);
   }
   return icon;
};
