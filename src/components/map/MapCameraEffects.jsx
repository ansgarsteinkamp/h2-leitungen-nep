import { useEffect, useRef } from "react";
import { latLngBounds } from "leaflet";
import { useMap } from "react-leaflet";

import { INITIAL_BOUNDS } from "@/lib/domain/constants";
import { featureToLatLngs } from "@/lib/domain/coordinates";

const INITIAL_CAMERA_PADDING = [48, 48];
const SEARCH_CAMERA_PADDING = [48, 48];
const SEARCH_MAX_FIT_ZOOM = 8;
const SELECTION_CAMERA_PADDING = [80, 80];
const SELECTION_MAX_FIT_ZOOM = 7;

function focusSelectionBounds(map, selectionBounds) {
   const fitZoom = map.getBoundsZoom(selectionBounds, false, SELECTION_CAMERA_PADDING);
   const targetZoom = Math.min(fitZoom, SELECTION_MAX_FIT_ZOOM);

   if (map.getZoom() > targetZoom) {
      map.panTo(latLngBounds(selectionBounds).getCenter(), {
         animate: true,
         duration: 0.35
      });
      return;
   }

   map.fitBounds(selectionBounds, {
      animate: true,
      maxZoom: SELECTION_MAX_FIT_ZOOM,
      padding: SELECTION_CAMERA_PADDING
   });
}

export default function MapCameraEffects({
   datensatzKey = "nep",
   resetViewKey,
   searchActive,
   searchBounds,
   selection,
   selectionCloseKey = 0
}) {
   const map = useMap();
   // Merkt sich, ob Auswahl oder Suche die Kamera tatsächlich bewegt haben: Nur dann darf ein
   // Suchende oder Auswahl-Schließen zur Übersicht zurückkehren; ein manuell gesetzter
   // Ausschnitt bleibt sonst unangetastet.
   const cameraOwnedRef = useRef(false);
   const previousDatensatzKeyRef = useRef(datensatzKey);
   const previousMapRef = useRef(null);
   const previousResetViewKeyRef = useRef(resetViewKey);
   const previousSearchActiveRef = useRef(searchActive);
   const previousSearchBoundsRef = useRef(null);
   const previousSelectionRef = useRef(null);
   const previousSelectionCloseKeyRef = useRef(selectionCloseKey);

   useEffect(() => {
      map.fitBounds(INITIAL_BOUNDS, { padding: INITIAL_CAMERA_PADDING });
      cameraOwnedRef.current = false;
   }, [map, resetViewKey]);

   useEffect(() => {
      const mapChanged = map !== previousMapRef.current;
      const datensatzChanged = datensatzKey !== previousDatensatzKeyRef.current;
      const resetViewChanged = resetViewKey !== previousResetViewKeyRef.current;
      const selectionChanged = selection !== previousSelectionRef.current;
      // Nur explizites Schließen (X-Button, neue Sucheingabe) stellt den Kontext wieder her;
      // blendet ein Filterwechsel die Auswahl aus, bleibt der Kartenausschnitt des Nutzers stehen.
      const selectionCloseRequested = selectionCloseKey !== previousSelectionCloseKeyRef.current;
      const searchCleared = previousSearchActiveRef.current && !searchActive;
      const searchBoundsChanged = searchBounds !== previousSearchBoundsRef.current;

      previousDatensatzKeyRef.current = datensatzKey;
      previousMapRef.current = map;
      previousResetViewKeyRef.current = resetViewKey;
      previousSearchActiveRef.current = searchActive;
      previousSelectionRef.current = selection;
      previousSearchBoundsRef.current = searchBounds;
      previousSelectionCloseKeyRef.current = selectionCloseKey;

      if (resetViewChanged) return;

      // Ein Datensatz-Wechsel tauscht Auswahl-, Such- und Bounds-Props des jeweils anderen Modus
      // ein, ist aber weder ein Suchende noch eine neue Auswahl: Der Kartenausschnitt bleibt stehen.
      // Der stehengebliebene Ausschnitt gilt danach als Nutzerkontext — die Kamera-Ownership des
      // alten Modus verfällt, sonst würde z. B. eine treffermengenbedingt bounds-lose Suche im
      // neuen Modus zur Übersicht zurückspringen.
      if (datensatzChanged) {
         cameraOwnedRef.current = false;
         return;
      }

      // Selection owns contextual camera movement while active; search resumes only after it clears.
      if (selection) {
         if (!selectionChanged && !mapChanged) return;

         const selectionBounds = featureToLatLngs(selection.item);
         if (selectionBounds.length) {
            focusSelectionBounds(map, selectionBounds);
            cameraOwnedRef.current = true;
         }

         return;
      }

      if (!searchBounds.length) {
         if (!cameraOwnedRef.current) return;
         if (searchCleared || selectionCloseRequested || (searchActive && searchBoundsChanged)) {
            map.fitBounds(INITIAL_BOUNDS, { animate: true, padding: INITIAL_CAMERA_PADDING });
            cameraOwnedRef.current = false;
         }
         return;
      }

      if (!searchBoundsChanged && !selectionCloseRequested && !mapChanged) return;
      map.fitBounds(searchBounds, { animate: true, maxZoom: SEARCH_MAX_FIT_ZOOM, padding: SEARCH_CAMERA_PADDING });
      cameraOwnedRef.current = true;
   }, [datensatzKey, map, resetViewKey, searchActive, searchBounds, selection, selectionCloseKey]);

   return null;
}
