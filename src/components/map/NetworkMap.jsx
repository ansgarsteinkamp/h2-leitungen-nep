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
   onSelectPipeline,
   resetViewKey,
   searchActive,
   searchBounds,
   selection
}) {
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
            onSelectPipeline={onSelectPipeline}
            pipelines={filteredPipelines}
            selectedPipelineId={selection?.item?.properties?.id}
         />
         <MapLegend />
      </MapViewport>
   );
}
