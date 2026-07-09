// Gemeinsame Layoutklassen und Optionsgruppen-Presets der Filterpanels (NEP und Marktabfrage).

export const FILTER_PANEL_CLASS =
   "flex min-h-0 flex-col gap-4 overflow-auto focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
export const FILTER_GROUP_CLASS =
   "flex min-h-0 flex-1 flex-col gap-4 overflow-auto border border-border bg-muted/75 p-4";
export const FILTER_SECTION_CLASS = "flex flex-col gap-2.5 border-t border-border/80 pt-4 first:border-t-0 first:pt-0";
export const FILTER_LABEL_CLASS =
   "flex min-w-0 items-center gap-1.5 text-xs leading-snug font-medium text-card-foreground";
export const SEGMENT_BUTTON_CLASS =
   "inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 text-[0.72rem] text-foreground transition-colors hover:border-primary/70 hover:bg-primary/20 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none max-lg:min-h-10 dark:focus-visible:ring-ring/50";
export const ACTIVE_SEGMENT_BUTTON_CLASS = "border-primary/80 bg-primary/15 text-card-foreground";
export const RESET_FILTERS_BUTTON_CLASS =
   "grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
export const RESET_FILTERS_BUTTON_LABEL = "Filter und Karte zurücksetzen";
export const DEFAULT_SEGMENT_LAYOUT_CLASS = "grid grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))] gap-2";
const WRAPPING_CHIP_SEGMENT_PROPS = {
   optionButtonClassName: "w-fit max-w-full shrink-0",
   optionLayoutClassName: "flex flex-wrap items-start gap-2",
   optionTextClassName: "whitespace-nowrap"
};

export function createChipSegmentGroup(group) {
   return {
      ...WRAPPING_CHIP_SEGMENT_PROPS,
      ...group
   };
}
