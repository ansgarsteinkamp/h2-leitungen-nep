import { isStandardFeature } from "@/lib/domain/pipeline";
import { getLineTypeColor, getSelectionHaloColor } from "@/components/theme/pipelineTheme";

const BASE_WEIGHT = 3.5;
const HOVER_WEIGHT = 6.5;

export const getPipelineStyle = (feature, selectedPipelineId, hoveredPipelineId = null) => {
   const pipelineId = feature.properties.id;
   const selected = pipelineId === selectedPipelineId;
   const hovered = pipelineId === hoveredPipelineId;
   const standard = isStandardFeature(feature);
   const weight = selected ? BASE_WEIGHT + 3 : BASE_WEIGHT;

   return {
      className: standard || selected || hovered ? null : "pipeline-nonstandard",
      color: getLineTypeColor(feature.properties.leitungstyp),
      dashArray: standard ? null : "7 5",
      lineCap: "round",
      lineJoin: "round",
      opacity: selected || hovered ? 1 : standard ? 0.95 : 0.68,
      weight: hovered ? Math.max(weight, HOVER_WEIGHT) : weight
   };
};

export const getSelectionHaloStyle = feature => ({
   color: getSelectionHaloColor(feature.properties.leitungstyp),
   className: "pipeline-selection-halo",
   dashArray: null,
   lineCap: "round",
   lineJoin: "round",
   opacity: 0.58,
   weight: 18
});
