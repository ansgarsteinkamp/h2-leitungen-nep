import { useMemo, useState } from "react";

import CompressorSiteLayer from "@/components/map/CompressorSiteLayer";
import CountryLayers from "@/components/map/CountryLayers";
import MapCameraEffects from "@/components/map/MapCameraEffects";
import MapContentSwitch from "@/components/map/MapContentSwitch";
import MapLegend from "@/components/map/MapLegend";
import MapViewport from "@/components/map/MapViewport";
import MapZoomControls from "@/components/map/MapZoomControls";
import PlaceLayer from "@/components/map/PlaceLayer";
import PipelineLayer from "@/components/map/PipelineLayer";
import { isVerdichterstandortFeature } from "@/lib/domain/pipeline";

// Nur echte Verdichterstandorte werden als Punkte gerendert; ein off-contract Point-Feature
// eines anderen Typs soll nicht stillschweigend als Verdichter erscheinen.
const isCompressorSiteFeature = feature => feature.geometry?.type === "Point" && isVerdichterstandortFeature(feature);
const isLineFeature = feature =>
   feature.geometry?.type === "LineString" || feature.geometry?.type === "MultiLineString";

export default function NetworkMap({
   europeContext,
   filteredPipelines,
   germany,
   highlightOgeExecutingOperator = false,
   mapContent = "pipelines",
   onMapContentChange = () => {},
   onSelectPipeline,
   places = [],
   placesDisabled = false,
   placesUnavailableReason,
   resetViewKey,
   searchActive,
   searchBounds,
   selection,
   selectionCloseKey
}) {
   const [hiddenLegendResetKey, setHiddenLegendResetKey] = useState(null);
   const isLegendVisible = hiddenLegendResetKey !== resetViewKey;
   const showPlaces = mapContent === "places";
   // Punkt- und Linien-Features werden getrennt gerendert; Features ohne Geometrie erscheinen
   // bewusst nicht auf der Karte, bleiben aber Teil von Suche, Zählern und Detailansicht.
   const linePipelines = useMemo(
      () => ({ ...filteredPipelines, features: filteredPipelines.features.filter(isLineFeature) }),
      [filteredPipelines]
   );
   const compressorSites = useMemo(
      () => ({ ...filteredPipelines, features: filteredPipelines.features.filter(isCompressorSiteFeature) }),
      [filteredPipelines]
   );
   const hasCompressorSites = compressorSites.features.length > 0;

   return (
      <MapViewport>
         <MapCameraEffects
            resetViewKey={resetViewKey}
            searchActive={searchActive}
            searchBounds={searchBounds}
            selection={selection}
            selectionCloseKey={selectionCloseKey}
         />
         <MapZoomControls />
         <MapContentSwitch
            placesDisabled={placesDisabled}
            placesUnavailableReason={placesUnavailableReason}
            value={mapContent}
            onChange={onMapContentChange}
         />
         <CountryLayers europeContext={europeContext} germany={germany} />
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
                  onSelectPipeline={onSelectPipeline}
                  pipelines={linePipelines}
                  selectedPipelineId={selection?.item?.properties?.id}
               />
               <CompressorSiteLayer
                  highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                  onSelectSite={onSelectPipeline}
                  selectedSiteId={selection?.item?.properties?.id}
                  sites={compressorSites}
               />
            </>
         )}
         {!showPlaces && isLegendVisible ? (
            <MapLegend
               showCompressorSites={hasCompressorSites}
               showOgeExecutingOperatorHighlight={highlightOgeExecutingOperator}
               onHide={() => setHiddenLegendResetKey(resetViewKey)}
            />
         ) : null}
      </MapViewport>
   );
}
