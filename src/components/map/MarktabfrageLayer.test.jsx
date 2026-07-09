/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MarktabfrageLayer from "./MarktabfrageLayer";
import { createClusterIcon } from "./marktabfrageCluster";
import { createProjektIcon, getProjektCenter } from "./marktabfrageMarkers";

vi.mock("react-leaflet", () => ({
   CircleMarker({ center, children, className, eventHandlers, interactive, pathOptions, radius }) {
      return (
         <div
            data-center={center.join(",")}
            data-class={className}
            data-fill={pathOptions.fillColor}
            data-interactive={String(interactive)}
            data-radius={radius}
            data-testid="circle-marker"
            onClick={eventHandlers?.click}
         >
            {children}
         </div>
      );
   },
   Marker({ children, eventHandlers, icon, keyboard, position }) {
      return (
         <div
            data-akzent={icon.options.projektAkzentColor}
            data-icon-html={icon.options.html}
            data-icon-size={icon.options.iconSize.x}
            data-keyboard={String(keyboard)}
            data-position={position.join(",")}
            data-testid="projekt-marker"
            onClick={eventHandlers?.click}
         >
            {children}
         </div>
      );
   },
   Pane({ children, name }) {
      return <section data-testid={`pane-${name}`}>{children}</section>;
   },
   Tooltip({ children }) {
      return <div data-testid="projekt-tooltip">{children}</div>;
   }
}));

vi.mock("react-leaflet-cluster", () => ({
   default({ children, chunkedLoading, clusterPane, iconCreateFunction, maxClusterRadius, showCoverageOnHover }) {
      return (
         <div
            data-chunked={String(Boolean(chunkedLoading))}
            data-cluster-pane={clusterPane}
            data-coverage={String(showCoverageOnHover)}
            data-has-icon-fn={String(typeof iconCreateFunction === "function")}
            data-max-radius={maxClusterRadius}
            data-testid="cluster-group"
         >
            {children}
         </div>
      );
   }
}));

function makeProjekt({ id, name = id, kategorie = "Einspeisung", type = "Point" } = {}) {
   return {
      type: "Feature",
      geometry: type === "Point" ? { type: "Point", coordinates: [7, 51] } : null,
      properties: {
         id,
         name,
         kategorie,
         featureTyp: "marktabfrage_projekt",
         projektTyp: "wasserstoff_projekt",
         haertegradStufe: 1,
         inbetriebnahmeJahr: 2035
      }
   };
}

function collectionOf(features) {
   return { type: "FeatureCollection", features };
}

afterEach(() => {
   cleanup();
});

