export const LINE_TYPE_COLORS = {
   Neubau: "var(--map-pipeline-neubau, #d97757)",
   Umstellung: "var(--map-pipeline-umstellung, #86b7a7)"
};

export const SELECTION_HALO_COLORS = {
   Neubau: "var(--map-pipeline-selection-halo-neubau, #d97757)",
   Umstellung: "var(--map-pipeline-selection-halo-umstellung, #86b7a7)"
};

export const PIPELINE_FALLBACK_COLOR = "var(--map-pipeline-fallback, #e5e5e2)";
export const SELECTION_HALO_FALLBACK_COLOR = "var(--map-pipeline-selection-halo-fallback, #faf9f5)";

export function getLineTypeColor(lineType) {
   return LINE_TYPE_COLORS[lineType] ?? PIPELINE_FALLBACK_COLOR;
}

export function getSelectionHaloColor(lineType) {
   return SELECTION_HALO_COLORS[lineType] ?? SELECTION_HALO_FALLBACK_COLOR;
}
