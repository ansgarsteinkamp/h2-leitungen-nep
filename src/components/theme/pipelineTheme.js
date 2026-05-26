export const PIPELINE_PARTICIPATION_COLORS = {
   oge: "var(--map-pipeline-oge, #d97757)",
   noOge: "var(--map-pipeline-no-oge, #86b7a7)"
};

export const SELECTION_HALO_COLORS = {
   oge: "var(--map-pipeline-selection-halo-oge, #d97757)",
   noOge: "var(--map-pipeline-selection-halo-no-oge, #86b7a7)"
};

export const PIPELINE_SYMBOL_COLORS = {
   oge: "var(--map-pipeline-symbol-oge, #d97757)",
   noOge: "var(--map-pipeline-symbol-no-oge, #86b7a7)"
};

export const PIPELINE_FALLBACK_COLOR = "var(--map-pipeline-fallback, #e5e5e2)";
export const SELECTION_HALO_FALLBACK_COLOR = "var(--map-pipeline-selection-halo-fallback, #faf9f5)";

const NEUBAU_DASH_LENGTH = 4;
const NEUBAU_DASH_GAP = 4;

export const LINE_TYPE_DASH_ARRAYS = {
   Neubau: `${NEUBAU_DASH_LENGTH} ${NEUBAU_DASH_GAP}`,
   Umstellung: null
};

export function getPipelineParticipationKey(featureOrProps) {
   const props = featureOrProps?.properties ?? featureOrProps ?? {};

   if (props.ogeBeteiligung === true) return "oge";
   if (props.ogeBeteiligung === false) return "noOge";

   return "fallback";
}

export function getPipelineColor(input) {
   const participationKey = getPipelineParticipationKey(input);
   return PIPELINE_PARTICIPATION_COLORS[participationKey] ?? PIPELINE_FALLBACK_COLOR;
}

export function getLineTypeDashArray(lineType) {
   return LINE_TYPE_DASH_ARRAYS[lineType] ?? null;
}

export function getLineTypeSymbolBackground(lineType, color) {
   if (!getLineTypeDashArray(lineType)) return color;

   const dashEnd = NEUBAU_DASH_LENGTH;
   const gapEnd = NEUBAU_DASH_LENGTH + NEUBAU_DASH_GAP;
   return `repeating-linear-gradient(90deg, ${color} 0 ${dashEnd}px, transparent ${dashEnd}px ${gapEnd}px)`;
}

export function getSelectionHaloColor(input) {
   const participationKey = getPipelineParticipationKey(input);
   return SELECTION_HALO_COLORS[participationKey] ?? SELECTION_HALO_FALLBACK_COLOR;
}
