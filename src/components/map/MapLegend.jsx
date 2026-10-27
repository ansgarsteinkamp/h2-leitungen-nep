import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { DomEvent } from "leaflet";

import { MAP_EXPORT_EXCLUDE_PROPS } from "@/components/map/mapExport";
import { PipelineLineSymbol } from "@/components/ui/pipeline-line-symbol";
import { OGE_EXECUTING_OPERATOR_HIGHLIGHT_COLOR, PIPELINE_SYMBOL_COLORS } from "@/components/theme/pipelineTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { nepCycleLabel } from "@/lib/domain/formatters";

const participationEntries = [
   { key: "oge", label: "OGE-Bezug" },
   { key: "noOge", label: "Kein OGE-Bezug" }
];

const lineTypeEntries = ["Umstellung", "Neubau"];
const LEGEND_SYMBOL_OPACITY = 0.95;
const entries = participationEntries.flatMap(participation =>
   lineTypeEntries.map(lineType => ({
      color: PIPELINE_SYMBOL_COLORS[participation.key],
      label: `${participation.label} ${lineType}`,
      lineType
   }))
);

function LegendSymbol({ color, lineType }) {
   return (
      <PipelineLineSymbol className="h-0.5 w-4" color={color} lineType={lineType} opacity={LEGEND_SYMBOL_OPACITY} />
   );
}

function HighlightLegendSymbol() {
   return (
      <PipelineLineSymbol
         className="h-1.25 w-4 rounded-full"
         color={OGE_EXECUTING_OPERATOR_HIGHLIGHT_COLOR}
         opacity={1}
      />
   );
}

function SiteLegendSymbol({ color }) {
   return (
      <span className="inline-flex w-4 justify-center">
         <span
            aria-hidden="true"
            className="size-2.5 rounded-full border border-[var(--map-place-marker-stroke)]"
            style={{ backgroundColor: color, opacity: LEGEND_SYMBOL_OPACITY }}
         />
      </span>
   );
}

// Die NEP-Erweiterung ist interne OGE-Planung und wird deshalb in der Legende genannt. Der Eintrag
// trägt nicht zur Legendenbreite bei (w-0 min-w-full) und bricht in der Breite der übrigen um.
function OgeExecutingHighlightLegendEntry({ ogeExecutingNeps }) {
   return (
      <li className="mt-1 flex w-0 min-w-full items-start gap-2 border-t border-border/60 pt-1.5">
         <span className="inline-flex h-[1.5em] shrink-0 items-center">
            <HighlightLegendSymbol />
         </span>
         <span className="grid min-w-0 gap-0.5 leading-[1.5]">
            <span>OGE als durchführender FNB</span>
            {ogeExecutingNeps.length > 0 ? (
               <span>{`inkl. interner Planung ${ogeExecutingNeps.map(nepCycleLabel).join(", ")}`}</span>
            ) : null}
         </span>
      </li>
   );
}

export default function MapLegend({
   ogeExecutingNeps = [],
   showCompressorSites = false,
   showOgeExecutingOperatorHighlight = false,
   onHide
}) {
   const legendRef = useRef(null);

   useEffect(() => {
      if (!legendRef.current) return;

      DomEvent.disableClickPropagation(legendRef.current);
      DomEvent.disableScrollPropagation(legendRef.current);
   }, []);

   return (
      <aside
         ref={legendRef}
         aria-label="Kartenlegende"
         className="absolute right-3.5 bottom-3.5 z-500 w-fit max-w-[min(18rem,calc(100%-1.75rem))] rounded-md border border-border bg-[var(--map-legend-background)] px-2.5 py-2 text-[0.55rem] text-muted-foreground backdrop-blur-md max-sm:hidden"
      >
         {onHide ? (
            <Tooltip>
               <TooltipTrigger asChild>
                  <button
                     aria-label="Legende ausblenden"
                     className="absolute top-1.5 right-1.5 grid size-4.5 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/15 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:outline-none"
                     onClick={onHide}
                     type="button"
                     {...MAP_EXPORT_EXCLUDE_PROPS}
                  >
                     <X aria-hidden="true" className="size-3" strokeWidth={2} />
                  </button>
               </TooltipTrigger>
               <TooltipContent side="left">
                  <span>Legende ausblenden</span>
               </TooltipContent>
            </Tooltip>
         ) : null}
         <ul className="grid gap-1.25">
            {entries.map(entry => (
               <li key={entry.label} className="inline-flex items-center gap-2">
                  <LegendSymbol color={entry.color} lineType={entry.lineType} />
                  {entry.label}
               </li>
            ))}
            {showCompressorSites
               ? participationEntries.map(participation => (
                    <li key={`site:${participation.key}`} className="inline-flex items-center gap-2">
                       <SiteLegendSymbol color={PIPELINE_SYMBOL_COLORS[participation.key]} />
                       {`${participation.label} Verdichter`}
                    </li>
                 ))
               : null}
            {showOgeExecutingOperatorHighlight ? (
               <OgeExecutingHighlightLegendEntry ogeExecutingNeps={ogeExecutingNeps} />
            ) : null}
         </ul>
      </aside>
   );
}
