import { useId } from "react";
import { Check, Euro, RotateCcw, Route, Ruler } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { PipelineLineSymbolStack } from "@/components/ui/pipeline-line-symbol";
import { Slider } from "@/components/ui/slider";
import { PIPELINE_SYMBOL_COLORS } from "@/components/theme/pipelineTheme";
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

const FILTER_PANEL_CLASS =
   "flex min-h-0 flex-col gap-4 overflow-auto focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
const FILTER_GROUP_CLASS = "flex min-h-0 flex-1 flex-col gap-4 overflow-auto border border-border bg-muted/75 p-4";
const FILTER_SECTION_CLASS = "flex flex-col gap-2.5 border-t border-border/80 pt-4 first:border-t-0 first:pt-0";
const FILTER_LABEL_CLASS = "flex min-w-0 items-center gap-1.5 text-xs leading-snug font-medium text-card-foreground";
const SEGMENT_BUTTON_CLASS =
   "inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 text-[0.72rem] text-foreground transition-colors hover:border-primary/70 hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none max-lg:min-h-10 dark:focus-visible:ring-ring/50";
const ACTIVE_SEGMENT_BUTTON_CLASS = "border-primary/80 bg-primary/15 text-card-foreground";
const RESET_BUTTON_CLASS =
   "grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
const RESET_BUTTON_LABEL = "Filter und Karte zurücksetzen";
const DEFAULT_SEGMENT_LAYOUT_CLASS = "grid grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))] gap-2";
const WRAPPING_CHIP_SEGMENT_PROPS = {
   optionButtonClassName: "w-fit max-w-full shrink-0",
   optionLayoutClassName: "flex flex-wrap items-start gap-2",
   optionTextClassName: "whitespace-nowrap"
};
const LINE_TYPE_SYMBOL_COLORS = [PIPELINE_SYMBOL_COLORS.oge, PIPELINE_SYMBOL_COLORS.noOge];

function shouldShowScenarioMarkerFilter(networkView) {
   return SCENARIO_FILTER_NETWORK_VIEWS.includes(networkView);
}

function createChipSegmentGroup(group) {
   return {
      ...WRAPPING_CHIP_SEGMENT_PROPS,
      ...group
   };
}

