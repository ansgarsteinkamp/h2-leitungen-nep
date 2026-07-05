import { divIcon } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, Marker, Pane, Tooltip, useMap } from "react-leaflet";

import { layoutPlaceLabels } from "@/components/map/placeLabelLayout";

const PLACE_MARKER_STYLES = {
   Ort: {
      color: "var(--map-place-marker-stroke, #ffffff)",
      fillColor: "var(--map-place-marker, #045f69)",
      fillOpacity: 0.96,
      opacity: 1,
      weight: 1.25
   },
   Speicher: {
      color: "var(--map-place-storage-stroke, #ffffff)",
      fillColor: "var(--map-place-storage, #d01d74)",
      fillOpacity: 0.95,
      opacity: 1,
      weight: 1.75
   }
};

const DEFAULT_PLACE_MARKER_STYLE = PLACE_MARKER_STYLES.Ort;
const STORAGE_PLACE_TYPE = "Speicher";
const preferredPlaceLabelPlacementsByMap = new WeakMap();
const STORAGE_MARKER_ICON = divIcon({
   className: "place-storage-marker-icon",
   html: '<span class="place-storage-marker" aria-hidden="true"></span>',
   iconAnchor: [5, 5],
   iconSize: [10, 10]
});

const escapeHtml = value =>
   String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const getPreferredPlaceLabelPlacements = map => {
   let preferredPlacements = preferredPlaceLabelPlacementsByMap.get(map);
   if (!preferredPlacements) {
      preferredPlacements = new Map();
      preferredPlaceLabelPlacementsByMap.set(map, preferredPlacements);
   }

   return preferredPlacements;
};

const getPlaceMarkerStyle = place => PLACE_MARKER_STYLES[place.type] ?? DEFAULT_PLACE_MARKER_STYLE;

const isStoragePlace = place => place.type === STORAGE_PLACE_TYPE;

const getPlaceMarkerRadius = (place, labeled) => {
   if (isStoragePlace(place)) return 4.4;

   return labeled ? 3.7 : 3.15;
};

const insetRect = ({ bottom, left, right, top }, mapSize) => ({
   bottom: Math.min(mapSize.height - 8, bottom),
   left: Math.max(8, left),
   right: Math.min(mapSize.width - 8, right),
   top: Math.max(8, top)
});

const createReservedRects = mapSize => [
   insetRect({ bottom: 94, left: 8, right: 62, top: 8 }, mapSize),
   insetRect({ bottom: 62, left: mapSize.width - 62, right: mapSize.width - 8, top: 8 }, mapSize),
   insetRect({ bottom: mapSize.height - 8, left: 8, right: 140, top: mapSize.height - 86 }, mapSize)
];

function useMapViewSnapshot(map) {
   const [snapshot, setSnapshot] = useState(() => ({
      revision: 0,
      size: map.getSize(),
      zoom: map.getZoom()
   }));

   useEffect(() => {
      const syncSnapshot = () => {
         setSnapshot(previous => ({
            revision: previous.revision + 1,
            size: map.getSize(),
            zoom: map.getZoom()
         }));
      };

      syncSnapshot();
      map.on("moveend resize viewreset zoomend", syncSnapshot);

      return () => {
         map.off("moveend resize viewreset zoomend", syncSnapshot);
      };
   }, [map]);

   return snapshot;
}

function createLabelIcon(label) {
   const typeClass = isStoragePlace(label.place) ? "place-label--storage" : "place-label--place";
   const leaderClass = label.leader === "far" ? "place-label--far" : "place-label--near";
   const html = `<span class="place-label place-label--${label.placement} ${leaderClass} ${typeClass}" style="font-size:${label.size.fontSize}px">${escapeHtml(label.place.name)}</span>`;

   return divIcon({
      className: "place-label-icon",
      html,
      iconAnchor: label.anchor,
      iconSize: [label.size.width, label.size.height]
   });
}

function PlaceTooltip({ place }) {
   return (
      <Tooltip className="place-tooltip" direction="top" offset={[0, -6]} opacity={1} pane="tooltipPane" sticky>
         <span>{place.name}</span>
         {isStoragePlace(place) ? <strong>Speicher</strong> : null}
      </Tooltip>
   );
}

function ScreenReaderPlaceList({ places }) {
   return (
      <section aria-label="Orte in der Karte" className="sr-only">
         <ul>
            {places.map(place => (
               <li key={`sr:${place.id}`}>
                  {place.name}
                  {isStoragePlace(place) ? ", Speicher" : ""}
               </li>
            ))}
         </ul>
      </section>
   );
}

export default function PlaceLayer({ places }) {
   const map = useMap();
   const preferredPlaceLabelPlacements = getPreferredPlaceLabelPlacements(map);
   const snapshot = useMapViewSnapshot(map);
   const labels = useMemo(() => {
      return layoutPlaceLabels(places, {
         mapSize: { height: snapshot.size.y, width: snapshot.size.x },
         preferredPlacements: preferredPlaceLabelPlacements,
         project: place => map.latLngToContainerPoint([place.latitude, place.longitude]),
         reservedRects: createReservedRects({ height: snapshot.size.y, width: snapshot.size.x }),
         zoom: snapshot.zoom
      });
   }, [map, places, preferredPlaceLabelPlacements, snapshot]);
   const labeledPlaceIds = useMemo(() => new Set(labels.map(label => label.place.id)), [labels]);

   useEffect(() => {
      preferredPlaceLabelPlacements.clear();
      labels.forEach(label => preferredPlaceLabelPlacements.set(label.place.id, label.placement));
   }, [labels, preferredPlaceLabelPlacements]);

   return (
      <>
         <ScreenReaderPlaceList places={places} />
         <Pane name="place-markers" style={{ zIndex: 470 }}>
            {places.map(place => {
               const showTooltip = !labeledPlaceIds.has(place.id);
               // Der Key enthält den Tooltip-Zustand: Wechselt er beim Zoomen, wird der Marker neu
               // aufgebaut. Leaflet entfernt sonst weder die Tooltip-Fokus-Listener noch passt
               // react-leaflet `interactive` an bestehenden Layern an (TypeError bei Klick).
               const markerKey = `${place.id}:${showTooltip ? "tooltip" : "label"}`;

               if (isStoragePlace(place)) {
                  return (
                     <Marker
                        icon={STORAGE_MARKER_ICON}
                        interactive={showTooltip}
                        keyboard={false}
                        key={markerKey}
                        position={[place.latitude, place.longitude]}
                     >
                        {showTooltip ? <PlaceTooltip place={place} /> : null}
                     </Marker>
                  );
               }

               return (
                  <CircleMarker
                     center={[place.latitude, place.longitude]}
                     interactive={showTooltip}
                     key={markerKey}
                     pathOptions={getPlaceMarkerStyle(place)}
                     radius={getPlaceMarkerRadius(place, !showTooltip)}
                  >
                     {showTooltip ? <PlaceTooltip place={place} /> : null}
                  </CircleMarker>
               );
            })}
         </Pane>
         <Pane name="place-labels" style={{ zIndex: 460 }}>
            {labels.map(label => (
               <Marker
                  icon={createLabelIcon(label)}
                  interactive={false}
                  keyboard={false}
                  key={`label:${label.place.id}:${label.placement}:${label.index}`}
                  position={[label.place.latitude, label.place.longitude]}
                  zIndexOffset={isStoragePlace(label.place) ? 20 : 0}
               />
            ))}
         </Pane>
      </>
   );
}