describe("MarktabfrageLayer", () => {
   it("renders an interactive marker with tooltip per point feature", () => {
      const projekte = collectionOf([
         makeProjekt({ id: "H2-1" }),
         makeProjekt({ id: "H2-2" }),
         makeProjekt({ id: "H2-3", type: "None" })
      ]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} />);

      expect(screen.getAllByTestId("projekt-marker")).toHaveLength(2);
      expect(screen.getAllByTestId("projekt-tooltip")).toHaveLength(2);
      // Wie im Orte-Layer: Marker erzeugen keine namenlosen Tab-Stopps, die Tastaturauswahl
      // läuft über die Suchergebnis-Buttons.
      expect(screen.getAllByTestId("projekt-marker").every(m => m.getAttribute("data-keyboard") === "false")).toBe(
         true
      );
   });

   it("calls onSelectProjekt with the feature on click", () => {
      const onSelectProjekt = vi.fn();
      const feature = makeProjekt({ id: "H2-1" });

      render(<MarktabfrageLayer onSelectProjekt={onSelectProjekt} projekte={collectionOf([feature])} />);
      fireEvent.click(screen.getByTestId("projekt-marker"));

      expect(onSelectProjekt).toHaveBeenCalledWith(feature);
   });

   it("encodes the category as shape: circle, triangle, square", () => {
      const projekte = collectionOf([
         makeProjekt({ id: "AUS", kategorie: "Ausspeisung" }),
         makeProjekt({ id: "EIN", kategorie: "Einspeisung" }),
         makeProjekt({ id: "SPE", kategorie: "Speicher" })
      ]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} />);

      const iconHtmlById = Object.fromEntries(
         screen.getAllByTestId("projekt-marker").map(marker => [
            // Die Marker enthalten den Tooltip mit dem Projektnamen (= id im Fixture).
            marker.textContent.includes("AUS") ? "AUS" : marker.textContent.includes("EIN") ? "EIN" : "SPE",
            marker.getAttribute("data-icon-html")
         ])
      );

      expect(iconHtmlById.AUS).toContain("<circle");
      expect(iconHtmlById.EIN).toContain("<path");
      expect(iconHtmlById.SPE).toContain("<rect");
   });

   it("carries the accent color for cluster tinting in the marker icon options", () => {
      const projekte = collectionOf([
         makeProjekt({ id: "AUS", kategorie: "Ausspeisung" }),
         makeProjekt({ id: "SPE", kategorie: "Speicher" })
      ]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} />);

      const akzente = screen.getAllByTestId("projekt-marker").map(marker => marker.getAttribute("data-akzent"));
      expect(akzente).toContain("var(--map-projekt-ausspeisung, #0397ab)");
      expect(akzente).toContain("var(--map-projekt-speicher-akzent, #20201d)");
   });

   it("draws a halo for the selection", () => {
      const projekte = collectionOf([makeProjekt({ id: "H2-1" }), makeProjekt({ id: "H2-2" })]);

      const { rerender } = render(
         <MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} selectedProjektId={null} />
      );
      expect(screen.queryByTestId("pane-marktabfrage-projekt-halo")).toBeNull();

      rerender(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} selectedProjektId="H2-2" />);
      const halo = screen.getByTestId("pane-marktabfrage-projekt-halo").querySelector('[data-testid="circle-marker"]');
      expect(halo.getAttribute("data-class")).toBe("point-selection-halo");
   });

   it("renders the context presentation non-interactive and without tooltip", () => {
      const onSelectProjekt = vi.fn();
      const projekte = collectionOf([makeProjekt({ id: "H2-1" })]);

      render(<MarktabfrageLayer onSelectProjekt={onSelectProjekt} presentation="context" projekte={projekte} />);

      expect(screen.getByTestId("pane-marktabfrage-projekte-context")).toBeTruthy();
      expect(screen.getByTestId("circle-marker").getAttribute("data-interactive")).toBe("false");
      expect(screen.queryByTestId("projekt-tooltip")).toBeNull();

      fireEvent.click(screen.getByTestId("circle-marker"));
      expect(onSelectProjekt).not.toHaveBeenCalled();
   });

   it("configures the cluster group and clusters all non-selected markers", () => {
      const projekte = collectionOf([makeProjekt({ id: "H2-1" }), makeProjekt({ id: "H2-2" })]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} />);

      const clusterGroup = screen.getByTestId("cluster-group");
      // Keine Assertions auf Tuning-Werte (maxClusterRadius, chunkedLoading) — geprüft werden
      // nur die Entscheidungen: eigenes Pane (Z-Ordnung), kein Coverage-Polygon, Custom-Icons.
      expect(clusterGroup.getAttribute("data-cluster-pane")).toBe("marktabfrage-projekte");
      expect(clusterGroup.getAttribute("data-coverage")).toBe("false");
      expect(clusterGroup.getAttribute("data-has-icon-fn")).toBe("true");
      expect(clusterGroup.querySelectorAll('[data-testid="projekt-marker"]')).toHaveLength(2);
   });

   it("excludes the selected project from clustering and enlarges its marker", () => {
      const projekte = collectionOf([makeProjekt({ id: "H2-1" }), makeProjekt({ id: "H2-2" })]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} projekte={projekte} selectedProjektId="H2-2" />);

      const clusterGroup = screen.getByTestId("cluster-group");
      expect(clusterGroup.querySelectorAll('[data-testid="projekt-marker"]')).toHaveLength(1);

      const pane = screen.getByTestId("pane-marktabfrage-projekte");
      const standalone = [...pane.querySelectorAll('[data-testid="projekt-marker"]')].filter(
         marker => !clusterGroup.contains(marker)
      );
      expect(standalone).toHaveLength(1);
      // Einspeisung = Dreieck: Basisgröße 14 px, selektiert 19 px.
      expect(standalone[0].getAttribute("data-icon-size")).toBe("19");
      expect(clusterGroup.querySelector('[data-testid="projekt-marker"]').getAttribute("data-icon-size")).toBe("14");
   });

   it("draws context points neutrally instead of in category colors", () => {
      const projekte = collectionOf([makeProjekt({ id: "H2-1" })]);

      render(<MarktabfrageLayer onSelectProjekt={vi.fn()} presentation="context" projekte={projekte} />);

      const marker = screen.getByTestId("circle-marker");
      expect(marker.getAttribute("data-fill")).toBe("var(--map-place-leader, #3f5f72)");
      expect(marker.getAttribute("data-radius")).toBe("2");
   });

   it("renders nothing when no point features are present", () => {
      const { container } = render(
         <MarktabfrageLayer
            onSelectProjekt={vi.fn()}
            projekte={collectionOf([makeProjekt({ id: "H2-1", type: "None" })])}
         />
      );

      expect(container.firstChild).toBeNull();
   });
});

