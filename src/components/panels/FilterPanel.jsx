import { useId } from "react";
import { Check, Euro, RotateCcw, Route, Ruler } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { PipelineLineSymbolStack } from "@/components/ui/pipeline-line-symbol";
import { PIPELINE_SYMBOL_COLORS } from "@/components/theme/pipelineTheme";
import { ALL_VALUE, SCENARIO_FILTER_NETWORK_VIEWS } from "@/lib/domain/constants";
import { metricCostLabel, metricIntegerLabel, metricLengthLabel } from "@/lib/domain/formatters";
import { cn } from "@/lib/utils";

const NETWORK_VIEW_DESCRIPTION =
   "Legt fest, welche fachliche Menge von Leitungsmaßnahmen auf der Karte angezeigt wird. Szenario-Auswahlen zeigen Startnetzmaßnahmen plus Maßnahmen aus dem jeweiligen Wasserstoff-Modellierungsergebnis 2037.";
const SCENARIO_DESCRIPTION =
   "Schränkt die aktuelle Auswahl auf Maßnahmen ein, die im gewählten Wasserstoff-Szenario 2037 enthalten sind. Dieser Filter fügt keine Startnetzmaßnahmen hinzu.";
const MEASURE_TYPE_DESCRIPTION =
   "Filtert nach der fachlichen Einordnung im NEP 2025: Startnetzmaßnahme, Teil des Netzausbauvorschlags oder Maßnahme, die nur in mindestens einem Szenarioergebnis 2037 enthalten ist.";
const OPERATOR_FILTER_DESCRIPTION =
   "Der Filter berücksichtigt Unternehmen, die als durchführende Netzbetreiber oder als Ansprechpartner genannt sind. Die Nennung als Ansprechpartner bedeutet nicht zwingend Umsetzungsverantwortung.";
const OGE_PARTICIPATION_DESCRIPTION =
   "Zeigt nur Maßnahmen an, bei denen OGE als Ansprechpartner oder durchführender Netzbetreiber genannt ist.";
const METRIC_COST_DESCRIPTION =
   "Summe der in den Maßnahmendaten angegebenen Kosten der aktuellen Auswahl. Enthalten sind die kartierten Leitungsmaßnahmen; Verdichterstationen und sonstige Investitionspositionen ohne Leitungsgeometrie sind nicht enthalten.";

const FILTER_PANEL_CLASS =
   "flex min-h-0 flex-col gap-4 overflow-auto focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
const FILTER_GROUP_CLASS = "flex min-h-0 flex-1 flex-col gap-4 overflow-auto border border-border bg-muted/75 p-4";
const FILTER_SECTION_CLASS = "flex flex-col gap-2.5 border-t border-border/80 pt-4 first:border-t-0 first:pt-0";
const FILTER_LABEL_CLASS = "flex min-w-0 items-center gap-1.5 text-xs leading-snug font-medium text-card-foreground";
const SEGMENT_BUTTON_CLASS =
   "inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 text-[0.72rem] text-foreground transition-colors hover:border-primary/70 hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none max-lg:min-h-10 dark:focus-visible:ring-ring/50";
const ACTIVE_SEGMENT_BUTTON_CLASS = "border-primary/80 bg-primary/15 text-card-foreground";
const RESET_BUTTON_CLASS =
   "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-3.5 text-[0.72rem] font-medium text-card-foreground transition-colors hover:border-primary hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
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

function shouldShowMeasureTypeFilter(networkView) {
   return networkView !== "startnetz";
}

function createChipSegmentGroup(group) {
   return {
      ...WRAPPING_CHIP_SEGMENT_PROPS,
      ...group
   };
}

