import { Factory, Gauge, Zap } from "lucide-react";

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
import { ProjektKategorieSymbol } from "@/components/ui/projekt-kategorie-symbol";
import { ALL_VALUE } from "@/lib/domain/constants";
import {
   HAERTEGRAD_MAX_STUFE,
   HAERTEGRAD_MIN_STUFE,
   LEISTUNG_REFERENZJAHR,
   PROJEKT_TYP_PTG,
   haertegradStufeLabel
} from "@/lib/domain/marktabfrage";
import { metricIntegerLabel } from "@/lib/domain/formatters";
import { cn } from "@/lib/utils";

const PROJEKT_TYP_DESCRIPTION =
   "Filtert nach der Herkunft der Meldung: H₂-Projekte stammen aus der Marktabfrage Wasserstoff der FNB und Wasserstoffnetzbetreiber, PtG-Anlagen (Elektrolyseure) aus der Marktabfrage Strom der Übertragungsnetzbetreiber.";
const KATEGORIE_DESCRIPTION =
   "Fachliche Kategorie der Meldung: Exit (Ausspeisung, H₂-Bedarf), Entry (Einspeisung, H₂-Aufkommen) oder Speicher. PtG-Anlagen zählen fachlich als Entry.";
const NETZ_DESCRIPTION =
   "Netz, dem das H₂-Projekt in der Marktabfrage zugeordnet ist: Fernleitungsnetz (FNB) oder Verteilnetz (VNB). PtG-Anlagen tragen keine Netzzuordnung; beim Einschränken springt der Projekttyp deshalb auf H₂-Projekte um.";
const MIN_LEISTUNG_DESCRIPTION =
   "Blendet kleine Meldungen aus: Sichtbar bleiben Projekte und Anlagen, deren gemeldete H₂-Leistung in mindestens einem Stützjahr der Zeitreihe den Schwellwert erreicht (je Kategorie die fachlich passende Reihe: Ausspeiseleistung bei Ausspeisungen und Speichern, Einspeiseleistung bei Einspeisungen und PtG-Anlagen).";
const JAHR_DESCRIPTION =
   "Filtert nach dem gemeldeten Jahr der Inbetriebnahme (bei PtG-Anlagen: initiale Inbetriebnahme). Das Jahr ist ein Planwert der Meldenden, kein zugesichertes Inbetriebnahmedatum.";
const METRIC_WASSERSTOFF_DESCRIPTION =
   "Anzahl der H₂-Projekte aus der Marktabfrage Wasserstoff, die den aktiven Filtern und der Suche entsprechen.";
const METRIC_PTG_DESCRIPTION =
   "Anzahl der PtG-Anlagen aus der Marktabfrage Strom, die den aktiven Filtern und der Suche entsprechen.";
const METRIC_LEISTUNG_DESCRIPTION = `Summe der gemeldeten H₂-Leistung im Jahr ${LEISTUNG_REFERENZJAHR} über die aktuelle Auswahl. Je Kategorie zählt die fachlich passende Zeitreihe: Ausspeiseleistung bei Ausspeisungen und Speichern, Einspeiseleistung bei Einspeisungen und PtG-Anlagen. Projekte ohne Wert im Jahr ${LEISTUNG_REFERENZJAHR} (z. B. spätere Inbetriebnahme) tragen nicht bei.`;

// Alle vier Härtegrad-Stufen als Achsenbeschriftung: Die Skala ist klein und fest, da lohnt
// sich die vollständige Beschriftung (anders als beim datenabhängigen Jahresbereich).
const HAERTEGRAD_STUFEN_TICKS = Array.from(
   { length: HAERTEGRAD_MAX_STUFE - HAERTEGRAD_MIN_STUFE + 1 },
   (_, index) => HAERTEGRAD_MIN_STUFE + index
);

function HaertegradDescription() {
   return (
      <span className="grid gap-1">
         <span>Prognose des Härtegrads (Eintrittswahrscheinlichkeit) nach gaswirtschaftlicher Sorgfaltspflicht.</span>
         <span className="grid">
            <span>HG 3: möglich</span>
            <span>HG 2: wahrscheinlich (größer als 50%)</span>
            <span>HG 1: sehr wahrscheinlich (ca. 80%)</span>
            <span>HG 0: gesichert (ca. 100%)</span>
         </span>
         <span>
            PtG-Anlagen haben keinen Härtegrad. Steht der Projekttyp auf „Alle“ und wird der Bereich eingeschränkt,
            springt er deshalb auf H₂-Projekte um; wer danach wieder „Alle“ wählt, sieht PtG-Anlagen unabhängig vom
            Härtegrad.
         </span>
      </span>
   );
}