// Referenzstabilität ist funktional: react-leaflet v5 vergleicht icon und position per
// Referenz; nur stabile Referenzen verhindern setIcon/setLatLng-Kaskaden samt Recluster.
describe("marker reference stability", () => {
   it("returns the same icon reference for the same kategorie and selection state", () => {
      const first = makeProjekt({ id: "H2-1", kategorie: "Speicher" });
      const second = makeProjekt({ id: "H2-2", kategorie: "Speicher" });

      expect(createProjektIcon(first, { selected: false })).toBe(createProjektIcon(second, { selected: false }));
      expect(createProjektIcon(first, { selected: true })).toBe(createProjektIcon(first, { selected: true }));
   });

   it("returns a different icon for the selected variant of the same kategorie", () => {
      const feature = makeProjekt({ id: "H2-1", kategorie: "Einspeisung" });

      expect(createProjektIcon(feature, { selected: false })).not.toBe(createProjektIcon(feature, { selected: true }));
   });

   it("returns the same position reference for repeated calls with the same feature", () => {
      const feature = makeProjekt({ id: "H2-1" });
      const center = getProjektCenter(feature);

      expect(center).toEqual([51, 7]);
      expect(getProjektCenter(feature)).toBe(center);
   });
});

describe("createClusterIcon", () => {
   // Echte Icons aus createProjektIcon statt fabrizierter Optionen: So ist der Durchstich
   // "Marker-Icon trägt die Akzentfarbe → Cluster liest sie" ohne Mock der Gegenseite getestet.
   const fakeCluster = (kategorien, count = kategorien.length) => ({
      options: {},
      getAllChildMarkers: () =>
         kategorien.map(kategorie => ({
            options: { icon: createProjektIcon(makeProjekt({ id: kategorie, kategorie }), { selected: false }) }
         })),
      getChildCount: () => count
   });

   it("colors uniform clusters in the category accent color from the marker icons", () => {
      const icon = createClusterIcon(fakeCluster(["Ausspeisung", "Ausspeisung"], 5));

      expect(icon.options.html).toContain('style="--projekt-cluster-color:var(--map-projekt-ausspeisung, #0397ab)"');
      expect(icon.options.html).toContain(">5<");
   });

   it("keeps mixed clusters neutral", () => {
      const icon = createClusterIcon(fakeCluster(["Ausspeisung", "Speicher"], 2));

      expect(icon.options.html).not.toContain("--projekt-cluster-color");
   });

   it("disables keyboard focus on the cluster marker", () => {
      const cluster = fakeCluster(["Ausspeisung"], 2);

      createClusterIcon(cluster);

      expect(cluster.options.keyboard).toBe(false);
   });

   it("scales the icon size by count", () => {
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 2)).options.iconSize.x).toBe(22);
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 5)).options.iconSize.x).toBe(27);
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 10)).options.iconSize.x).toBe(33);
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 25)).options.iconSize.x).toBe(40);
   });

   it("sets the size tier as a modifier class for tint, halo, and font", () => {
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 2)).options.html).toContain("projekt-cluster--sm");
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 17)).options.html).toContain("projekt-cluster--lg");
      expect(createClusterIcon(fakeCluster(["Einspeisung"], 60)).options.html).toContain("projekt-cluster--xl");
   });
});
