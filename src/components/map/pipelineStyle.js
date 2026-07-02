import {
   getLineTypeDashArray,
   getOgeExecutingOperatorHighlightColor,
   getPipelineColor,
   getSelectionHaloColor
} from "@/components/theme/pipelineTheme";

const BASE_WEIGHT = 3;
const HOVER_WEIGHT = 5.75;
const OGE_EXECUTING_OPERATOR_HIGHLIGHT_WEIGHT = 5.25;

export const getPipelineStyle = (
   feature,
   selectedPipelineId,
   hoveredPipelineId = null,
   { highlightOgeExecutingOperator = false } = {}
) => {
   const pipelineId = feature.properties.id;
   const selected = pipelineId === selectedPipelineId;
   const hovered = pipelineId === hoveredPipelineId;
   const highlighted = highlightOgeExecutingOperator && feature.properties.ogeIstDurchfuehrenderNetzbetreiber === true;
   const baseWeight = highlighted ? OGE_EXECUTING_OPERATOR_HIGHLIGHT_WEIGHT : BASE_WEIGHT;
   const weight = selected ? BASE_WEIGHT + 2.75 : baseWeight;

   return {
      className: null,
      color: highlighted ? getOgeExecutingOperatorHighlightColor() : getPipelineColor(feature),
      dashArray: getLineTypeDashArray(feature.properties.leitungstyp),
      lineCap: "round",
      lineJoin: "round",
      opacity: selected || hovered ? 1 : 0.95,
      weight: hovered ? Math.max(weight, HOVER_WEIGHT) : weight
   };
};

export const getSelectionHaloStyle = feature => ({
   color: getSelectionHaloColor(feature),
   className: "pipeline-selection-halo",
   dashArray: null,
   lineCap: "round",
   lineJoin: "round",
   opacity: 0.58,
   weight: 16
});
