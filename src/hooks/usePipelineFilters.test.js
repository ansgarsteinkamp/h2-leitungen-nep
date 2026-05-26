/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ALL_VALUE } from "@/lib/domain/constants";
import {
   filterPipelineCollection,
   filterPipelines,
   initialPipelineFilters,
   usePipelineFilters
} from "./usePipelineFilters";

afterEach(() => {
   cleanup();
});

const filters = { ...initialPipelineFilters };

function pipeline(id, properties = {}) {
   return {
      type: "Feature",
      geometry: {
         type: "LineString",
         coordinates: [
            [7, 51],
            [8, 52]
         ]
      },
      properties: {
         id,
         name: `Leitung ${id}`,
         leitungstyp: "Neubau",
         startnetz: false,
         netzausbauvorschlag: false,
         standardAnzeige: false,
         ibnJahr: 2032,
         bundeslaender: ["Nordrhein-Westfalen"],
         durchfuehrendeNetzbetreiber: [],
         ansprechpartner: [],
         szenario1: false,
         szenario2: false,
         szenario3: false,
         ...properties
      }
   };
}

function collection(features) {
   return { type: "FeatureCollection", features };
}

function idsOf(features) {
   return features.map(feature => feature.properties.id);
}

function filterIds(features, overrides = {}) {
   return idsOf(filterPipelines(features, { ...filters, ...overrides }));
}

function filterCollectionIds(featureCollection, overrides = {}) {
   return idsOf(filterPipelineCollection(featureCollection, { ...filters, ...overrides }).features);
}

function optionValues(result) {
   return result.current.measureTypeOptions.map(option => option.value);
}

function setFilter(result, key, value) {
   act(() => result.current.setFilter(key, value));
}

function resetFilters(result) {
   act(() => result.current.resetFilters());
}

const networkViewFeatures = [
   pipeline("startnetz", { startnetz: true }),
   pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
   pipeline("scenario-nonstandard", { szenario1: true }),
   pipeline("scenario-2", { szenario2: true }),
   pipeline("scenario-3", { szenario3: true }),
   pipeline("other-standard", { netzausbauvorschlag: true }),
   pipeline("other-nonstandard")
];

const measureTypeFeatures = [
   pipeline("startnetz", { startnetz: true }),
   pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
   pipeline("scenario-only", { szenario1: true }),
   pipeline("other-standard", { netzausbauvorschlag: true })
];

