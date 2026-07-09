import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { DomEvent } from "leaflet";

import { MAP_EXPORT_EXCLUDE_PROPS } from "@/components/map/mapExport";
import { PipelineLineSymbolStack } from "@/components/ui/pipeline-line-symbol";
import { ProjektKategorieSymbol } from "@/components/ui/projekt-kategorie-symbol";
import { PIPELINE_CONTEXT_COLORS } from "@/components/theme/pipelineTheme";
import { KATEGORIE_AUSSPEISUNG, KATEGORIE_EINSPEISUNG, KATEGORIE_SPEICHER } from "@/lib/domain/marktabfrage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const LEGEND_SYMBOL_OPACITY = 0.95;
const CONTEXT_SYMBOL_OPACITY = 0.42;

// Die Legende nennt die Fachbegriffe der Datenbasis (Ausspeisung/Einspeisung), die auch in
// Tooltips und Detailansicht stehen; die Brücke zu Exit/Entry schlägt der Kategorie-Tooltip.
const kategorieEntries = [
   { kategorie: KATEGORIE_AUSSPEISUNG, label: "Ausspeisung" },
   { kategorie: KATEGORIE_EINSPEISUNG, label: "Einspeisung" },
   { kategorie: KATEGORIE_SPEICHER, label: "Speicher" }
];

// size-2.5 entspricht den Verdichter-Punkten der NEP-Legende, damit beide Legenden
// gleich gewichtet wirken.
function KategorieLegendSymbol({ kategorie }) {
   return (
      <span className="inline-flex w-4 justify-center">
         <ProjektKategorieSymbol
            className="size-2.5"
            kategorie={kategorie}
            style={{ opacity: LEGEND_SYMBOL_OPACITY }}
         />
      </span>
   );
}

export default function MarktabfrageLegend({ onHide, showPipelineContext = false }) {
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
            {kategorieEntries.map(entry => (
               <li key={entry.label} className="inline-flex items-center gap-2">
                  <KategorieLegendSymbol kategorie={entry.kategorie} />
                  {entry.label}
               </li>
            ))}
            {showPipelineContext ? (
               <li className="mt-1 inline-flex items-center gap-2 border-t border-border/60 pt-1.5">
                  <span className="inline-flex w-4 justify-center" style={{ opacity: CONTEXT_SYMBOL_OPACITY }}>
                     <PipelineLineSymbolStack
                        className="grid w-4 shrink-0 gap-0.5"
                        colors={[PIPELINE_CONTEXT_COLORS.oge, PIPELINE_CONTEXT_COLORS.noOge]}
                        segmentClassName="h-0.5 rounded-full"
                     />
                  </span>
                  H₂-Leitungen des NEP 2025
               </li>
            ) : null}
         </ul>
      </aside>
   );
}
