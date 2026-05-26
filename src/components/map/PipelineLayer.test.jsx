/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PipelineLayer from "./PipelineLayer";

afterEach(() => {
   cleanup();
});

vi.mock("react-leaflet", () => ({
   GeoJSON: forwardRef(function GeoJSONMock({ data, onEachFeature, style }, ref) {
      const layers = data.features.map(feature => {
         const handlers = {};
         const layer = {
            bindTooltip: vi.fn(),
            closeTooltip: vi.fn(),
            feature,
            getElement: () => null,
            on: callbacks => Object.assign(handlers, callbacks),
            setStyle: vi.fn()
         };

         onEachFeature?.(feature, layer);

         return { feature, handlers, layer };
      });

      useImperativeHandle(ref, () => ({ eachLayer: callback => layers.forEach(({ layer }) => callback(layer)) }));

      return (
         <div data-feature-ids={data.features.map(feature => feature.properties.id).join(",")} data-testid="geojson">
            {layers.map(({ feature, handlers, layer }) => (
               <button
                  data-color={style(feature).color}
                  key={feature.properties.id}
                  onMouseOut={() => handlers.mouseout?.({ target: layer })}
                  onMouseOver={() => handlers.mouseover?.({ target: layer })}
                  type="button"
               >
                  {feature.properties.id}
               </button>
            ))}
         </div>
      );
   }),
   Pane({ children, name, style }) {
      return (
         <section data-testid={`pane-${name}`} style={style}>
            {children}
         </section>
      );
   },
   useMap: () => ({
      off: vi.fn(),
      on: vi.fn()
   })
}));

function pipeline(id, ogeBeteiligung) {
   return {
      type: "Feature",
      properties: {
         id,
         leitungstyp: "Umstellung",
         ogeBeteiligung
      },
      geometry: {
         type: "LineString",
         coordinates: [
            [7, 51],
            [8, 52]
         ]
      }
   };
}

function collection(features = [pipeline("other", false), pipeline("oge", true)]) {
   return {
      type: "FeatureCollection",
      features
   };
}

describe("PipelineLayer", () => {
   it("renders OGE pipelines above other pipelines and active pipelines above both", () => {
      render(<PipelineLayer onSelectPipeline={vi.fn()} pipelines={collection()} selectedPipelineId="other" />);

      const otherPane = screen.getByTestId("pane-pipelines");
      const ogePane = screen.getByTestId("pane-pipelines-oge");
      const activePane = screen.getByTestId("pane-pipeline-active-overlay");

      expect(otherPane.style.zIndex).toBe("420");
      expect(ogePane.style.zIndex).toBe("430");
      expect(activePane.style.zIndex).toBe("440");
      expect(within(otherPane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("other");
      expect(within(ogePane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("oge");
      expect(within(activePane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("other");
   });

   it("keeps OGE pipelines above other pipelines inside the active overlay", () => {
      const pipelines = collection([pipeline("oge", true), pipeline("other", false)]);

      render(<PipelineLayer onSelectPipeline={vi.fn()} pipelines={pipelines} selectedPipelineId="oge" />);
      fireEvent.mouseOver(within(screen.getByTestId("pane-pipelines")).getByRole("button", { name: "other" }));

      expect(
         within(screen.getByTestId("pane-pipeline-active-overlay"))
            .getByTestId("geojson")
            .getAttribute("data-feature-ids")
      ).toBe("other,oge");
   });
});
