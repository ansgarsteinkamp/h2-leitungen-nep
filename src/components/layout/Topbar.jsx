import ThemeToggle from "@/components/theme/ThemeToggle";
import { DATENSATZ_MARKTABFRAGE, DATENSATZ_NEP } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

const DATENSATZ_OPTIONS = [
   { value: DATENSATZ_NEP, label: "NEP 2025" },
   { value: DATENSATZ_MARKTABFRAGE, label: "Marktabfrage 2026" }
];

const TITLES = {
   [DATENSATZ_NEP]: {
      kicker: "Zweiter Entwurf des NEP Gas und Wasserstoff 2025",
      heading: "Interaktive Karte der H₂-Maßnahmen"
   },
   [DATENSATZ_MARKTABFRAGE]: {
      kicker: "Marktabfrage Wasserstoff und Strom 2026 Qualitätssicherung",
      heading: "Interaktive Karte der H₂-Projekte und PtG-Anlagen"
   }
};

const SWITCH_BUTTON_CLASS =
   "inline-flex min-h-8 items-center justify-center rounded-sm px-3 py-1 text-[0.72rem] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/12 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50";
const ACTIVE_SWITCH_BUTTON_CLASS =
   "bg-primary/20 text-card-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_42%,transparent)]";

function DatensatzSwitch({ onChange, value }) {
   return (
      <div
         aria-label="Datensatz"
         className="flex w-fit gap-0.5 rounded-md border border-border bg-muted/75 p-1"
         role="group"
      >
         {DATENSATZ_OPTIONS.map(option => (
            <button
               aria-pressed={value === option.value}
               className={cn(SWITCH_BUTTON_CLASS, value === option.value && ACTIVE_SWITCH_BUTTON_CLASS)}
               key={option.value}
               onClick={() => onChange(option.value)}
               type="button"
            >
               {option.label}
            </button>
         ))}
      </div>
   );
}

export default function Topbar({ datensatz = DATENSATZ_NEP, onDatensatzChange, showDatensatzSwitch = false }) {
   const titles = TITLES[datensatz] ?? TITLES[DATENSATZ_NEP];

   return (
      <header className="mx-auto mb-4 flex max-w-440 items-center justify-between gap-3 max-lg:flex-wrap max-xs:flex-col max-xs:justify-center">
         <div className="min-w-0 max-xs:order-2 max-xs:text-center">
            <p className="m-0 text-[0.72rem] font-medium tracking-normal text-label-accent">{titles.kicker}</p>
            <h1 className="m-0 text-base leading-tight font-medium text-card-foreground 3xs:text-lg xs:text-2xl">
               {titles.heading}
            </h1>
         </div>
         <div className="flex items-center gap-3 max-xs:order-1 max-xs:flex-col max-xs:self-center">
            {showDatensatzSwitch ? <DatensatzSwitch onChange={onDatensatzChange} value={datensatz} /> : null}
            <ThemeToggle />
         </div>
      </header>
   );
}
