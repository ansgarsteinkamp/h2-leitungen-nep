import { Route, Shapes } from "lucide-react";
import { useMemo, useState } from "react";

import CompressorSiteLayer from "@/components/map/CompressorSiteLayer";
import CountryLayers from "@/components/map/CountryLayers";
import MapCameraEffects from "@/components/map/MapCameraEffects";
import MapContentSwitch from "@/components/map/MapContentSwitch";
import MapLegend from "@/components/map/MapLegend";
import MarktabfrageLayer from "@/components/map/MarktabfrageLayer";
import MarktabfrageLegend from "@/components/map/MarktabfrageLegend";
import MapViewport from "@/components/map/MapViewport";
import MapZoomControls from "@/components/map/MapZoomControls";
import PlaceLayer from "@/components/map/PlaceLayer";
import PipelineLayer from "@/components/map/PipelineLayer";
import { DATENSATZ_MARKTABFRAGE, DATENSATZ_NEP } from "@/lib/domain/constants";
import { ogeExecutingPlanningScopeLabel } from "@/lib/domain/formatters";
import { EMPTY_OGE_EXECUTING_NEPS, hasLineGeometry, isVerdichterstandortFeature } from "@/lib/domain/pipeline";

// Nur echte Verdichterstandorte werden als Punkte gerendert; ein off-contract Point-Feature
// eines anderen Typs soll nicht stillschweigend als Verdichter erscheinen.
const isCompressorSiteFeature = feature => feature.geometry?.type === "Point" && isVerdichterstandortFeature(feature);

// Fallback für fehlende Marktabfrage-Daten: leerer Layer statt Crash beim Zugriff auf features.
const EMPTY_PROJEKTE = { type: "FeatureCollection", features: [] };