// Einzeiliges Grid wie im NEP-Modus; damit das passt, trägt die erste Kachel das Kurzlabel
// „Projekte“ (der Tooltip nennt den vollen Begriff H₂-Projekte). Leistungs- und PtG-Spalte
// bekommen Auto-Breite, damit ihre Labels nicht abgeschnitten werden; die erste Kachel hat
// mit ihrem Kurzlabel genug Reserve. Unter 380 px bricht das Grid wie im NEP-Modus auf zwei
// Spalten um, die breiteste Kachel (Leistung) bekommt dort die volle Breite.
const METRICS_GRID_CLASS =
   "grid grid-cols-[1fr_auto_auto] divide-x divide-border/75 max-[380px]:grid-cols-2 max-[380px]:divide-x-0 max-[380px]:gap-y-3";

function buildMetricItems(metrics) {
   const leistungInGw = Math.abs(metrics.leistungMw) >= 1000;

   return [
      {
         description: METRIC_WASSERSTOFF_DESCRIPTION,
         icon: Factory,
         label: "Projekte",
         value: metricIntegerLabel(metrics.wasserstoffCount)
      },
      {
         description: METRIC_PTG_DESCRIPTION,
         icon: Zap,
         label: "PtG-Anlagen",
         value: metricIntegerLabel(metrics.ptgCount)
      },
      {
         className: "max-[380px]:col-span-2",
         description: METRIC_LEISTUNG_DESCRIPTION,
         icon: Gauge,
         label: `Leistung ${LEISTUNG_REFERENZJAHR}`,
         value: leistungInGw
            ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(metrics.leistungMw / 1000)
            : metricIntegerLabel(Math.round(metrics.leistungMw)),
         suffix: leistungInGw ? "GW" : "MW"
      }
   ];
}

function KategorieSymbol({ kategorie }) {
   return <ProjektKategorieSymbol className="size-3 shrink-0" kategorie={kategorie} />;
}

// Label wie im NEP-Modus ("Inbetriebnahmejahr"), damit beide Panels denselben Begriff führen.
// Alle Filterbeschriftungen dieses Panels sind h2-Überschriften, damit die Filtergruppen für
// Screenreader gleichwertig über die Überschriften-Navigation erreichbar sind.
function JahrRangeFilter({ filters, jahrBounds, setJahrRange }) {
   if (!jahrBounds) {
      return (
         <div className="grid gap-2">
            <FilterLabel as="h2" description={JAHR_DESCRIPTION} label="Inbetriebnahmejahr" />
            <p className="text-xs text-muted-foreground">Keine Jahresangaben verfügbar</p>
         </div>
      );
   }

   if (jahrBounds.min === jahrBounds.max) {
      return (
         <div className="grid gap-2">
            <FilterLabel as="h2" description={JAHR_DESCRIPTION} label="Inbetriebnahmejahr" />
            <p className="text-xs text-muted-foreground">{`Alle Projekte: Inbetriebnahme ${jahrBounds.min}`}</p>
         </div>
      );
   }

   const jahrVon = Number.isFinite(Number(filters.jahrVon)) ? Number(filters.jahrVon) : jahrBounds.min;
   const jahrBis = Number.isFinite(Number(filters.jahrBis)) ? Number(filters.jahrBis) : jahrBounds.max;

   return (
      <RangeSliderFilter
         description={JAHR_DESCRIPTION}
         label="Inbetriebnahmejahr"
         labelAs="h2"
         max={jahrBounds.max}
         min={jahrBounds.min}
         onValueChange={setJahrRange}
         rangeAriaLabel="Ausgewählter Bereich Inbetriebnahmejahr"
         thumbAriaLabels={["Inbetriebnahmejahr von", "Inbetriebnahmejahr bis"]}
         valueFrom={jahrVon}
         valueTo={jahrBis}
      />
   );
}

