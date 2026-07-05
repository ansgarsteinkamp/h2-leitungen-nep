import { MapPin, Route } from "lucide-react";
import { useEffect, useRef } from "react";

import { DomEvent } from "leaflet";

import { MAP_EXPORT_EXCLUDE_PROPS } from "@/components/map/mapExport";
import { cn } from "@/lib/utils";

const MAP_CONTENT_OPTIONS = [
   { icon: Route, label: "Maßnahmen", value: "pipelines" },
   { icon: MapPin, label: "Orte", value: "places" }
];

const BUTTON_CLASS =
   "inline-flex min-h-7 w-full items-center justify-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.66rem] font-medium text-muted-foreground transition-colors hover:bg-primary/12 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 xs:min-h-8 xs:px-3 dark:focus-visible:ring-ring/50";
const ACTIVE_BUTTON_CLASS = "bg-primary/20 text-card-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.42)]";
const PLACES_STATUS_ID = "map-content-places-status";

export default function MapContentSwitch({ placesDisabled = false, placesUnavailableReason, value, onChange }) {
   const controlRef = useRef(null);

   useEffect(() => {
      if (!controlRef.current) return;

      DomEvent.disableClickPropagation(controlRef.current);
      DomEvent.disableScrollPropagation(controlRef.current);
   }, []);

   return (
      <div
         aria-label="Karteninhalt"
         className="absolute bottom-2 left-2 z-500 w-fit max-w-[calc(100%-1rem)] rounded-md border border-border bg-[var(--map-legend-background)] p-1 text-muted-foreground shadow-lg shadow-background/15 backdrop-blur-md xs:bottom-3.5 xs:left-3.5"
         ref={controlRef}
         role="group"
         {...MAP_EXPORT_EXCLUDE_PROPS}
      >
         <div className="grid w-[6.75rem] gap-0.5 xs:w-[7.25rem]">
            {MAP_CONTENT_OPTIONS.map(option => {
               const Icon = option.icon;
               const active = value === option.value;
               const disabled = option.value === "places" && placesDisabled;

               return (
                  <button
                     aria-describedby={disabled && placesUnavailableReason ? PLACES_STATUS_ID : undefined}
                     aria-pressed={active}
                     className={cn(BUTTON_CLASS, active && ACTIVE_BUTTON_CLASS)}
                     disabled={disabled}
                     key={option.value}
                     onClick={() => onChange(option.value)}
                     type="button"
                  >
                     <span className="truncate leading-tight">{option.label}</span>
                     <Icon aria-hidden="true" className="size-3 shrink-0 xs:size-3.5" strokeWidth={2.1} />
                  </button>
               );
            })}
         </div>
         {placesDisabled && placesUnavailableReason ? (
            <span className="sr-only" id={PLACES_STATUS_ID}>
               {placesUnavailableReason}
            </span>
         ) : null}
      </div>
   );
}
