import { CircleMarker, Pane, Tooltip } from "react-leaflet";

import { pipelineMeta, pipelineTitle } from "@/lib/domain/formatters";
import {
   getOgeExecutingOperatorHighlightColor,
   getPipelineColor,
   getPipelineContextColor,
   getSelectionHaloColor
} from "@/components/theme/pipelineTheme";

const MAP_TOOLTIP_OPTIONS = {
   className: "map-tooltip",
   direction: "top",
   interactive: false,
   offset: [0, -8],
   pane: "tooltipPane"
};

const BASE_RADIUS = 7.5;
const SELECTED_RADIUS = 9;
const HOVER_RADIUS_BONUS = 2;
const HALO_RADIUS = 16;
const CONTEXT_RADIUS = 3.5;

const getSiteCenter = feature => {
   const [lon, lat] = feature.geometry.coordinates;
   return [lat, lon];
};

const getSiteStyle = (feature, { highlighted, selected }) => ({
   color: "var(--map-place-marker-stroke, #ffffff)",
   fillColor: highlighted ? getOgeExecutingOperatorHighlightColor() : getPipelineColor(feature),
   fillOpacity: selected ? 1 : 0.95,
   opacity: 0.9,
   weight: 1.5
});

const getSiteHaloStyle = feature => ({
   color: getSelectionHaloColor(feature),
   fillColor: getSelectionHaloColor(feature),
   fillOpacity: 0.28,
   opacity: 0.58,
   stroke: true,
   weight: 2
});

const getSiteContextStyle = feature => ({
   color: getPipelineContextColor(feature),
   fillColor: getPipelineContextColor(feature),
   fillOpacity: 0.42,
   opacity: 0.42,
   weight: 1
});

function SiteTooltip({ feature }) {
   return (
      <Tooltip {...MAP_TOOLTIP_OPTIONS}>
         <strong>{pipelineTitle(feature)}</strong>
         <span>{pipelineMeta(feature)}</span>
      </Tooltip>
   );
}

export default function CompressorSiteLayer({
   highlightOgeExecutingOperator = false,
   onSelectSite,
   presentation = "interactive",
   selectedSiteId,
   sites
}) {
   const isContextPresentation = presentation === "context";
   const features = sites.features.filter(feature => feature.geometry?.type === "Point");
   if (features.length === 0) return null;

   if (isContextPresentation) {
      return (
         <Pane name="compressor-sites-context" style={{ zIndex: 425 }}>
            {features.map(feature => (
               <CircleMarker
                  center={getSiteCenter(feature)}
                  interactive={false}
                  key={feature.properties.id}
                  pathOptions={getSiteContextStyle(feature)}
                  radius={CONTEXT_RADIUS}
               />
            ))}
         </Pane>
      );
   }

   const selectedFeature = features.find(feature => feature.properties.id === selectedSiteId) ?? null;

   return (
      <>
         {selectedFeature ? (
            <Pane name="compressor-site-halo" style={{ zIndex: 412 }}>
               <CircleMarker
                  center={getSiteCenter(selectedFeature)}
                  // className muss als direkte Prop in den Leaflet-Konstruktor: über pathOptions
                  // liefe sie durch setStyle, das Klassen nie ans SVG-Element schreibt.
                  className="point-selection-halo"
                  interactive={false}
                  pathOptions={getSiteHaloStyle(selectedFeature)}
                  radius={HALO_RADIUS}
               />
            </Pane>
         ) : null}
         <Pane name="compressor-sites" style={{ zIndex: 455 }}>
            {features.map(feature => {
               const selected = feature.properties.id === selectedSiteId;
               const highlighted =
                  highlightOgeExecutingOperator && feature.properties.ogeIstDurchfuehrenderNetzbetreiber === true;

               const restingRadius = selected ? SELECTED_RADIUS : BASE_RADIUS;

               return (
                  <CircleMarker
                     center={getSiteCenter(feature)}
                     eventHandlers={{
                        click: () => onSelectSite(feature),
                        mouseover: event => event.target.setRadius(restingRadius + HOVER_RADIUS_BONUS),
                        mouseout: event => event.target.setRadius(restingRadius)
                     }}
                     key={feature.properties.id}
                     pathOptions={getSiteStyle(feature, { highlighted, selected })}
                     radius={restingRadius}
                  >
                     <SiteTooltip feature={feature} />
                  </CircleMarker>
               );
            })}
         </Pane>
      </>
   );
}