describe("filterPipelines", () => {
   it("uses the central standard feature rule for the default scope", () => {
      expect(
         filterIds([
            pipeline("A", { standardAnzeige: true }),
            pipeline("B", { startnetz: true }),
            pipeline("C", { netzausbauvorschlag: true })
         ])
      ).toEqual(["B", "C"]);
   });

   it("filters OGE participation through the operator filter", () => {
      expect(
         filterIds(
            [
               pipeline("A", { durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"] }),
               pipeline("B", { ogeBeteiligung: true })
            ],
            {
               networkView: "all",
               operator: "Open Grid Europe GmbH"
            }
         )
      ).toEqual(["A"]);
   });

   it("filters directly by the derived OGE participation flag", () => {
      expect(
         filterIds(
            [
               pipeline("A", { ogeBeteiligung: true }),
               pipeline("B", { durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"], ogeBeteiligung: true }),
               pipeline("C", { ogeBeteiligung: false })
            ],
            {
               networkView: "all",
               ogeParticipationOnly: true
            }
         )
      ).toEqual(["A", "B"]);
   });

   it("searches years, IDs, scenarios, OGE participation and startnetz", () => {
      const pipelines = collection([
         pipeline("H2-001-01", {
            kernnetzAntragsId: "KN-77",
            durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"],
            szenario2: true,
            startnetz: true,
            ibnJahr: 2037
         }),
         pipeline("H2-002-01", { ibnJahr: 2032 })
      ]);

      ["2037", "KN-77", "Szenario 2", "OGE", "Startnetz"].forEach(searchTerm => {
         expect(filterCollectionIds(pipelines, { networkView: "all", searchTerm })).toEqual(["H2-001-01"]);
      });
   });

   it("keeps all filters composable", () => {
      expect(
         filterIds(
            [
               pipeline("A", {
                  leitungstyp: "Neubau",
                  durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"],
                  szenario1: true,
                  ibnJahr: 2035,
                  startnetz: true
               }),
               pipeline("B", {
                  leitungstyp: "Umstellung",
                  durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"],
                  szenario1: true,
                  ibnJahr: 2035,
                  startnetz: true
               }),
               pipeline("C", {
                  leitungstyp: "Neubau",
                  durchfuehrendeNetzbetreiber: ["Nowega GmbH"],
                  szenario1: true,
                  ibnJahr: 2035,
                  startnetz: true
               })
            ],
            {
               lineType: "Neubau",
               measureType: ALL_VALUE,
               operator: "Open Grid Europe GmbH",
               scenario: "szenario1",
               year: "2035"
            }
         )
      ).toEqual(["A"]);
   });

   it.each([
      ["startnetz", ["startnetz"]],
      ["standard", ["startnetz", "scenario-standard", "other-standard"]],
      ["scenario1", ["startnetz", "scenario-standard", "scenario-nonstandard"]],
      ["scenario2", ["startnetz", "scenario-2"]],
      ["scenario3", ["startnetz", "scenario-3"]],
      [
         "all",
         [
            "startnetz",
            "scenario-standard",
            "scenario-nonstandard",
            "scenario-2",
            "scenario-3",
            "other-standard",
            "other-nonstandard"
         ]
      ]
   ])("maps the %s network view to the expected feature set", (networkView, expectedIds) => {
      expect(filterIds(networkViewFeatures, { networkView })).toEqual(expectedIds);
   });

   it("filters scenario network views by measure category as an explicit intersection", () => {
      [
         ["startnetz", ["startnetz"]],
         ["netzausbauvorschlag", ["scenario-standard"]],
         ["scenarioOnly", ["scenario-only"]]
      ].forEach(([measureType, expectedIds]) => {
         expect(filterIds(measureTypeFeatures, { networkView: "scenario1", measureType })).toEqual(expectedIds);
      });
   });

   it("filters all-data and standard views by scenario marker and measure category", () => {
      [
         [
            {
               networkView: "all",
               scenario: "szenario1",
               measureType: "scenarioOnly"
            },
            ["scenario-only"]
         ],
         [
            {
               networkView: "standard",
               scenario: "szenario1",
               measureType: "netzausbauvorschlag"
            },
            ["scenario-standard"]
         ]
      ].forEach(([overrides, expectedIds]) => {
         expect(filterIds(measureTypeFeatures, overrides)).toEqual(expectedIds);
      });
   });

   it("ignores stale scenario marker filters outside all-data and standard views", () => {
      expect(
         filterIds(
            [
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-1", { szenario1: true }),
               pipeline("scenario-2", { szenario2: true })
            ],
            {
               networkView: "scenario1",
               scenario: "szenario2"
            }
         )
      ).toEqual(["startnetz", "scenario-1"]);
   });

   it("keeps the scenario marker available as an explicit filter on the standard view", () => {
      expect(
         filterIds(
            [
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
               pipeline("scenario-nonstandard", { szenario1: true })
            ],
            {
               networkView: "standard",
               scenario: "szenario1"
            }
         )
      ).toEqual(["scenario-standard"]);
   });

   it("keeps all-data scenario marker filtering separate from scenario network views", () => {
      expect(
         filterIds(
            [
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
               pipeline("scenario-nonstandard", { szenario1: true })
            ],
            {
               networkView: "all",
               scenario: "szenario1"
            }
         )
      ).toEqual(["scenario-standard", "scenario-nonstandard"]);
   });

   it("uses network view selections without changing other visible filters implicitly", () => {
      const { result } = renderHook(() => usePipelineFilters(collection(measureTypeFeatures)));

      setFilter(result, "networkView", "scenario1");

      expect(result.current.filters.networkView).toBe("scenario1");
      expect(result.current.filters.scenario).toBe(ALL_VALUE);
      expect(idsOf(result.current.filteredCollection.features)).toEqual([
         "startnetz",
         "scenario-standard",
         "scenario-only"
      ]);

      setFilter(result, "networkView", "standard");

      expect(result.current.filters.networkView).toBe("standard");
      expect(idsOf(result.current.filteredCollection.features)).toEqual([
         "startnetz",
         "scenario-standard",
         "other-standard"
      ]);
   });

   it("offers only measure categories that exist in the selected network view", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(
            collection([
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
               pipeline("scenario-only", { szenario1: true }),
               pipeline("scenario-3-standard", { netzausbauvorschlag: true, szenario3: true })
            ])
         )
      );

      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz", "netzausbauvorschlag"]);

      setFilter(result, "networkView", "scenario1");

      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz", "netzausbauvorschlag", "scenarioOnly"]);

      setFilter(result, "networkView", "scenario3");

      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz", "netzausbauvorschlag"]);

      setFilter(result, "networkView", "startnetz");

      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz"]);
   });

   it("narrows measure categories by the explicit scenario marker filter", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(
            collection([
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-standard", { netzausbauvorschlag: true, szenario1: true }),
               pipeline("scenario-only", { szenario1: true }),
               pipeline("scenario-2-only", { szenario2: true })
            ])
         )
      );

      setFilter(result, "scenario", "szenario1");

      expect(optionValues(result)).toEqual([ALL_VALUE, "netzausbauvorschlag"]);

      setFilter(result, "networkView", "all");

      expect(optionValues(result)).toEqual([ALL_VALUE, "netzausbauvorschlag", "scenarioOnly"]);
   });

   it("resets a no-longer-available measure category when switching network views", () => {
      const { result } = renderHook(() => usePipelineFilters(collection(measureTypeFeatures.slice(0, 3))));

      setFilter(result, "networkView", "scenario1");
      setFilter(result, "measureType", "scenarioOnly");
      setFilter(result, "networkView", "standard");

      expect(result.current.filters.measureType).toBe(ALL_VALUE);
      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz", "netzausbauvorschlag"]);
   });

   it("clears redundant measure category filters inside the startnetz view", () => {
      const { result } = renderHook(() => usePipelineFilters(collection(measureTypeFeatures)));

      setFilter(result, "networkView", "scenario1");
      setFilter(result, "measureType", "startnetz");
      setFilter(result, "networkView", "startnetz");

      expect(result.current.filters.measureType).toBe(ALL_VALUE);
      expect(idsOf(result.current.filteredCollection.features)).toEqual(["startnetz"]);

      setFilter(result, "networkView", "standard");

      expect(result.current.filters.measureType).toBe(ALL_VALUE);
      expect(idsOf(result.current.filteredCollection.features)).toEqual([
         "startnetz",
         "scenario-standard",
         "other-standard"
      ]);
   });

   it("resets a no-longer-available measure category when setting a scenario marker", () => {
      const { result } = renderHook(() => usePipelineFilters(collection(measureTypeFeatures.slice(0, 2))));

      setFilter(result, "measureType", "startnetz");
      setFilter(result, "scenario", "szenario1");

      expect(result.current.filters.measureType).toBe(ALL_VALUE);
      expect(optionValues(result)).toEqual([ALL_VALUE, "netzausbauvorschlag"]);
   });

   it("resets a no-longer-available measure category when the loaded collection changes", async () => {
      const firstCollection = collection(measureTypeFeatures.slice(0, 3));
      const secondCollection = collection(measureTypeFeatures.slice(0, 2));
      const { result, rerender } = renderHook(({ currentCollection }) => usePipelineFilters(currentCollection), {
         initialProps: { currentCollection: firstCollection }
      });

      setFilter(result, "networkView", "scenario1");
      setFilter(result, "measureType", "scenarioOnly");
      rerender({ currentCollection: secondCollection });

      await waitFor(() => expect(result.current.filters.measureType).toBe(ALL_VALUE));
      expect(optionValues(result)).toEqual([ALL_VALUE, "startnetz", "netzausbauvorschlag"]);

      rerender({ currentCollection: firstCollection });

      expect(result.current.filters.measureType).toBe(ALL_VALUE);
   });

   it("clears scenario marker filters when switching into a scenario network view", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(
            collection([
               pipeline("startnetz", { startnetz: true }),
               pipeline("scenario-1", { szenario1: true }),
               pipeline("scenario-2", { szenario2: true })
            ])
         )
      );

      setFilter(result, "networkView", "all");
      setFilter(result, "scenario", "szenario2");
      setFilter(result, "networkView", "scenario1");

      expect(result.current.filters.scenario).toBe(ALL_VALUE);
      expect(idsOf(result.current.filteredCollection.features)).toEqual(["startnetz", "scenario-1"]);
   });

   it("clears scenario marker filters when switching into the startnetz view", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(
            collection([pipeline("startnetz", { startnetz: true }), pipeline("scenario-1", { szenario1: true })])
         )
      );

      setFilter(result, "networkView", "all");
      setFilter(result, "scenario", "szenario1");
      setFilter(result, "networkView", "startnetz");

      expect(result.current.filters.scenario).toBe(ALL_VALUE);
      expect(idsOf(result.current.filteredCollection.features)).toEqual(["startnetz"]);
   });

   it("resets every filter back to the initial state", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(
            collection([pipeline("startnetz", { startnetz: true }), pipeline("scenario-1", { szenario1: true })])
         )
      );

      setFilter(result, "networkView", "all");
      setFilter(result, "scenario", "szenario1");
      setFilter(result, "measureType", "scenarioOnly");
      setFilter(result, "searchTerm", "Szenario 1");
      resetFilters(result);

      expect(result.current.filters).toEqual(initialPipelineFilters);
   });

   it("keeps a deliberate all-data view when scenario marker filters are reset", () => {
      const { result } = renderHook(() =>
         usePipelineFilters(collection([pipeline("startnetz", { startnetz: true }), pipeline("nonstandard")]))
      );

      setFilter(result, "networkView", "all");
      setFilter(result, "scenario", ALL_VALUE);

      expect(result.current.filters.networkView).toBe("all");
      expect(idsOf(result.current.filteredCollection.features)).toEqual(["startnetz", "nonstandard"]);
   });
});
