import { useId } from "react";
import { Euro, Route, Ruler } from "lucide-react";

import { HelpTooltip } from "@/components/ui/help-tooltip";
import { PipelineLineSymbolStack } from "@/components/ui/pipeline-line-symbol";
import { PIPELINE_SYMBOL_COLORS } from "@/components/theme/pipelineTheme";
import {
   FilterLabel,
   MetricsDashboard,
   RangeSliderFilter,
   ResetFiltersButton,
   SegmentGroup,
   SelectField
} from "@/components/panels/filterControls";
import {
   FILTER_GROUP_CLASS,
   FILTER_PANEL_CLASS,
   FILTER_SECTION_CLASS,
   createChipSegmentGroup
} from "@/components/panels/filterStyles";
import { ALL_VALUE, SCENARIO_FILTER_NETWORK_VIEWS } from "@/lib/domain/constants";
import { metricCostLabel, metricIntegerLabel, metricLengthLabel } from "@/lib/domain/formatters";
import { cn } from "@/lib/utils";

const NETWORK_VIEW_DESCRIPTION =
   'Setzt die fachliche Grundmenge der Karte. Die Standardansicht zeigt Startnetz und Netzausbauvorschlag; Szenario-Ansichten zeigen ein Modellierungsergebnis 2037 zuzüglich Startnetz. Die Option "Alle Maßnahmen im Datensatz" zeigt zusätzlich reine Modellierungsergebnisse, die weder Startnetz noch Teil des Netzausbauvorschlags sind.';
const SCENARIO_DESCRIPTION =
   "Zusätzlicher Schnittmengenfilter innerhalb der aktuellen Grundmenge. Er zeigt Maßnahmen, die im gewählten Wasserstoff-Szenario 2037 enthalten sind; anders als die Szenario-Netzansichten fügt er keine Startnetzmaßnahmen hinzu.";
const MEASURE_TYPE_DESCRIPTION =
   "Filtert innerhalb der gewählten Netzansicht nach Rolle im NEP. Startnetz ist Modellierungsbasis, nicht Teil des Netzausbauvorschlags; reine Modellierungsergebnisse 2037 sind keine Bauentscheidung.";
const KERNNETZ_ID_DESCRIPTION =
   "Zeigt, ob für eine Maßnahme eine Kernnetz-ID hinterlegt ist. Die Kernnetz-ID ist ein Referenzschlüssel zur Kernnetz-Zuordnung; sie ist kein Nachweis für Baurecht, Bauentscheidung, Umsetzungsstand oder die aktuelle Einordnung im NEP.";
const FEATURE_TYPE_DESCRIPTION =
   "Filtert nach der Art der Maßnahme: Leitungen, Verdichter (Standorte und aggregierte Verdichtermaßnahmen), GDRM-Anlagen (Gasdruckregel- und Messanlagen) oder sonstige Maßnahmen. GDRM-Anlagen und einige weitere Maßnahmen haben aktuell keine Kartengeometrie und erscheinen nur in Trefferliste und Detailansicht.";
const LINE_TYPE_DESCRIPTION =
   "Unterscheidet Neubau und Umstellung. Umstellung bedeutet vorgesehene Nutzung einer bestehenden Erdgasleitung für Wasserstoff und setzt voraus, dass die Leitung aus dem Methansystem freigemacht werden kann.";
const COMMISSIONING_YEAR_DESCRIPTION =
   "Filtert nach dem planerischen Inbetriebnahmejahr aus den Maßnahmendaten. Das Jahr ist ein Planwert, kein tatsächliches oder zugesichertes Inbetriebnahmedatum.";
const OPERATOR_FILTER_DESCRIPTION =
   "Filtert nach Unternehmen, die als durchführende Netzbetreiber oder als Ansprechpartner genannt sind. Ansprechpartner ist eine Kontaktrolle und bedeutet nicht automatisch Umsetzungs- oder Investitionsverantwortung.";
