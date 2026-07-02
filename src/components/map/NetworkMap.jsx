import { useState } from "react";

import CountryLayers from "@/components/map/CountryLayers";
import MapCameraEffects from "@/components/map/MapCameraEffects";
import MapContentSwitch from "@/components/map/MapContentSwitch";
import MapLegend from "@/components/map/MapLegend";
import MapViewport from "@/components/map/MapViewport";
import MapZoomControls from "@/components/map/MapZoomControls";
import PlaceLayer from "@/components/map/PlaceLayer";
import PipelineLayer from "@/components/map/PipelineLayer";

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
   selection
}) {
   const [hiddenLegendResetKey, setHiddenLegendResetKey] = useState(null);
   const isLegendVisible = hiddenLegendResetKey !== resetViewKey;
   const showPlaces = mapContent === "places";

   return (
      <MapViewport>
         <MapCameraEffects
            resetViewKey={resetViewKey}
            searchActive={searchActive}
            searchBounds={searchBounds}
            selection={selection}
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
               <PipelineLayer pipelines={filteredPipelines} presentation="context" />
               <PlaceLayer places={places} />
            </>
         ) : (
            <PipelineLayer
               highlightOgeExecutingOperator={highlightOgeExecutingOperator}
               onSelectPipeline={onSelectPipeline}
               pipelines={filteredPipelines}
               selectedPipelineId={selection?.item?.properties?.id}
            />
         )}
         {!showPlaces && isLegendVisible ? (
            <MapLegend
               showOgeExecutingOperatorHighlight={highlightOgeExecutingOperator}
               onHide={() => setHiddenLegendResetKey(resetViewKey)}
            />
         ) : null}
      </MapViewport>
   );
}
