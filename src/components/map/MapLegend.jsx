import { PipelineLineSymbol } from "@/components/ui/pipeline-line-symbol";
import { PIPELINE_SYMBOL_COLORS } from "@/components/theme/pipelineTheme";

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
      <PipelineLineSymbol className="h-0.75 w-6" color={color} lineType={lineType} opacity={LEGEND_SYMBOL_OPACITY} />
   );
}

export default function MapLegend() {
   return (
      <aside
         aria-label="Kartenlegende"
         className="absolute right-3.5 bottom-3.5 left-3.5 z-500 border border-border bg-[var(--map-legend-background)] px-3 py-2.5 text-[0.72rem] text-muted-foreground backdrop-blur-md max-sm:hidden"
      >
         <ul className="flex flex-wrap gap-x-3.5 gap-y-2">
            {entries.map(entry => (
               <li key={entry.label} className="inline-flex items-center gap-2">
                  <LegendSymbol color={entry.color} lineType={entry.lineType} />
                  {entry.label}
               </li>
            ))}
         </ul>
      </aside>
   );
}