const OGE_PARTICIPATION_DESCRIPTION =
   "Zeigt nur Maßnahmen, bei denen OGE als Ansprechpartner oder durchführender Netzbetreiber genannt ist. Das ist breiter als die Hervorhebung der durchführenden FNB und keine Aussage zu Eigentum oder alleiniger Verantwortung.";
const OGE_EXECUTING_OPERATOR_HIGHLIGHT_LABEL = "Hervorheben, wenn OGE durchführender FNB ist";
const OGE_EXECUTING_OPERATOR_HIGHLIGHT_DESCRIPTION =
   "Darstellung, kein Filter: hebt Leitungen und Verdichterstandorte auf der Karte hervor, bei denen OGE als durchführender Netzbetreiber benannt ist. OGE als Ansprechpartner wird dabei nicht berücksichtigt.";
const METRIC_COUNT_DESCRIPTION =
   "Anzahl der offiziellen NEP-Maßnahmen, die den aktiven Filtern entsprechen. Ein Verdichterstandort bündelt mehrere Einzelmaßnahmen; gezählt werden nur die passenden.";
const METRIC_LENGTH_DESCRIPTION =
   "Summe der geplanten Leitungslängen der aktuellen Auswahl. Nur Leitungsmaßnahmen tragen zur Länge bei; GDRM-Anlagen und Verdichter sind nicht enthalten.";
const METRIC_COST_DESCRIPTION =
   "Summe der in den Maßnahmendaten angegebenen Kosten aller Einzelmaßnahmen, die den aktiven Filtern entsprechen — über alle Maßnahmenarten, einschließlich Maßnahmen ohne Kartengeometrie.";

const LINE_TYPE_SYMBOL_COLORS = [PIPELINE_SYMBOL_COLORS.oge, PIPELINE_SYMBOL_COLORS.noOge];

function shouldShowScenarioMarkerFilter(networkView) {
   return SCENARIO_FILTER_NETWORK_VIEWS.includes(networkView);
}

function buildMetricItems(metrics) {
   return [
      {
         description: METRIC_COUNT_DESCRIPTION,
         icon: Route,
         label: "Maßnahmen",
         value: metricIntegerLabel(metrics.count)
      },
      {
         description: METRIC_LENGTH_DESCRIPTION,
         icon: Ruler,
         label: "Länge",
         value: metricLengthLabel(metrics.lengthKm),
         suffix: "km"
      },
      {
         className: "max-[380px]:col-span-2",
         description: METRIC_COST_DESCRIPTION,
         icon: Euro,
         label: "Kosten",
         value: metricCostLabel(metrics.costMioEur),
         suffix: "EUR"
      }
   ];
}

function SwitchControl({ active, label, onChange }) {
   const state = active ? "checked" : "unchecked";
   const inputId = useId();

   return (
      <label className="relative flex min-w-0 cursor-pointer select-none items-center gap-2.5" htmlFor={inputId}>
         <input
            checked={active}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            id={inputId}
            onChange={event => onChange(event.target.checked)}
            role="switch"
            type="checkbox"
         />
         <span
            aria-hidden="true"
            data-state={state}
            className={cn(
               "pointer-events-none relative h-4.5 w-8 shrink-0 rounded-full border border-border bg-field transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/65 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background peer-focus-visible:outline-none dark:peer-focus-visible:ring-ring/50",
               "data-[state=checked]:border-primary/70 data-[state=checked]:bg-primary/80"
            )}
         >
            <span
               data-state={state}
               className="absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 rounded-full bg-muted-foreground transition-transform data-[state=checked]:translate-x-3.25 data-[state=checked]:bg-primary-foreground"
            />
         </span>
         <span className="pointer-events-none min-w-0 text-xs leading-snug font-medium text-card-foreground">
            {label}
         </span>
      </label>
   );
}

