import { useEffect, useMemo, useRef, useState } from "react";

import NetworkMap from "@/components/map/NetworkMap";
import FilterPanel from "@/components/panels/FilterPanel";
import InspectorPanel from "@/components/panels/InspectorPanel";
import Topbar from "@/components/layout/Topbar";
import { buildCountryCollections } from "@/lib/data/geoCollections";
import { loadPlaces } from "@/lib/data/loadPlaces";
import { usePipelineFilters } from "@/hooks/usePipelineFilters";
import { usePipelineSelection } from "@/hooks/usePipelineSelection";

function restoreSelectionFocus(previousResultId, previousTrigger) {
   const restoreFallbackFocus = () => {
      if (previousTrigger?.isConnected) {
         previousTrigger.focus();
         return;
      }

      document.getElementById("inspector-panel")?.focus();
   };

   window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
         const resultButton = [...document.querySelectorAll("[data-pipeline-result-id]")].find(
            button => button.dataset.pipelineResultId === previousResultId
         );

         if (resultButton) {
            resultButton.focus();
            return;
         }

         restoreFallbackFocus();
      });
   });
}

export default function PipelineWorkspace({ countries, pipelineCollection }) {
   const [highlightOgeExecutingOperator, setHighlightOgeExecutingOperator] = useState(false);
   const [mapContent, setMapContent] = useState("pipelines");
   const [places, setPlaces] = useState([]);
   const [placesError, setPlacesError] = useState(null);
   const [placesLoaded, setPlacesLoaded] = useState(false);
   const [resetViewKey, setResetViewKey] = useState(0);
   // Zählt explizite Auswahl-Schließungen (X-Button, neue Sucheingabe): Nur die stellen den
   // Kartenkontext wieder her; blendet ein Filterwechsel die Auswahl aus, bleibt der Ausschnitt.
   const [selectionCloseKey, setSelectionCloseKey] = useState(0);
   const lastSelectionResultIdRef = useRef(null);
   const lastSelectionTriggerRef = useRef(null);
   const { europeContext, germany } = useMemo(() => buildCountryCollections(countries), [countries]);

   const filters = usePipelineFilters(pipelineCollection);
   const selection = usePipelineSelection(filters.filteredCollection);

   useEffect(() => {
      let active = true;

      loadPlaces(import.meta.env.BASE_URL)
         .then(data => {
            if (active) {
               setPlaces(data);
               setPlacesLoaded(true);
            }
         })
         .catch(error => {
            console.error("Ortsdaten konnten nicht geladen werden:", error);
            if (active) {
               setPlacesError(error);
               setPlacesLoaded(true);
               setMapContent("pipelines");
            }
         });

      return () => {
         active = false;
      };
   }, []);

   const changeMapContent = value => {
      if (value === mapContent) return;
      if (value === "places" && (!placesLoaded || placesError)) return;
      setMapContent(value);
   };

   const resetFilters = () => {
      filters.resetFilters();
      selection.clearSelection();
      setHighlightOgeExecutingOperator(false);
      setResetViewKey(value => value + 1);
   };

   const dismissSelection = () => {
      selection.clearSelection();
      setSelectionCloseKey(value => value + 1);
   };

   const closeSelection = () => {
      const previousResultId = lastSelectionResultIdRef.current;
      const previousTrigger = lastSelectionTriggerRef.current;

      dismissSelection();
      restoreSelectionFocus(previousResultId, previousTrigger);
   };

   const clearSearchTerm = () => {
      filters.setFilter("searchTerm", "");
   };

   const searchPipelines = value => {
      if (selection.selection) dismissSelection();
      filters.setFilter("searchTerm", value);
   };

   const selectResult = (result, trigger) => {
      lastSelectionResultIdRef.current = result.item.properties.id;
      lastSelectionTriggerRef.current = trigger ?? null;
      selection.selectResult(result);
   };

   const selectPipeline = (item, source) => {
      lastSelectionResultIdRef.current = null;
      lastSelectionTriggerRef.current = null;
      selection.selectPipeline(item, source);
   };

   return (
      <main className="app-shell min-h-svh bg-background p-4 text-foreground max-lg:p-3">
         <Topbar />
         <section className="mx-auto grid max-w-440 grid-cols-[29rem_minmax(0,1fr)] items-stretch gap-4 min-[1360px]:h-[calc(100svh-112px)] min-[1360px]:grid-cols-[29rem_minmax(340px,1fr)_26.5rem] max-lg:grid-cols-1">
            <FilterPanel
               className={
                  selection.selection
                     ? "max-h-[calc(100svh-112px)] min-[1360px]:h-full max-lg:order-3 max-lg:h-auto max-lg:max-h-none"
                     : "max-h-[calc(100svh-112px)] min-[1360px]:h-full max-lg:order-1 max-lg:h-auto max-lg:max-h-none"
               }
               filters={filters.filters}
               highlightOgeExecutingOperator={highlightOgeExecutingOperator}
               kernnetzIdOptions={filters.kernnetzIdOptions}
               metrics={filters.metrics}
               onHighlightOgeExecutingOperatorChange={setHighlightOgeExecutingOperator}
               onResetFilters={resetFilters}
               measureTypeOptions={filters.measureTypeOptions}
               networkViewOptions={filters.networkViewOptions}
               options={filters.options}
               scenarioOptions={filters.scenarioOptions}
               setFilter={filters.setFilter}
               setYearRange={filters.setYearRange}
            />

            <div className="col-start-2 row-start-1 flex min-h-0 flex-col self-stretch min-[1360px]:col-auto min-[1360px]:row-auto max-lg:col-start-auto max-lg:row-start-auto max-lg:order-2">
               <div className="min-h-0 flex-1">
                  <NetworkMap
                     europeContext={europeContext}
                     filteredPipelines={filters.filteredCollection}
                     germany={germany}
                     highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                     mapContent={mapContent}
                     onMapContentChange={changeMapContent}
                     onSelectPipeline={selectPipeline}
                     places={places}
                     placesDisabled={!placesLoaded || Boolean(placesError)}
                     placesUnavailableReason={
                        placesError ? "Orte konnten nicht geladen werden." : "Orte werden geladen."
                     }
                     resetViewKey={resetViewKey}
                     searchActive={filters.hasActiveSearch}
                     searchBounds={filters.searchBounds}
                     selection={selection.selection}
                     selectionCloseKey={selectionCloseKey}
                  />
               </div>
            </div>

            <InspectorPanel
               className={`col-span-2 row-start-2 max-h-104 min-[1360px]:col-span-1 min-[1360px]:row-auto min-[1360px]:max-h-none max-lg:col-span-1 max-lg:row-start-auto max-lg:h-auto max-lg:max-h-[min(78svh,44rem)] ${selection.selection ? "max-lg:order-1" : "max-lg:order-3"}`}
               onClearSearch={clearSearchTerm}
               onCloseSelection={closeSelection}
               onSearchTermChange={searchPipelines}
               onSelectResult={selectResult}
               onShowSearchFallback={filters.showSearchFallback}
               results={filters.results}
               searchFallbackCount={filters.searchFallbackCount}
               searchTerm={filters.filters.searchTerm}
               selection={selection.selection}
            />
         </section>
      </main>
   );
}
