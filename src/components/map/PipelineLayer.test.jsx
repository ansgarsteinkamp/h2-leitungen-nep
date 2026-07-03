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
   layers: new Map(),
   map: {
      container: {
         addEventListener: vi.fn(),
         removeEventListener: vi.fn()
      },
      off: vi.fn(),
      on: vi.fn()
   }
}));

afterEach(() => {
   leafletMockState.layers.clear();
   leafletMockState.map.container.addEventListener.mockClear();
   leafletMockState.map.container.removeEventListener.mockClear();
   leafletMockState.map.off.mockClear();
   leafletMockState.map.on.mockClear();
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
               bringToFront: vi.fn(),
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
         } else {
            entry.feature = feature;
            entry.layer.feature = feature;
         }

         const styleValue = typeof style === "function" ? style(feature) : style;
         const className = styleValue?.className ?? "default";
         leafletMockState.layers.set(`${className}:${featureId}`, entry);

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
                  data-class-name={(typeof style === "function" ? style(feature) : style).className}
                  data-color={(typeof style === "function" ? style(feature) : style).color}
                  data-opacity={(typeof style === "function" ? style(feature) : style).opacity}
                  data-weight={(typeof style === "function" ? style(feature) : style).weight}
                  key={feature.properties.id}
                  onClick={() => interactive && handlers.click?.({ target: layer })}
                  onMouseOut={() => interactive && handlers.mouseout?.({ target: layer })}
                  onMouseOver={() => interactive && handlers.mouseover?.({ target: layer })}
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
      getContainer: () => leafletMockState.map.container,
      off: leafletMockState.map.off,
      on: leafletMockState.map.on
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
      const hitboxPane = screen.getByTestId("pane-pipeline-hitbox");

      expect(otherPane.style.zIndex).toBe("420");
      expect(ogePane.style.zIndex).toBe("430");
      expect(activePane.style.zIndex).toBe("440");
      expect(hitboxPane.style.zIndex).toBe("450");
      expect(within(otherPane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("other");
      expect(within(ogePane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("oge");
      expect(within(activePane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("other");
      expect(within(hitboxPane).getByTestId("geojson").getAttribute("data-feature-ids")).toBe("other,oge");
   });

   it("keeps OGE pipelines above other pipelines inside the active overlay", () => {
      const pipelines = collection([pipeline("oge", true), pipeline("other", false)]);

      render(<PipelineLayer onSelectPipeline={vi.fn()} pipelines={pipelines} selectedPipelineId="oge" />);
      fireEvent.mouseOver(within(screen.getByTestId("pane-pipeline-hitbox")).getByRole("button", { name: "other" }));

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
      const existingLayer = leafletMockState.layers.get("default:oge-executing").layer;

      rerender(
         <PipelineLayer
            highlightOgeExecutingOperator
            onSelectPipeline={vi.fn()}
            pipelines={pipelines}
            selectedPipelineId={null}
         />
      );
      fireEvent.mouseOver(
         within(screen.getByTestId("pane-pipeline-hitbox")).getByRole("button", { name: "oge-executing" })
      );

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
      expect(screen.queryByTestId("pane-pipeline-hitbox")).toBeNull();
      expect(within(screen.getByTestId("pane-pipelines")).getByTestId("geojson").getAttribute("data-interactive")).toBe(
         "false"
      );
      expect(
         within(screen.getByTestId("pane-pipelines-oge")).getByTestId("geojson").getAttribute("data-interactive")
      ).toBe("false");
      expect(
         within(screen.getByTestId("pane-pipelines")).getByRole("button", { name: "other" }).getAttribute("data-color")
      ).toBe(PIPELINE_CONTEXT_COLORS.noOge);
      expect(leafletMockState.layers.get("pipeline-context-line:other").layer.bindTooltip).not.toHaveBeenCalled();
      expect(
         leafletMockState.layers.get("pipeline-context-line:other").layer.getElement().setAttribute
      ).toHaveBeenCalledWith("tabindex", "-1");
      expect(
         leafletMockState.layers.get("pipeline-context-line:other").layer.getElement().setAttribute
      ).toHaveBeenCalledWith("focusable", "false");
   });

   it("uses hitbox layers for pointer interaction while keeping visible lines inert", () => {
      const onSelectPipeline = vi.fn();
      render(<PipelineLayer onSelectPipeline={onSelectPipeline} pipelines={collection()} selectedPipelineId={null} />);

      const visibleOther = leafletMockState.layers.get("default:other").layer;
      const hitboxOther = leafletMockState.layers.get("pipeline-hitbox:other").layer;
      const hitboxGeoJson = within(screen.getByTestId("pane-pipeline-hitbox")).getByTestId("geojson");
      const hitboxButton = within(screen.getByTestId("pane-pipeline-hitbox")).getByRole("button", { name: "other" });

      expect(visibleOther.bindTooltip).not.toHaveBeenCalled();
      expect(hitboxOther.bindTooltip).toHaveBeenCalledTimes(1);
      expect(within(screen.getByTestId("pane-pipelines")).getByTestId("geojson").getAttribute("data-interactive")).toBe(
         "false"
      );
      expect(hitboxGeoJson.getAttribute("data-interactive")).toBe("true");
      expect(hitboxButton.getAttribute("data-class-name")).toBe("pipeline-hitbox");
      expect(hitboxButton.getAttribute("data-opacity")).toBe("0.001");
      expect(hitboxButton.getAttribute("data-weight")).toBe("16");

      fireEvent.mouseOver(hitboxButton);

      expect(visibleOther.setStyle).toHaveBeenLastCalledWith(expect.objectContaining({ weight: 5.75 }));
      expect(hitboxOther.bringToFront).toHaveBeenCalled();

      fireEvent.click(hitboxButton);

      expect(onSelectPipeline).toHaveBeenCalledWith(
         expect.objectContaining({ properties: expect.objectContaining({ id: "other" }) })
      );
   });

   it("does not promote selected hitboxes above other clickable pipelines", () => {
      render(<PipelineLayer onSelectPipeline={vi.fn()} pipelines={collection()} selectedPipelineId="other" />);

      expect(leafletMockState.layers.get("pipeline-hitbox:other").layer.bringToFront).not.toHaveBeenCalled();
   });

   it("cleans up open tooltips when the map or browser context changes", () => {
      render(<PipelineLayer onSelectPipeline={vi.fn()} pipelines={collection()} selectedPipelineId={null} />);

      expect(leafletMockState.map.on).toHaveBeenCalledWith("click movestart zoomstart dragstart", expect.any(Function));
      expect(leafletMockState.map.container.addEventListener).toHaveBeenCalledWith("mouseleave", expect.any(Function));

      const closeHandler = leafletMockState.map.on.mock.calls.find(([events]) => events.includes("movestart"))[1];
      fireEvent.mouseOver(within(screen.getByTestId("pane-pipeline-hitbox")).getByRole("button", { name: "other" }));
      closeHandler();

      expect(leafletMockState.layers.get("pipeline-hitbox:other").layer.closeTooltip).toHaveBeenCalled();
   });
});