function MetricsDashboard({ metrics }) {
   const items = [
      { icon: Route, label: "Leitungen", value: metricIntegerLabel(metrics.count) },
      { icon: Ruler, label: "Länge", value: metricLengthLabel(metrics.lengthKm), suffix: "km" },
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
      <section className="border border-border bg-muted/75 px-3.5 py-3" aria-label="Kennzahlen der aktuellen Ansicht">
         <div className="grid grid-cols-[0.85fr_1fr_1.25fr] divide-x divide-border/75 max-[380px]:grid-cols-2 max-[380px]:divide-x-0 max-[380px]:gap-y-3">
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
            <span className="truncate text-[0.66rem] font-medium uppercase">{label}</span>
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

function OgeParticipationSwitch({ active, onChange }) {
   const state = active ? "checked" : "unchecked";
   const inputId = useId();

   return (
      <div className="flex min-h-8 items-center gap-2.5">
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
            <span className="pointer-events-none min-w-0 truncate text-xs font-medium text-card-foreground">
               Nur OGE-Bezug
            </span>
         </label>
         <HelpTooltip label="Nur OGE-Bezug">{OGE_PARTICIPATION_DESCRIPTION}</HelpTooltip>
      </div>
   );
}

function OperatorFilterGroup({ filters, options, setFilter }) {
   return (
      <section className={cn(FILTER_SECTION_CLASS, "gap-3")} aria-label="Betreiberfilter">
         <SelectField
            description={OPERATOR_FILTER_DESCRIPTION}
            label="Netzbetreiber oder Ansprechpartner"
            onChange={value => setFilter("operator", value)}
            options={options.operators}
            value={filters.operator}
         />
         <OgeParticipationSwitch
            active={filters.ogeParticipationOnly}
            onChange={value => setFilter("ogeParticipationOnly", value)}
         />
      </section>
   );
}

function FilterControls({
   filters,
   measureTypeOptions,
   networkViewOptions,
   onResetFilters,
   options,
   scenarioOptions,
   setFilter
}) {
   const showScenarioMarkerFilter = shouldShowScenarioMarkerFilter(filters.networkView);
   const showMeasureTypeFilter = shouldShowMeasureTypeFilter(filters.networkView);
   const segmentGroups = [
      createChipSegmentGroup({
         filterKey: "lineType",
         label: "Leitungstyp",
         options: options.lineTypes,
         swatches: true,
         value: filters.lineType
      })
   ];

   if (showMeasureTypeFilter) {
      segmentGroups.unshift(
         createChipSegmentGroup({
            description: MEASURE_TYPE_DESCRIPTION,
            filterKey: "measureType",
            label: "NEP-Einordnung",
            options: measureTypeOptions,
            value: filters.measureType
         })
      );
   }

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

   return (
      <div className={FILTER_GROUP_CLASS}>
         <section className={FILTER_SECTION_CLASS} aria-label="Netzauswahl">
            <SelectField
               description={NETWORK_VIEW_DESCRIPTION}
               label="Netzauswahl"
               onChange={value => setFilter("networkView", value)}
               options={networkViewOptions}
               value={filters.networkView}
            />
         </section>

         {segmentGroups.map(({ filterKey, ...group }) => (
            <SegmentGroup key={filterKey} onChange={value => setFilter(filterKey, value)} {...group} />
         ))}

         <section className={FILTER_SECTION_CLASS} aria-label="Inbetriebnahmejahr">
            <SelectField
               label="Inbetriebnahmejahr"
               onChange={value => setFilter("year", value)}
               options={options.years}
               value={filters.year}
            />
         </section>

         <OperatorFilterGroup filters={filters} options={options} setFilter={setFilter} />

         <div className="mt-auto border-t border-border/80 pt-4">
            <ResetFiltersButton onResetFilters={onResetFilters} />
         </div>
      </div>
   );
}

function ResetFiltersButton({ onResetFilters }) {
   return (
      <button className={RESET_BUTTON_CLASS} onClick={onResetFilters} type="button">
         <RotateCcw aria-hidden="true" className="size-4" />
         <span>Filter und Karte zurücksetzen</span>
      </button>
   );
}

export default function FilterPanel({
   className,
   filters,
   metrics,
   onResetFilters,
   measureTypeOptions,
   networkViewOptions,
   options,
   scenarioOptions,
   setFilter
}) {
   return (
      <aside
         aria-label="Kennzahlen und Filter"
         className={cn(FILTER_PANEL_CLASS, className)}
         id="filter-panel"
         tabIndex={-1}
      >
         <MetricsDashboard metrics={metrics} />
         <FilterControls
            filters={filters}
            measureTypeOptions={measureTypeOptions}
            networkViewOptions={networkViewOptions}
            onResetFilters={onResetFilters}
            options={options}
            scenarioOptions={scenarioOptions}
            setFilter={setFilter}
         />
      </aside>
   );
}