function SwitchRow({ active, description, label, onChange }) {
   return (
      <div className="flex min-h-8 items-center gap-2.5">
         <SwitchControl active={active} label={label} onChange={onChange} />
         <HelpTooltip label={label}>{description}</HelpTooltip>
      </div>
   );
}

function isNumericYear(value) {
   return Number.isFinite(Number(value));
}

function YearRangeFilter({ filters, options, setYearRange }) {
   const labelId = useId();
   const years = options.years ?? [];
   const minYear = years[0];
   const maxYear = years[years.length - 1];

   if (!isNumericYear(minYear) || !isNumericYear(maxYear)) {
      return (
         <div className="grid gap-2">
            <FilterLabel description={COMMISSIONING_YEAR_DESCRIPTION} id={labelId} label="Inbetriebnahmejahr" />
            <p className="text-xs text-muted-foreground">Keine Jahresangaben verfügbar</p>
         </div>
      );
   }

   // Bei nur einem Jahr im Datensatz gibt es nichts auszuwählen; ein Slider mit min === max
   // würde zudem ungültige Thumb-Positionen (NaN-Prozentwerte) rendern.
   if (minYear === maxYear) {
      return (
         <div className="grid gap-2">
            <FilterLabel description={COMMISSIONING_YEAR_DESCRIPTION} id={labelId} label="Inbetriebnahmejahr" />
            <p className="text-xs text-muted-foreground">{`Alle Maßnahmen: Inbetriebnahme ${minYear}`}</p>
         </div>
      );
   }

   const yearFrom = isNumericYear(filters.yearFrom) ? Number(filters.yearFrom) : minYear;
   const yearTo = isNumericYear(filters.yearTo) ? Number(filters.yearTo) : maxYear;

   return (
      <RangeSliderFilter
         description={COMMISSIONING_YEAR_DESCRIPTION}
         label="Inbetriebnahmejahr"
         max={maxYear}
         min={minYear}
         onValueChange={setYearRange}
         rangeAriaLabel="Ausgewählter Bereich Inbetriebnahmejahr"
         thumbAriaLabels={["Inbetriebnahmejahr von", "Inbetriebnahmejahr bis"]}
         valueFrom={yearFrom}
         valueTo={yearTo}
      />
   );
}

function OperatorFilterGroup({
   filters,
   highlightOgeExecutingOperator,
   onHighlightOgeExecutingOperatorChange,
   options,
   setFilter
}) {
   return (
      <section className={cn(FILTER_SECTION_CLASS, "gap-3")} aria-label="Betreiberfilter">
         <SelectField
            description={OPERATOR_FILTER_DESCRIPTION}
            label="Netzbetreiber oder Ansprechpartner"
            onChange={value => setFilter("operator", value)}
            options={options.operators}
            value={filters.operator}
         />
         <div className="grid gap-1.5">
            <SwitchRow
               active={filters.ogeParticipationOnly}
               description={OGE_PARTICIPATION_DESCRIPTION}
               label="Nur OGE-Bezug"
               onChange={value => setFilter("ogeParticipationOnly", value)}
            />
            <SwitchRow
               active={highlightOgeExecutingOperator}
               description={OGE_EXECUTING_OPERATOR_HIGHLIGHT_DESCRIPTION}
               label={OGE_EXECUTING_OPERATOR_HIGHLIGHT_LABEL}
               onChange={onHighlightOgeExecutingOperatorChange}
            />
         </div>
      </section>
   );
}

function LineTypeSymbol({ lineType }) {
   return <PipelineLineSymbolStack colors={LINE_TYPE_SYMBOL_COLORS} lineType={lineType} />;
}

