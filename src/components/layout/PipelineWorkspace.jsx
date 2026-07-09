import { useEffect, useMemo, useRef, useState } from "react";

import NetworkMap from "@/components/map/NetworkMap";
import FilterPanel from "@/components/panels/FilterPanel";
import InspectorPanel from "@/components/panels/InspectorPanel";
import MarktabfrageDetailPanel from "@/components/panels/MarktabfrageDetailPanel";
import MarktabfrageFilterPanel from "@/components/panels/MarktabfrageFilterPanel";
import Topbar from "@/components/layout/Topbar";
import { buildCountryCollections } from "@/lib/data/geoCollections";
import { EMPTY_MARKTABFRAGE_COLLECTION } from "@/lib/data/marktabfrageGeoJson";
import { DATENSATZ_MARKTABFRAGE, DATENSATZ_NEP } from "@/lib/domain/constants";
import { loadPlaces } from "@/lib/data/loadPlaces";
import { projektMeta } from "@/lib/domain/marktabfrageFormatters";
import { hasLineGeometry } from "@/lib/domain/pipeline";
import { useMarktabfrageFilters } from "@/hooks/useMarktabfrageFilters";
import { usePipelineFilters } from "@/hooks/usePipelineFilters";
import { usePipelineSelection } from "@/hooks/usePipelineSelection";

const MARKTABFRAGE_SEARCH_INPUT_LABEL = "Suche nach Projektname, Betreiber, Ort, PLZ, ID oder Projektnummer";

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

