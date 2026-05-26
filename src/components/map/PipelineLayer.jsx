import { useCallback, useEffect, useMemo, useRef } from "react";
import { GeoJSON, Pane, useMap } from "react-leaflet";

import { pipelineMeta, pipelineTitle } from "@/lib/domain/formatters";
import { createPipelineDataKey } from "@/components/map/mapDataKey";
import { getPipelineStyle, getSelectionHaloStyle } from "@/components/map/pipelineStyle";

const MAP_TOOLTIP_OPTIONS = {
   className: "map-tooltip",
   direction: "top",
   interactive: false,
   offset: [0, -6],
   pane: "tooltipPane",
   sticky: true
};

const createTooltip = feature => {
   const root = document.createElement("span");
   const title = document.createElement("strong");
   const meta = document.createElement("span");
   title.textContent = pipelineTitle(feature);
   meta.textContent = pipelineMeta(feature);
   root.append(title, meta);
   return root;
};

const bringToFront = layer => {
   if (typeof layer.bringToFront === "function") {
      layer.bringToFront();
   }
};

const makeLayerInert = layer => {
   const element = layer.getElement();
   if (element) {
      element.setAttribute("tabindex", "-1");
      element.setAttribute("focusable", "false");
   }
};

export default function PipelineLayer({ onSelectPipeline, pipelines, selectedPipelineId }) {
   const map = useMap();
   const geoJsonRef = useRef(null);
   const hoveredPipelineIdRef = useRef(null);
   const openTooltipLayerRef = useRef(null);
   const previousPipelinesRef = useRef(pipelines);
   const selectedPipelineIdRef = useRef(selectedPipelineId);
   const pipelineDataKey = useMemo(() => createPipelineDataKey(pipelines), [pipelines]);
   const selectedPipeline = useMemo(() => {
      if (!selectedPipelineId) return null;
      return pipelines.features.find(feature => feature.properties.id === selectedPipelineId) ?? null;
   }, [pipelines, selectedPipelineId]);
   const selectedPipelineData = useMemo(() => {
      if (!selectedPipeline) return null;
      return { ...pipelines, features: [selectedPipeline] };
   }, [pipelines, selectedPipeline]);

   const closeOpenTooltip = useCallback(() => {
      openTooltipLayerRef.current?.closeTooltip();
      openTooltipLayerRef.current = null;
   }, []);

   const clearLayerTooltip = useCallback(layer => {
      layer.closeTooltip();
      if (openTooltipLayerRef.current === layer) {
         openTooltipLayerRef.current = null;
      }
   }, []);

   const bringSelectedPipelineToFront = useCallback(() => {
      const selectedPipelineId = selectedPipelineIdRef.current;
      if (!selectedPipelineId) return;

      geoJsonRef.current?.eachLayer(layer => {
         if (layer.feature?.properties.id === selectedPipelineId) {
            bringToFront(layer);
         }
      });
   }, []);

   const refreshPipelineStyles = useCallback(
      (activeSelectedPipelineId, activeHoveredPipelineId = null, { bringActiveLayersForward = true } = {}) => {
         let selectedLayer = null;
         let hoveredLayer = null;

         geoJsonRef.current?.eachLayer(layer => {
            const feature = layer.feature;
            if (!feature) return;

            const featureId = feature.properties.id;
            layer.setStyle(getPipelineStyle(feature, activeSelectedPipelineId, activeHoveredPipelineId));

            if (featureId === activeSelectedPipelineId) selectedLayer = layer;
            if (featureId === activeHoveredPipelineId) hoveredLayer = layer;
         });

         if (!bringActiveLayersForward) return;

         if (selectedLayer) bringToFront(selectedLayer);
         if (hoveredLayer) bringToFront(hoveredLayer);
      },
      []
   );

   useEffect(() => {
      const closeTooltipOnMapMove = () => {
         hoveredPipelineIdRef.current = null;
         closeOpenTooltip();
         refreshPipelineStyles(selectedPipelineIdRef.current);
      };

      map.on("movestart zoomstart dragstart", closeTooltipOnMapMove);

      return () => {
         map.off("movestart zoomstart dragstart", closeTooltipOnMapMove);
      };
   }, [closeOpenTooltip, map, refreshPipelineStyles]);

   useEffect(() => {
      if (previousPipelinesRef.current !== pipelines) {
         closeOpenTooltip();
         hoveredPipelineIdRef.current = null;
         previousPipelinesRef.current = pipelines;
      }

      selectedPipelineIdRef.current = selectedPipelineId;

      refreshPipelineStyles(selectedPipelineId, hoveredPipelineIdRef.current);
   }, [closeOpenTooltip, pipelines, refreshPipelineStyles, selectedPipelineId]);

   const bindPipeline = (feature, layer) => {
      layer.bindTooltip(createTooltip(feature), MAP_TOOLTIP_OPTIONS);

      const pipelineId = feature.properties.id;

      const selectPipeline = () => {
         closeOpenTooltip();
         onSelectPipeline(feature);
      };

      const showPipelineTooltip = event => {
         if (openTooltipLayerRef.current && openTooltipLayerRef.current !== event.target) {
            openTooltipLayerRef.current.closeTooltip();
         }
         openTooltipLayerRef.current = event.target;
         hoveredPipelineIdRef.current = pipelineId;
         event.target.setStyle(getPipelineStyle(feature, selectedPipelineIdRef.current, pipelineId));
         bringToFront(event.target);
      };

      const hidePipelineTooltip = event => {
         hoveredPipelineIdRef.current = null;
         clearLayerTooltip(event.target);
         event.target.setStyle(getPipelineStyle(feature, selectedPipelineIdRef.current));

         if (pipelineId === selectedPipelineIdRef.current) {
            bringToFront(event.target);
         } else {
            bringSelectedPipelineToFront();
         }
      };

      layer.on({
         add: () => makeLayerInert(layer),
         click: selectPipeline,
         mouseout: hidePipelineTooltip,
         mouseover: showPipelineTooltip,
         remove: event => clearLayerTooltip(event.target)
      });
   };

   return (
      <>
         {selectedPipelineData ? (
            <Pane name="pipeline-selection-halo" style={{ zIndex: 410 }}>
               <GeoJSON
                  key={`selection-halo:${pipelineDataKey}:${selectedPipelineId}`}
                  data={selectedPipelineData}
                  interactive={false}
                  style={getSelectionHaloStyle}
               />
            </Pane>
         ) : null}
         <Pane name="pipelines" style={{ zIndex: 420 }}>
            <GeoJSON
               key={pipelineDataKey}
               ref={geoJsonRef}
               data={pipelines}
               onEachFeature={bindPipeline}
               style={feature => getPipelineStyle(feature, selectedPipelineId)}
            />
         </Pane>
      </>
   );
}