function MarktabfrageFilterControls({
   filters,
   hatWasserstoffProjekte,
   jahrBounds,
   options,
   setFilter,
   setHaertegradRange,
   setJahrRange
}) {
   const isPtgSelected = filters.typ === PROJEKT_TYP_PTG;
   const segmentGroups = [
      createChipSegmentGroup({
         description: PROJEKT_TYP_DESCRIPTION,
         filterKey: "typ",
         label: "Projekttyp",
         options: options.projektTypOptions,
         value: filters.typ
      })
   ];

   // Bei PtG-Anlagen sind Kategorie (implizit Einspeisung), Netz (keine Angabe) und Härtegrad
   // nicht definiert; die Filter werden ausgeblendet statt mit wirkungslosen Optionen zu verwirren.
   if (!isPtgSelected) {
      segmentGroups.push(
         createChipSegmentGroup({
            description: KATEGORIE_DESCRIPTION,
            filterKey: "kategorie",
            getOptionSymbol: option =>
               option.value === ALL_VALUE ? null : <KategorieSymbol kategorie={option.value} />,
            label: "Kategorie",
            options: options.kategorieOptions,
            value: filters.kategorie
         })
      );
      // Der Netz-Filter beschreibt nur H₂-Projekte; ohne solche im Datensatz würde er (samt
      // Auto-Umschalten auf H₂-Projekte) garantiert leere Ergebnisse erzeugen — wie beim
      // Härtegrad-Slider wird er dann ausgeblendet.
      if (hatWasserstoffProjekte) {
         segmentGroups.push(
            createChipSegmentGroup({
               description: NETZ_DESCRIPTION,
               filterKey: "netz",
               label: "Netz",
               options: options.netzOptions,
               value: filters.netz
            })
         );
      }
   }

   return (
      <div className={FILTER_GROUP_CLASS}>
         {segmentGroups.map(({ filterKey, ...group }) => (
            <SegmentGroup key={filterKey} onChange={value => setFilter(filterKey, value)} {...group} />
         ))}

         <section className={FILTER_SECTION_CLASS} aria-label="Inbetriebnahmejahr">
            <JahrRangeFilter filters={filters} jahrBounds={jahrBounds} setJahrRange={setJahrRange} />
         </section>

         {!isPtgSelected && hatWasserstoffProjekte ? (
            <section className={FILTER_SECTION_CLASS} aria-label="Härtegrad">
               <RangeSliderFilter
                  description={<HaertegradDescription />}
                  formatValue={haertegradStufeLabel}
                  label="Härtegrad"
                  labelAs="h2"
                  max={HAERTEGRAD_MAX_STUFE}
                  min={HAERTEGRAD_MIN_STUFE}
                  onValueChange={setHaertegradRange}
                  rangeAriaLabel="Ausgewählter Bereich Härtegrad"
                  thumbAriaLabels={["Härtegrad von", "Härtegrad bis"]}
                  tickValues={HAERTEGRAD_STUFEN_TICKS}
                  valueFrom={filters.haertegradVon}
                  valueTo={filters.haertegradBis}
               />
            </section>
         ) : null}

         <section className={FILTER_SECTION_CLASS} aria-label="Mindestleistung">
            <SelectField
               description={MIN_LEISTUNG_DESCRIPTION}
               label="Mindestleistung"
               labelAs="h2"
               onChange={value => setFilter("minLeistungMw", value)}
               options={options.minLeistungOptions}
               value={filters.minLeistungMw}
            />
         </section>
      </div>
   );
}

const TYP_AUTO_SWITCH_MESSAGES = {
   haertegrad: "Projekttyp automatisch auf H₂-Projekte umgestellt, da PtG-Anlagen keinen Härtegrad haben.",
   netz: "Projekttyp automatisch auf H₂-Projekte umgestellt, da PtG-Anlagen keine Netzzuordnung haben."
};

export default function MarktabfrageFilterPanel({
   className,
   filters,
   hatWasserstoffProjekte,
   jahrBounds,
   kategorieOptions,
   metrics,
   minLeistungOptions,
   netzOptions,
   onResetFilters,
   projektTypOptions,
   setFilter,
   setHaertegradRange,
   setJahrRange,
   typAutoSwitchGrund = null
}) {
   return (
      <aside
         aria-label="Kennzahlen und Filter"
         className={cn(FILTER_PANEL_CLASS, className)}
         id="filter-panel"
         tabIndex={-1}
      >
         {/* Kündigt das automatische Umspringen des Projekttyps (Härtegrad- oder Netz-Filter)
             für Screenreader an; visuell ist es am Projekttyp-Filter sichtbar. */}
         <span aria-label="Hinweis zum Projekttyp-Filter" className="sr-only" role="status">
            {TYP_AUTO_SWITCH_MESSAGES[typAutoSwitchGrund] ?? ""}
         </span>
         <div className="flex items-center gap-3">
            <MetricsDashboard gridClassName={METRICS_GRID_CLASS} items={buildMetricItems(metrics)} />
            <ResetFiltersButton onResetFilters={onResetFilters} />
         </div>
         <MarktabfrageFilterControls
            filters={filters}
            hatWasserstoffProjekte={hatWasserstoffProjekte}
            jahrBounds={jahrBounds}
            options={{ kategorieOptions, minLeistungOptions, netzOptions, projektTypOptions }}
            setFilter={setFilter}
            setHaertegradRange={setHaertegradRange}
            setJahrRange={setJahrRange}
         />
      </aside>
   );
}
