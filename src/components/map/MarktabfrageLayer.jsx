import { CircleMarker, Marker, Pane, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { createClusterIcon } from "@/components/map/marktabfrageCluster";
import { createProjektIcon, getProjektCenter } from "@/components/map/marktabfrageMarkers";
import { getProjektAkzentColor } from "@/components/theme/marktabfrageTheme";
import { projektMeta, projektTitle } from "@/lib/domain/marktabfrageFormatters";

import "react-leaflet-cluster/dist/assets/MarkerCluster.css";

const MAP_TOOLTIP_OPTIONS = {
   className: "map-tooltip",
   direction: "top",
   interactive: false,
   offset: [0, -8],
   pane: "tooltipPane"
};

const HALO_RADIUS = 14;
const CONTEXT_RADIUS = 2;

// Kleiner Cluster-Radius: Nur Punkte, die sich tatsächlich überlagern oder dicht drängen,
// werden zusammengefasst; die farbige Übersicht über Deutschland bleibt erhalten. Spiderfy
// macht Projekte mit identischen Koordinaten einzeln anklickbar.
const MAX_CLUSTER_RADIUS = 30;

const getProjektHaloStyle = feature => ({
   className: "point-selection-halo",
   color: getProjektAkzentColor(feature),
   fillColor: getProjektAkzentColor(feature),
   fillOpacity: 0.28,
   opacity: 0.58,
   stroke: true,
   weight: 2
});

// Im Orte-Modus sind die Projekte reine Hintergrund-Textur: einheitlich neutral statt in
// Kategoriefarben. Blasse bunte Punkte würden — anders als blasse Linien — mit den farbigen
// Orts-Punkten gleicher Gestalt konkurrieren.
const PROJEKT_CONTEXT_STYLE = {
   color: "var(--map-place-leader, #3f5f72)",
   fillColor: "var(--map-place-leader, #3f5f72)",
   fillOpacity: 0.3,
   stroke: false
};

function ProjektTooltip({ feature }) {
   return (
      <Tooltip {...MAP_TOOLTIP_OPTIONS}>
         <strong>{projektTitle(feature)}</strong>
         <span>{projektMeta(feature)}</span>
      </Tooltip>
   );
}

export default function MarktabfrageLayer({
   onSelectProjekt,
   presentation = "interactive",
   projekte,
   selectedProjektId
}) {
   const isContextPresentation = presentation === "context";
   const features = projekte.features.filter(feature => feature.geometry?.type === "Point");
   if (features.length === 0) return null;

   if (isContextPresentation) {
      return (
         <Pane name="marktabfrage-projekte-context" style={{ zIndex: 426 }}>
            {features.map(feature => (
               <CircleMarker
                  center={getProjektCenter(feature)}
                  interactive={false}
                  key={feature.properties.id}
                  pathOptions={PROJEKT_CONTEXT_STYLE}
                  radius={CONTEXT_RADIUS}
               />
            ))}
         </Pane>
      );
   }

   const selectedFeature = features.find(feature => feature.properties.id === selectedProjektId) ?? null;
   // Das selektierte Projekt wird vom Clustering ausgenommen und einzeln gerendert: In einer
   // Cluster-Bubble wäre der Marker unsichtbar und der Halo stünde verwaist daneben.
   const clusterFeatures = selectedFeature ? features.filter(feature => feature !== selectedFeature) : features;

   const renderProjektMarker = (feature, { selected }) => (
      <Marker
         eventHandlers={{ click: () => onSelectProjekt(feature) }}
         icon={createProjektIcon(feature, { selected })}
         key={feature.properties.id}
         // Wie im Orte-Layer: keine namenlosen Tab-Stopps pro Marker — die Tastaturauswahl
         // läuft über die Suchergebnis-Buttons des Inspector-Panels.
         keyboard={false}
         position={getProjektCenter(feature)}
         // Der selektierte Marker liegt über allen Cluster-Badges und Nachbar-Markern im Pane.
         zIndexOffset={selected ? 1000 : 0}
      >
         <ProjektTooltip feature={feature} />
      </Marker>
   );

   return (
      <>
         {selectedFeature ? (
            <Pane name="marktabfrage-projekt-halo" style={{ zIndex: 413 }}>
               <CircleMarker
                  center={getProjektCenter(selectedFeature)}
                  interactive={false}
                  pathOptions={getProjektHaloStyle(selectedFeature)}
                  radius={HALO_RADIUS}
               />
            </Pane>
         ) : null}
         <Pane name="marktabfrage-projekte" style={{ zIndex: 456 }}>
            <MarkerClusterGroup
               chunkedLoading
               // Cluster-Badges landen im Projekt-Pane statt im Standard-markerPane (z-Index 600),
               // damit sie den freistehenden selektierten Marker nicht verdecken können.
               clusterPane="marktabfrage-projekte"
               iconCreateFunction={createClusterIcon}
               maxClusterRadius={MAX_CLUSTER_RADIUS}
               showCoverageOnHover={false}
            >
               {clusterFeatures.map(feature => renderProjektMarker(feature, { selected: false }))}
            </MarkerClusterGroup>
            {selectedFeature ? renderProjektMarker(selectedFeature, { selected: true }) : null}
         </Pane>
      </>
   );
}