function MetricsDashboard({ metrics }) {
   const items = [
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

   return (
      <section
         className="min-w-0 flex-1 border border-border bg-muted/75 px-3.5 py-3"
         aria-label="Kennzahlen der aktuellen Ansicht"
      >
         <div className="grid grid-cols-3 divide-x divide-border/75 max-[380px]:grid-cols-2 max-[380px]:divide-x-0 max-[380px]:gap-y-3">
            {items.map(item => (
               <MetricTile key={item.label} {...item} />
            ))}
         </div>
      </section>
   );
}

function MetricTile({ className, description, icon: Icon, label, value, suffix }) {
   return (
      <div className={cn("min-w-0 px-3 first:pl-0 last:pr-0 max-[380px]:px-2", className)}>
         <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate text-[0.66rem] font-medium">{label}</span>
            {description ? (
               <HelpTooltip className="size-4" contentClassName="max-w-80" label={label}>
                  {description}
               </HelpTooltip>
            ) : null}
         </div>
         <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <strong className="shrink-0 whitespace-nowrap text-base leading-none font-medium text-card-foreground">
               {value}
            </strong>
            {suffix ? <span className="shrink-0 text-[0.62rem] text-muted-foreground">{suffix}</span> : null}
         </div>
      </div>
   );
}

function FilterLabel({ as: Component = "div", description, id, label }) {
   return (
      <Component className={FILTER_LABEL_CLASS}>
         <span className="min-w-0" id={id}>
            {label}
         </span>
         <HelpTooltip label={label}>{description}</HelpTooltip>
      </Component>
   );
}

function SegmentGroupLabel({ description, label }) {
   return (
      <div className={FILTER_LABEL_CLASS}>
         <h2 className="min-w-0">{label}</h2>
         <HelpTooltip label={label}>{description}</HelpTooltip>
      </div>
   );
}

function SegmentGroup({
   description,
   label,
   options,
   value,
   onChange,
   swatches = false,
   withDivider = true,
   optionLayoutClassName,
   optionButtonClassName,
   optionTextClassName
}) {
   return (
      <section className={cn(FILTER_SECTION_CLASS, !withDivider && "border-t-0 pt-0")} aria-label={label}>
         <SegmentGroupLabel description={description} label={label} />
         <div className={optionLayoutClassName ?? DEFAULT_SEGMENT_LAYOUT_CLASS} role="group" aria-label={label}>
            {options.map(option => {
               const active = value === option.value;
               const symbolLineType = swatches && option.value !== ALL_VALUE ? option.value : null;

               return (
                  <SegmentButton
                     active={active}
                     groupLabel={label}
                     key={option.value}
                     onChange={onChange}
                     option={option}
                     optionButtonClassName={optionButtonClassName}
                     optionTextClassName={optionTextClassName}
                     symbolLineType={symbolLineType}
                  />
               );
            })}
         </div>
      </section>
   );
}

function SegmentButton({
   active,
   groupLabel,
   option,
   onChange,
   optionButtonClassName,
   optionTextClassName,
   symbolLineType
}) {
   return (
      <button
         aria-label={`${groupLabel}: ${option.label}`}
         aria-pressed={active}
         className={cn(
            SEGMENT_BUTTON_CLASS,
            option.disabled && "cursor-not-allowed opacity-45 hover:border-border hover:bg-muted hover:text-foreground",
            optionButtonClassName,
            active && ACTIVE_SEGMENT_BUTTON_CLASS
         )}
         disabled={option.disabled}
         onClick={() => onChange(option.value)}
         type="button"
      >
         {active ? <Check aria-hidden="true" className="size-3" /> : null}
         {symbolLineType ? <LineTypeSymbol lineType={symbolLineType} /> : null}
         <span className={cn("min-w-0", optionTextClassName ?? "truncate")}>{option.label}</span>
      </button>
   );
}

function LineTypeSymbol({ lineType }) {
   return <PipelineLineSymbolStack colors={LINE_TYPE_SYMBOL_COLORS} lineType={lineType} />;
}

function SelectField({ className, description, label, options, value, onChange }) {
   const selectedOption = options.find(option => option.value === value);
   const selectedLabel = selectedOption?.label ?? "";
   const labelId = useId();

   return (
      <div className={cn("grid gap-2", className)}>
         <FilterLabel description={description} id={labelId} label={label} />
         <Select value={value} onValueChange={onChange}>
            <SelectTrigger aria-labelledby={labelId}>
               <SelectValue placeholder={selectedLabel} />
            </SelectTrigger>
            <SelectContent>
               {options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                     {option.label}
                  </SelectItem>
               ))}
            </SelectContent>
         </Select>
      </div>
   );
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

   const yearFrom = isNumericYear(filters.yearFrom) ? Number(filters.yearFrom) : minYear;
   const yearTo = isNumericYear(filters.yearTo) ? Number(filters.yearTo) : maxYear;
   const selectedFrom = Math.min(yearFrom, yearTo);
   const selectedTo = Math.max(yearFrom, yearTo);
   const selectedLabel = selectedFrom === selectedTo ? String(selectedFrom) : `${selectedFrom} bis ${selectedTo}`;
   const disabled = minYear === maxYear;

   return (
      <div className="grid gap-3">
         <div className="flex min-w-0 items-center justify-between gap-3">
            <FilterLabel description={COMMISSIONING_YEAR_DESCRIPTION} id={labelId} label="Inbetriebnahmejahr" />
            <output
               aria-label="Ausgewählter Bereich Inbetriebnahmejahr"
               aria-live="polite"
               className="shrink-0 rounded-md border border-border bg-field px-2.5 py-1 text-[0.72rem] font-medium text-card-foreground"
            >
               {selectedLabel}
            </output>
         </div>
         <Slider
            aria-labelledby={labelId}
            className="py-1"
            disabled={disabled}
            max={maxYear}
            min={minYear}
            minStepsBetweenThumbs={0}
            onValueChange={setYearRange}
            step={1}
            thumbAriaLabels={["Inbetriebnahmejahr von", "Inbetriebnahmejahr bis"]}
            value={[selectedFrom, selectedTo]}
         />
         <div className="flex items-center justify-between text-[0.66rem] font-medium text-muted-foreground">
            <span>{minYear}</span>
            <span>{maxYear}</span>
         </div>
      </div>
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
         label: "Umstellung oder Neubau",
         options: options.lineTypes,
         swatches: true,
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

function ResetFiltersButton({ onResetFilters }) {
   return (
      <Tooltip>
         <TooltipTrigger asChild>
            <button
               aria-label={RESET_BUTTON_LABEL}
               className={RESET_BUTTON_CLASS}
               onClick={onResetFilters}
               type="button"
            >
               <RotateCcw aria-hidden="true" className="size-4" />
            </button>
         </TooltipTrigger>
         <TooltipContent side="right">{RESET_BUTTON_LABEL}</TooltipContent>
      </Tooltip>
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
            <MetricsDashboard metrics={metrics} />
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
