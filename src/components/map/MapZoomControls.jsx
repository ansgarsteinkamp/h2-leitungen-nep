import { DomEvent } from "leaflet";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";

const ZOOM_STEP = 0.5;

export default function MapZoomControls() {
   const map = useMap();
   const controlRef = useRef(null);
   const [zoom, setZoom] = useState(map.getZoom());

   useEffect(() => {
      if (controlRef.current) {
         DomEvent.disableClickPropagation(controlRef.current);
         DomEvent.disableScrollPropagation(controlRef.current);
      }

      const syncZoom = () => setZoom(map.getZoom());
      map.on("zoomend", syncZoom);
      syncZoom();

      return () => {
         map.off("zoomend", syncZoom);
      };
   }, [map]);

   return (
      <div
         className="absolute top-3 left-3 z-500 grid border border-border bg-accent"
         ref={controlRef}
         role="group"
         aria-label="Kartenzoom"
      >
         <button
            aria-label="Karte vergrößern"
            className="grid size-8 place-items-center border-0 border-b border-border bg-accent text-accent-foreground transition-colors hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-ring/50"
            disabled={zoom >= map.getMaxZoom()}
            onClick={event => {
               event.preventDefault();
               event.stopPropagation();
               map.zoomIn(ZOOM_STEP);
            }}
            type="button"
         >
            <Plus aria-hidden="true" className="size-4" />
         </button>
         <button
            aria-label="Karte verkleinern"
            className="grid size-8 place-items-center border-0 bg-accent text-accent-foreground transition-colors hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-ring/50"
            disabled={zoom <= map.getMinZoom()}
            onClick={event => {
               event.preventDefault();
               event.stopPropagation();
               map.zoomOut(ZOOM_STEP);
            }}
            type="button"
         >
            <Minus aria-hidden="true" className="size-4" />
         </button>
      </div>
   );
}
