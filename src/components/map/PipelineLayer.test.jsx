/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
   OGE_EXECUTING_OPERATOR_HIGHLIGHT_COLOR,
   PIPELINE_CONTEXT_COLORS,
   PIPELINE_PARTICIPATION_COLORS
} from "@/components/theme/pipelineTheme";

import PipelineLayer from "./PipelineLayer";

const leafletMockState = vi.hoisted(() => ({
   layers: new Map()
}));

afterEach(() => {
   leafletMockState.layers.clear();
   cleanup();
});

vi.mock("react-leaflet", () => ({
   GeoJSON: forwardRef(function GeoJSONMock({ data, interactive = true, onEachFeature, style }, ref) {
      const layerEntriesRef = useRef(new Map());
      const layers = data.features.map(feature => {
         const featureId = feature.properties.id;
         let entry = layerEntriesRef.current.get(featureId);

         if (!entry) {
            const handlers = {};
            const element = {
               setAttribute: vi.fn()
            };
            const layer = {
               bindTooltip: vi.fn(),
               closeTooltip: vi.fn(),
               feature,
               getElement: () => element,
               on: callbacks => Object.assign(handlers, callbacks),
               setStyle: vi.fn()
            };

            onEachFeature?.(feature, layer);
            handlers.add?.({ target: layer });
            entry = { feature, handlers, layer };
            layerEntriesRef.current.set(featureId, entry);
            leafletMockState.layers.set(featureId, layer);
         } else {
            entry.feature = feature;
            entry.layer.feature = feature;
         }

         return entry;
      });

      useImperativeHandle(ref, () => ({ eachLayer: callback => layers.forEach(({ layer }) => callback(layer)) }));

      return (
         <div
            data-feature-ids={data.features.map(feature => feature.properties.id).join(",")}
            data-interactive={String(interactive)}
            data-testid="geojson"
         >
            {layers.map(({ feature, handlers, layer }) => (
               <button
                  data-color={style(feature).color}
                  data-weight={style(feature).weight}
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
         ogeBeteiligung,
         ogeIstDurchfuehrenderNetzbetreiber: false
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

   it("applies OGE executing operator highlight styling only when enabled", () => {
      const pipelines = collection([
         {
            ...pipeline("oge-contact", true),
            properties: {
               ...pipeline("oge-contact", true).properties,
               ogeIstDurchfuehrenderNetzbetreiber: false
            }
         },
         {
            ...pipeline("oge-executing", true),
            properties: {
               ...pipeline("oge-executing", true).properties,
               ogeIstDurchfuehrenderNetzbetreiber: true
            }
         }
      ]);
      const { rerender } = render(
         <PipelineLayer onSelectPipeline={vi.fn()} pipelines={pipelines} selectedPipelineId={null} />
      );
      const getOgeButton = name => within(screen.getByTestId("pane-pipelines-oge")).getByRole("button", { name });

      expect(getOgeButton("oge-contact").getAttribute("data-color")).toBe(PIPELINE_PARTICIPATION_COLORS.oge);
      expect(getOgeButton("oge-contact").getAttribute("data-weight")).toBe("3");
      expect(getOgeButton("oge-executing").getAttribute("data-color")).toBe(PIPELINE_PARTICIPATION_COLORS.oge);
      expect(getOgeButton("oge-executing").getAttribute("data-weight")).toBe("3");

      rerender(
         <PipelineLayer
            highlightOgeExecutingOperator
            onSelectPipeline={vi.fn()}
            pipelines={pipelines}
            selectedPipelineId={null}
         />
      );

      expect(getOgeButton("oge-contact").getAttribute("data-color")).toBe(PIPELINE_PARTICIPATION_COLORS.oge);
      expect(getOgeButton("oge-contact").getAttribute("data-weight")).toBe("3");
      expect(getOgeButton("oge-executing").getAttribute("data-color")).toBe(OGE_EXECUTING_OPERATOR_HIGHLIGHT_COLOR);
      expect(getOgeButton("oge-executing").getAttribute("data-weight")).toBe("5.25");
   });

   it("uses the latest OGE executing operator highlight mode in existing Leaflet event handlers", () => {
      const pipelines = collection([
         {
            ...pipeline("oge-executing", true),
            properties: {
               ...pipeline("oge-executing", true).properties,
               ogeIstDurchfuehrenderNetzbetreiber: true
            }
         }
      ]);
      const { rerender } = render(
         <PipelineLayer onSelectPipeline={vi.fn()} pipelines={pipelines} selectedPipelineId={null} />
      );
      const existingLayer = leafletMockState.layers.get("oge-executing");

      rerender(
         <PipelineLayer
            highlightOgeExecutingOperator
            onSelectPipeline={vi.fn()}
            pipelines={pipelines}
            selectedPipelineId={null}
         />
      );
      fireEvent.mouseOver(screen.getByRole("button", { name: "oge-executing" }));

      expect(existingLayer.setStyle).toHaveBeenLastCalledWith(
         expect.objectContaining({
            color: OGE_EXECUTING_OPERATOR_HIGHLIGHT_COLOR,
            weight: 5.75
         })
      );
   });

   it("renders context pipelines as non-interactive background lines", () => {
      render(<PipelineLayer pipelines={collection()} presentation="context" selectedPipelineId="other" />);

      expect(screen.queryByTestId("pane-pipeline-active-overlay")).toBeNull();
      expect(screen.queryByTestId("pane-pipeline-selection-halo")).toBeNull();
      expect(within(screen.getByTestId("pane-pipelines")).getByTestId("geojson").getAttribute("data-interactive")).toBe(
         "false"
      );
      expect(
         within(screen.getByTestId("pane-pipelines-oge")).getByTestId("geojson").getAttribute("data-interactive")
      ).toBe("false");
      expect(
         within(screen.getByTestId("pane-pipelines")).getByRole("button", { name: "other" }).getAttribute("data-color")
      ).toBe(PIPELINE_CONTEXT_COLORS.noOge);
      expect(leafletMockState.layers.get("other").bindTooltip).not.toHaveBeenCalled();
      expect(leafletMockState.layers.get("other").getElement().setAttribute).toHaveBeenCalledWith("tabindex", "-1");
      expect(leafletMockState.layers.get("other").getElement().setAttribute).toHaveBeenCalledWith("focusable", "false");
   });
});
