import { LINE_TYPE_COLORS } from "@/components/theme/pipelineTheme";

const entries = [
   { label: "Neubau", color: LINE_TYPE_COLORS.Neubau, opacity: 0.95 },
   { label: "Umstellung", color: LINE_TYPE_COLORS.Umstellung, opacity: 0.95 },
   {
      label: "Weder Startnetzmaßnahme noch Teil des Netzausbauvorschlags",
      colors: [LINE_TYPE_COLORS.Neubau, LINE_TYPE_COLORS.Umstellung],
      dashed: true,
      opacity: 0.68
   }
];

function LegendSymbol({ color, colors, dashed, opacity }) {
   if (dashed) {
      return (
         <span aria-hidden="true" className="grid w-6 gap-1">
            {colors.map(itemColor => (
               <span
                  className="h-0.75"
                  key={itemColor}
                  style={{
                     background: `repeating-linear-gradient(90deg, ${itemColor} 0 7px, transparent 7px 12px)`,
                     opacity
                  }}
               />
            ))}
         </span>
      );
   }

   return <span aria-hidden="true" className="h-0.75 w-6" style={{ background: color, opacity }} />;
}

export default function MapLegend() {
   return (
      <div className="absolute right-3.5 bottom-3.5 left-3.5 z-500 flex flex-wrap gap-x-3.5 gap-y-2 border border-border bg-muted/90 px-3 py-2.5 text-[0.72rem] text-muted-foreground backdrop-blur-md max-sm:hidden">
         {entries.map(entry => (
            <span key={entry.label} className="inline-flex items-center gap-2">
               <LegendSymbol color={entry.color} colors={entry.colors} dashed={entry.dashed} opacity={entry.opacity} />
               {entry.label}
            </span>
         ))}
      </div>
   );
}
