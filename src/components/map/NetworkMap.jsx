import { useState } from "react";

import CountryLayers from "@/components/map/CountryLayers";
import MapCameraEffects from "@/components/map/MapCameraEffects";
import MapLegend from "@/components/map/MapLegend";
import MapViewport from "@/components/map/MapViewport";
import MapZoomControls from "@/components/map/MapZoomControls";
import PipelineLayer from "@/components/map/PipelineLayer";

export default function NetworkMap({
   europeContext,
   filteredPipelines,
   germany,
   highlightOgeExecutingOperator = false,
   onSelectPipeline,
   resetViewKey,
   searchActive,
   searchBounds,
   selection
}) {
   const [hiddenLegendResetKey, setHiddenLegendResetKey] = useState(null);
   const isLegendVisible = hiddenLegendResetKey !== resetViewKey;

   return (
      <MapViewport>
         <MapCameraEffects
            resetViewKey={resetViewKey}
            searchActive={searchActive}
            searchBounds={searchBounds}
            selection={selection}
         />
         <MapZoomControls />
         <CountryLayers europeContext={europeContext} germany={germany} />
         <PipelineLayer
            highlightOgeExecutingOperator={highlightOgeExecutingOperator}
            onSelectPipeline={onSelectPipeline}
            pipelines={filteredPipelines}
            selectedPipelineId={selection?.item?.properties?.id}
         />
         {isLegendVisible ? (
            <MapLegend
               showOgeExecutingOperatorHighlight={highlightOgeExecutingOperator}
               onHide={() => setHiddenLegendResetKey(resetViewKey)}
            />
         ) : null}
      </MapViewport>
   );
}