export default function PipelineWorkspace({
   countries,
   marktabfrageCollection = EMPTY_MARKTABFRAGE_COLLECTION,
   pipelineCollection
}) {
   const [datensatz, setDatensatz] = useState(DATENSATZ_NEP);
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

   const hasMarktabfrage = marktabfrageCollection.features.length > 0;
   const isMarktabfrage = hasMarktabfrage && datensatz === DATENSATZ_MARKTABFRAGE;

   const pipelineFilters = usePipelineFilters(pipelineCollection);
   const pipelineSelection = usePipelineSelection(pipelineFilters.filteredCollection);
   const marktabfrageFilters = useMarktabfrageFilters(marktabfrageCollection);
   const marktabfrageSelection = usePipelineSelection(marktabfrageFilters.filteredCollection);

   // Merken je Datensatz, welche Auswahl das Detailpanel zuletzt fokussiert hat: Die Refs leben
   // im Workspace, damit ein Moduswechsel mit erhaltener Auswahl das remountete Panel nicht
   // erneut fokussieren lässt.
   const pipelineDetailFocusRef = useRef(null);
   const marktabfrageDetailFocusRef = useRef(null);

   useEffect(() => {
      if (!pipelineSelection.selection) pipelineDetailFocusRef.current = null;
   }, [pipelineSelection.selection]);
   useEffect(() => {
      if (!marktabfrageSelection.selection) marktabfrageDetailFocusRef.current = null;
   }, [marktabfrageSelection.selection]);

   // Filter- und Auswahlzustand beider Datensätze bleiben beim Umschalten erhalten; aktiv ist
   // immer genau ein Paar.
   const filters = isMarktabfrage ? marktabfrageFilters : pipelineFilters;
   const selection = isMarktabfrage ? marktabfrageSelection : pipelineSelection;

   // Blasser Kontext im Marktabfrage-Modus: genau die Leitungen, die die NEP-Karte mit ihren
   // aktuellen Filtern (inkl. Suche) zeigt — der Kontext entspricht damit dem Stand vor dem
   // Umschalten, statt einer fixen Grundmenge.
   const pipelineContext = useMemo(
      () => ({
         type: "FeatureCollection",
         features: pipelineFilters.filteredCollection.features.filter(hasLineGeometry)
      }),
      [pipelineFilters.filteredCollection]
   );

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
      // Die OGE-Hervorhebung ist eine NEP-Darstellungsoption: Der Reset im Marktabfrage-Modus
      // lässt den Zustand des NEP-Modus unangetastet.
      if (!isMarktabfrage) setHighlightOgeExecutingOperator(false);
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

   const filterPanelClassName = selection.selection
      ? "max-h-[calc(100svh-112px)] min-[1360px]:h-full max-lg:order-3 max-lg:h-auto max-lg:max-h-none"
      : "max-h-[calc(100svh-112px)] min-[1360px]:h-full max-lg:order-1 max-lg:h-auto max-lg:max-h-none";

   return (
      <main className="app-shell min-h-svh bg-background p-4 text-foreground max-lg:p-3">
         <Topbar
            datensatz={isMarktabfrage ? DATENSATZ_MARKTABFRAGE : DATENSATZ_NEP}
            onDatensatzChange={setDatensatz}
            showDatensatzSwitch={hasMarktabfrage}
         />
         <section className="mx-auto grid max-w-440 grid-cols-[29rem_minmax(0,1fr)] items-stretch gap-4 min-[1360px]:h-[calc(100svh-112px)] min-[1360px]:grid-cols-[29rem_minmax(340px,1fr)_26.5rem] max-lg:grid-cols-1">
            {isMarktabfrage ? (
               <MarktabfrageFilterPanel
                  className={filterPanelClassName}
                  filters={marktabfrageFilters.filters}
                  hatWasserstoffProjekte={marktabfrageFilters.hatWasserstoffProjekte}
                  jahrBounds={marktabfrageFilters.jahrBounds}
                  kategorieOptions={marktabfrageFilters.kategorieOptions}
                  metrics={marktabfrageFilters.metrics}
                  minLeistungOptions={marktabfrageFilters.minLeistungOptions}
                  netzOptions={marktabfrageFilters.netzOptions}
                  onResetFilters={resetFilters}
                  projektTypOptions={marktabfrageFilters.projektTypOptions}
                  setFilter={marktabfrageFilters.setFilter}
                  setHaertegradRange={marktabfrageFilters.setHaertegradRange}
                  setJahrRange={marktabfrageFilters.setJahrRange}
                  typAutoSwitchGrund={marktabfrageFilters.typAutoSwitchGrund}
               />
            ) : (
               <FilterPanel
                  className={filterPanelClassName}
                  filters={pipelineFilters.filters}
                  highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                  kernnetzIdOptions={pipelineFilters.kernnetzIdOptions}
                  metrics={pipelineFilters.metrics}
                  onHighlightOgeExecutingOperatorChange={setHighlightOgeExecutingOperator}
                  onResetFilters={resetFilters}
                  measureTypeOptions={pipelineFilters.measureTypeOptions}
                  networkViewOptions={pipelineFilters.networkViewOptions}
                  options={pipelineFilters.options}
                  scenarioOptions={pipelineFilters.scenarioOptions}
                  setFilter={pipelineFilters.setFilter}
                  setYearRange={pipelineFilters.setYearRange}
               />
            )}

            <div className="col-start-2 row-start-1 flex min-h-0 flex-col self-stretch min-[1360px]:col-auto min-[1360px]:row-auto max-lg:col-start-auto max-lg:row-start-auto max-lg:order-2">
               <div className="min-h-0 flex-1">
                  <NetworkMap
                     europeContext={europeContext}
                     filteredPipelines={pipelineFilters.filteredCollection}
                     germany={germany}
                     highlightOgeExecutingOperator={highlightOgeExecutingOperator}
                     mapContent={mapContent}
                     marktabfrageMode={isMarktabfrage}
                     marktabfrageProjekte={marktabfrageFilters.filteredCollection}
                     onMapContentChange={changeMapContent}
                     onSelectPipeline={selectPipeline}
                     pipelineContext={pipelineContext}
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
               detailFocusRef={pipelineDetailFocusRef}
               getResultMeta={isMarktabfrage ? projektMeta : undefined}
               onClearSearch={clearSearchTerm}
               onCloseSelection={closeSelection}
               onSearchTermChange={searchPipelines}
               onSelectResult={selectResult}
               // Der Fallback-Knopf erscheint nur bei searchFallbackCount > 0 und ist damit im
               // Marktabfrage-Modus (Count fest 0) unerreichbar — dort gibt es keine
               // eingeschränkte Netzansicht, in die eine Suche zurückfallen könnte.
               onShowSearchFallback={isMarktabfrage ? undefined : pipelineFilters.showSearchFallback}
               renderDetail={
                  isMarktabfrage
                     ? (activeSelection, onClose) => (
                          <MarktabfrageDetailPanel
                             focusedSelectionRef={marktabfrageDetailFocusRef}
                             labels={marktabfrageCollection.labels}
                             onClose={onClose}
                             selection={activeSelection}
                          />
                       )
                     : undefined
               }
               results={filters.results}
               searchFallbackCount={isMarktabfrage ? 0 : pipelineFilters.searchFallbackCount}
               searchInputLabel={isMarktabfrage ? MARKTABFRAGE_SEARCH_INPUT_LABEL : undefined}
               searchTerm={filters.filters.searchTerm}
               selection={selection.selection}
            />
         </section>
      </main>
   );
}