export default function NetworkMap({
   europeContext,
   filteredPipelines,
   germany,
   highlightOgeExecutingOperator = false,
   isVisibleMeasure,
   ogeExecutingNepYears = EMPTY_OGE_EXECUTING_NEPS,
   ogeExecutingNeps = EMPTY_OGE_EXECUTING_NEPS,
   mapContent = "pipelines",
   marktabfrageMode = false,
   marktabfrageProjekte = null,
   onMapContentChange = () => {},
   onSelectPipeline,
   pipelineContext = null,
   places = [],
   placesDisabled = false,
   placesUnavailableReason,
   resetViewKey,
   searchActive,
   searchBounds,
   selection,
   selectionCloseKey
}) {
   const datensatzKey = marktabfrageMode ? DATENSATZ_MARKTABFRAGE : DATENSATZ_NEP;
   // Der Ausblenden-Zustand gilt pro Datensatz und Ansichts-Reset: Die NEP- und die
   // Marktabfrage-Legende sind inhaltlich verschieden, ein Ausblenden der einen darf die
   // andere nicht mit verstecken.
   const [hiddenLegendKey, setHiddenLegendKey] = useState(null);
   const legendKey = `${datensatzKey}:${resetViewKey}`;
   // Wirksam sind die NEP-Zyklen nur zusammen mit der OGE-Hervorhebung.
   const activeOgeExecutingNeps = highlightOgeExecutingOperator ? ogeExecutingNeps : EMPTY_OGE_EXECUTING_NEPS;
   // Solange interne OGE-Planung hervorgehoben ist, bleibt die NEP-Legende sichtbar: Sie ist in
   // Screenshots und Exporten der einzige Hinweis darauf.
   const showsInternalPlanning = !marktabfrageMode && activeOgeExecutingNeps.length > 0;
   const isLegendVisible = showsInternalPlanning || hiddenLegendKey !== legendKey;
   const showPlaces = mapContent === "places";
   const projekte = marktabfrageProjekte ?? EMPTY_PROJEKTE;
   // Punkt- und Linien-Features werden getrennt gerendert; Features ohne Geometrie erscheinen
   // bewusst nicht auf der Karte, bleiben aber Teil von Suche, Zählern und Detailansicht.
   const linePipelines = useMemo(
      () => ({ ...filteredPipelines, features: filteredPipelines.features.filter(hasLineGeometry) }),
      [filteredPipelines]
   );
   const compressorSites = useMemo(
      () => ({ ...filteredPipelines, features: filteredPipelines.features.filter(isCompressorSiteFeature) }),
      [filteredPipelines]
   );
   const hasCompressorSites = compressorSites.features.length > 0;
   const hasPipelineContext = Boolean(pipelineContext?.features?.length);

   return (
      <MapViewport
         exportFilenameTitle={
            marktabfrageMode
               ? "Karte der H₂-Projekte und PtG-Anlagen"
               : showsInternalPlanning
                 ? `Karte der H₂-Maßnahmen inkl. interner OGE-Planung ${ogeExecutingPlanningScopeLabel(activeOgeExecutingNeps, ogeExecutingNepYears)}`
                 : undefined
         }
         label={
            marktabfrageMode ? "Interaktive Karte der H₂-Projekte und PtG-Anlagen aus der Marktabfrage 2026" : undefined
         }
      >
         <MapCameraEffects
            datensatzKey={datensatzKey}
            resetViewKey={resetViewKey}
            searchActive={searchActive}
            searchBounds={searchBounds}
            selection={selection}
            selectionCloseKey={selectionCloseKey}
         />
         <MapZoomControls />
         <MapContentSwitch
            contentIcon={marktabfrageMode ? Shapes : Route}
            contentLabel={marktabfrageMode ? "Projekte" : "Maßnahmen"}
            contentTooltip={
               marktabfrageMode
                  ? "Projekte und PtG-Anlagen der Marktabfrage 2026 anzeigen"
                  : "H₂-Maßnahmen des NEP 2025 anzeigen"
            }
            placesDisabled={placesDisabled}
            placesUnavailableReason={placesUnavailableReason}
            value={mapContent}
            onChange={onMapContentChange}
         />
         <CountryLayers europeContext={europeContext} germany={germany} />
         {marktabfrageMode ? (
            // Marktabfrage-Modus: Projekte als interaktive Punkte, das geplante H₂-Netz blass als
            // Kontext. Im Orte-Modus weichen die Leitungen den Ortsmarkierungen, damit nie mehr
            // als zwei inhaltliche Schichten konkurrieren.
            <>
               {showPlaces ? (
                  <>
                     <MarktabfrageLayer presentation="context" projekte={projekte} />
                     <PlaceLayer places={places} />
                  </>
               ) : (
                  <>
                     {hasPipelineContext ? <PipelineLayer pipelines={pipelineContext} presentation="context" /> : null}
                     <MarktabfrageLayer
                        onSelectProjekt={onSelectPipeline}
                        projekte={projekte}
                        selectedProjektId={selection?.item?.properties?.id}
                     />
                  </>
               )}
               {!showPlaces && isLegendVisible ? (
                  <MarktabfrageLegend
                     onHide={() => setHiddenLegendKey(legendKey)}
                     showPipelineContext={hasPipelineContext}
                  />
               ) : null}
            </>
         ) : (
            <>
               {showPlaces ? (
                  <>
                     <PipelineLayer pipelines={linePipelines} presentation="context" />
                     <CompressorSiteLayer presentation="context" sites={compressorSites} />
                     <PlaceLayer places={places} />
                  </>
               ) : (
                  <>
                     <PipelineLayer
                        highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                        ogeExecutingNeps={activeOgeExecutingNeps}
                        onSelectPipeline={onSelectPipeline}
                        pipelines={linePipelines}
                        selectedPipelineId={selection?.item?.properties?.id}
                     />
                     <CompressorSiteLayer
                        highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                        isVisibleMeasure={isVisibleMeasure}
                        ogeExecutingNeps={activeOgeExecutingNeps}
                        onSelectSite={onSelectPipeline}
                        selectedSiteId={selection?.item?.properties?.id}
                        sites={compressorSites}
                     />
                  </>
               )}
               {!showPlaces && isLegendVisible ? (
                  <MapLegend
                     ogeExecutingNepYears={ogeExecutingNepYears}
                     ogeExecutingNeps={activeOgeExecutingNeps}
                     showCompressorSites={hasCompressorSites}
                     showOgeExecutingOperatorHighlight={highlightOgeExecutingOperator}
                     onHide={showsInternalPlanning ? undefined : () => setHiddenLegendKey(legendKey)}
                  />
               ) : null}
            </>
         )}
      </MapViewport>
   );
}