function FilterControls({
   filters,
   highlightOgeExecutingOperator,
   kernnetzIdOptions,
   measureTypeOptions,
   networkViewOptions,
   onHighlightOgeExecutingOperatorChange,
   options,
   setYearRange,
   scenarioOptions,
   setFilter
}) {
   const showScenarioMarkerFilter = shouldShowScenarioMarkerFilter(filters.networkView);
   const segmentGroups = [];

   if (options.featureTypes?.length > 0) {
      segmentGroups.push(
         createChipSegmentGroup({
            description: FEATURE_TYPE_DESCRIPTION,
            filterKey: "featureType",
            label: "Maßnahmenart",
            options: options.featureTypes,
            value: filters.featureType
         })
      );
   }

   segmentGroups.push(
      createChipSegmentGroup({
         description: MEASURE_TYPE_DESCRIPTION,
         filterKey: "measureType",
         label: "Einordnung im NEP",
         options: measureTypeOptions,
         value: filters.measureType
      }),
      createChipSegmentGroup({
         description: KERNNETZ_ID_DESCRIPTION,
         filterKey: "kernnetzIdStatus",
         label: "Teil des Kernnetzes",
         options: kernnetzIdOptions,
         value: filters.kernnetzIdStatus
      })
   );

   if (showScenarioMarkerFilter) {
      segmentGroups.push(
         createChipSegmentGroup({
            description: SCENARIO_DESCRIPTION,
            filterKey: "scenario",
            label: "In Szenario 2037 enthalten",
            options: scenarioOptions,
            value: filters.scenario
         })
      );
   }

   segmentGroups.push(
      createChipSegmentGroup({
         description: LINE_TYPE_DESCRIPTION,
         filterKey: "lineType",
         getOptionSymbol: option => (option.value === ALL_VALUE ? null : <LineTypeSymbol lineType={option.value} />),
         label: "Umstellung oder Neubau",
         options: options.lineTypes,
         value: filters.lineType
      })
   );

   return (
      <div className={FILTER_GROUP_CLASS}>
         <section className={FILTER_SECTION_CLASS} aria-label="Netzansicht">
            <SelectField
               description={NETWORK_VIEW_DESCRIPTION}
               label="Netzansicht"
               onChange={value => setFilter("networkView", value)}
               options={networkViewOptions}
               value={filters.networkView}
            />
         </section>

         {segmentGroups.map(({ filterKey, ...group }) => (
            <SegmentGroup key={filterKey} onChange={value => setFilter(filterKey, value)} {...group} />
         ))}

         <section className={FILTER_SECTION_CLASS} aria-label="Inbetriebnahmejahr">
            <YearRangeFilter filters={filters} options={options} setYearRange={setYearRange} />
         </section>

         <OperatorFilterGroup
            filters={filters}
            highlightOgeExecutingOperator={highlightOgeExecutingOperator}
            onHighlightOgeExecutingOperatorChange={onHighlightOgeExecutingOperatorChange}
            options={options}
            setFilter={setFilter}
         />
      </div>
   );
}

export default function FilterPanel({
   className,
   filters,
   highlightOgeExecutingOperator = false,
   kernnetzIdOptions,
   metrics,
   onHighlightOgeExecutingOperatorChange = () => {},
   onResetFilters,
   measureTypeOptions,
   networkViewOptions,
   options,
   scenarioOptions,
   setFilter,
   setYearRange
}) {
   return (
      <aside
         aria-label="Kennzahlen und Filter"
         className={cn(FILTER_PANEL_CLASS, className)}
         id="filter-panel"
         tabIndex={-1}
      >
         <div className="flex items-center gap-3">
            <MetricsDashboard items={buildMetricItems(metrics)} />
            <ResetFiltersButton onResetFilters={onResetFilters} />
         </div>
         <FilterControls
            filters={filters}
            highlightOgeExecutingOperator={highlightOgeExecutingOperator}
            kernnetzIdOptions={kernnetzIdOptions}
            measureTypeOptions={measureTypeOptions}
            networkViewOptions={networkViewOptions}
            onHighlightOgeExecutingOperatorChange={onHighlightOgeExecutingOperatorChange}
            options={options}
            scenarioOptions={scenarioOptions}
            setFilter={setFilter}
            setYearRange={setYearRange}
         />
      </aside>
   );
}
