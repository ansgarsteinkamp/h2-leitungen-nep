import { useId } from "react";
import { Check, RotateCcw } from "lucide-react";

import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
   ACTIVE_SEGMENT_BUTTON_CLASS,
   DEFAULT_SEGMENT_LAYOUT_CLASS,
   FILTER_LABEL_CLASS,
   FILTER_SECTION_CLASS,
   RESET_FILTERS_BUTTON_CLASS,
   RESET_FILTERS_BUTTON_LABEL,
   SEGMENT_BUTTON_CLASS
} from "@/components/panels/filterStyles";
import { cn } from "@/lib/utils";

// Gemeinsame Bausteine der Filterpanels (NEP-Maßnahmen und Marktabfrage): Kennzahlen-Kacheln,
// Chip-Gruppen, Beschriftungen, Range-Slider und Reset-Button.

export function MetricsDashboard({ gridClassName, items, label = "Kennzahlen der aktuellen Ansicht" }) {
   return (
      <section className="min-w-0 flex-1 border border-border bg-muted/75 px-3.5 py-3" aria-label={label}>
         <div
            className={
               gridClassName ??
               "grid grid-cols-3 divide-x divide-border/75 max-[380px]:grid-cols-2 max-[380px]:divide-x-0 max-[380px]:gap-y-3"
            }
         >
            {items.map(item => (
               <MetricTile key={item.label} {...item} />
            ))}
         </div>
      </section>
   );
}

export function MetricTile({ className, description, icon: Icon, label, value, suffix }) {
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

// Dropdown-Filter mit Beschriftung; von NEP-Panel (Netzansicht, Netzbetreiber) und
// Marktabfrage-Panel (Mindestleistung) gemeinsam genutzt.
export function SelectField({ className, description, label, labelAs, options, value, onChange }) {
   const selectedOption = options.find(option => option.value === value);
   const selectedLabel = selectedOption?.label ?? "";
   const labelId = useId();

   return (
      <div className={cn("grid gap-2", className)}>
         <FilterLabel as={labelAs} description={description} id={labelId} label={label} />
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

// Standardmäßig ein div (Semantik des NEP-Panels vor der Extraktion); das Marktabfrage-Panel
// setzt via as="h2" Überschriften, damit dort alle Filtergruppen (Chips, Slider, Dropdowns) für
// Screenreader gleichwertig über die Überschriften-Navigation erreichbar sind.
export function FilterLabel({ as: Component = "div", description, id, label }) {
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

export function SegmentGroup({
   description,
   label,
   options,
   value,
   onChange,
   getOptionSymbol,
   optionLayoutClassName,
   optionButtonClassName,
   optionTextClassName
}) {
   return (
      <section className={FILTER_SECTION_CLASS} aria-label={label}>
         <SegmentGroupLabel description={description} label={label} />
         <div className={optionLayoutClassName ?? DEFAULT_SEGMENT_LAYOUT_CLASS} role="group" aria-label={label}>
            {options.map(option => (
               <SegmentButton
                  active={value === option.value}
                  groupLabel={label}
                  key={option.value}
                  onChange={onChange}
                  option={option}
                  optionButtonClassName={optionButtonClassName}
                  optionTextClassName={optionTextClassName}
                  symbol={getOptionSymbol?.(option) ?? null}
               />
            ))}
         </div>
      </section>
   );
}

function SegmentButton({ active, groupLabel, option, onChange, optionButtonClassName, optionTextClassName, symbol }) {
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
         {symbol}
         <span className={cn("min-w-0", optionTextClassName ?? "truncate")}>{option.label}</span>
      </button>
   );
}

// Generischer Range-Slider mit zwei Thumbs und Live-Anzeige des gewählten Bereichs.
// tickValues beschriftet zusätzlich zu min/max auch Zwischenwerte auf der Achse — sinnvoll bei
// kleinen, festen Skalen wie dem Härtegrad; die Labels sitzen an der jeweiligen Slider-Position.
export function RangeSliderFilter({
   description,
   formatValue = String,
   label,
   labelAs,
   max,
   min,
   onValueChange,
   rangeAriaLabel,
   thumbAriaLabels,
   tickValues,
   valueFrom,
   valueTo
}) {
   const labelId = useId();
   const selectedFrom = Math.min(valueFrom, valueTo);
   const selectedTo = Math.max(valueFrom, valueTo);
   const selectedLabel =
      selectedFrom === selectedTo
         ? formatValue(selectedFrom)
         : `${formatValue(selectedFrom)} bis ${formatValue(selectedTo)}`;

   return (
      <div className="grid gap-3">
         <div className="flex min-w-0 items-center justify-between gap-3">
            <FilterLabel as={labelAs} description={description} id={labelId} label={label} />
            <output
               aria-label={rangeAriaLabel ?? `Ausgewählter Bereich ${label}`}
               aria-live="polite"
               className="shrink-0 rounded-md border border-border bg-field px-2.5 py-1 text-[0.72rem] font-medium text-card-foreground"
            >
               {selectedLabel}
            </output>
         </div>
         <Slider
            aria-labelledby={labelId}
            className="py-1"
            max={max}
            min={min}
            minStepsBetweenThumbs={0}
            onValueChange={onValueChange}
            step={1}
            thumbAriaLabels={thumbAriaLabels}
            value={[selectedFrom, selectedTo]}
         />
         {tickValues ? (
            <div aria-hidden="true" className="relative h-4 text-[0.66rem] font-medium text-muted-foreground">
               {tickValues.map(tick => (
                  <span
                     className={cn(
                        "absolute top-0",
                        tick === min && "left-0",
                        tick === max && "right-0",
                        tick !== min && tick !== max && "-translate-x-1/2"
                     )}
                     key={tick}
                     style={
                        tick === min || tick === max ? undefined : { left: `${((tick - min) / (max - min)) * 100}%` }
                     }
                  >
                     {formatValue(tick)}
                  </span>
               ))}
            </div>
         ) : (
            <div className="flex items-center justify-between text-[0.66rem] font-medium text-muted-foreground">
               <span>{formatValue(min)}</span>
               <span>{formatValue(max)}</span>
            </div>
         )}
      </div>
   );
}

export function ResetFiltersButton({ onResetFilters }) {
   return (
      <Tooltip>
         <TooltipTrigger asChild>
            <button
               aria-label={RESET_FILTERS_BUTTON_LABEL}
               className={RESET_FILTERS_BUTTON_CLASS}
               onClick={onResetFilters}
               type="button"
            >
               <RotateCcw aria-hidden="true" className="size-4" />
            </button>
         </TooltipTrigger>
         <TooltipContent side="right">{RESET_FILTERS_BUTTON_LABEL}</TooltipContent>
      </Tooltip>
   );
}
