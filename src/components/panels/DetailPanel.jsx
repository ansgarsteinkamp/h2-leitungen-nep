import { Check, ChevronDown, MapPinOff, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { HelpTooltip } from "@/components/ui/help-tooltip";
import fieldDescriptions from "@/data/fieldDescriptions.json";
import {
   boolLabel,
   cleanText,
   costLabel,
   listLabel,
   numberLabel,
   pipelineMeta,
   pipelineTitle
} from "@/lib/domain/formatters";
import { getUmstellungOderNeubau, isVerdichterstandortFeature } from "@/lib/domain/pipeline";

const DATE_FORMAT = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const EMPTY_VALUE = "keine Angabe";
const SCENARIO_FIELDS = ["szenario1", "szenario2", "szenario3"];
const LOCAL_FIELD_DESCRIPTIONS = {
   nepEinordnung: {
      label: "Einordnung",
      description:
         "Leitet die fachliche Einordnung im überarbeiteten NEP-Entwurf aus Startnetz, Netzausbauvorschlag und Modellierungsergebnissen ab."
   }
};

// Felder, deren Zeile ausgeblendet wird, wenn keine Angabe vorliegt: sie existieren nur für
// bestimmte Maßnahmenarten und wären sonst überall sichtbares Rauschen.
const OPTIONAL_FIELDS = new Set([
   "anlagenleistungM3h",
   "dnMm",
   "dpBar",
   "ibnJahre",
   "inbetriebnahmeBisWerte",
   "inbetriebnahmeNachKernnetzgenehmigung",
   "inbetriebnahmeNachKernnetzgenehmigungWerte",
   "kernnetzAntragsIds",
   "kostenermittlung",
   "laengeKm",
   "officialIds",
   "umstellungOderNeubau",
   "verdichterleistungMw"
]);

const DETAIL_GROUPS = [
   {
      id: "basis",
      title: "Stammdaten, Status und Kennungen",
      fields: [
         "id",
         "officialIds",
         "kurzel",
         "version",
         "massnahmenart",
         "umstellungOderNeubau",
         "projektstatus",
         "kernnetzAntragsId",
         "entsogTyndpProjektNr"
      ]
   },
   {
      id: "nep",
      title: "Einordnung im NEP",
      fields: ["nepEinordnung", "startnetz", "netzausbauvorschlag"]
   },
   {
      id: "szenarien",
      title: "Modellierungsergebnisse 2037",
      fields: ["szenario1", "szenario2", "szenario3"]
   },
   {
      id: "zeitplan",
      title: "Zeitplan",
      fields: ["ibnJahr", "ibnJahre", "inbetriebnahmeBis", "inbetriebnahmeNachKernnetzgenehmigung"]
   },
   {
      id: "technik",
      title: "Technische Kenndaten und Lage",
      fields: ["laengeKm", "dnMm", "dpBar", "verdichterleistungMw", "anlagenleistungM3h", "bundeslaender"]
   },
   {
      id: "wirtschaft",
      title: "Bedarfsabdeckung und Maßnahmenkosten",
      fields: ["bedarfsabdeckung", "kostenMioEur", "kostenermittlung", "erdgasverstaerkendeMassnahmen"]
   },
   {
      id: "beteiligte",
      title: "Beteiligte",
      fields: ["durchfuehrendeNetzbetreiber", "ansprechpartner", "ogeBeteiligung"]
   },
   {
      id: "hinweise",
      title: "Beschreibung und Hinweise",
      fields: ["beschreibung", "sonstiges"]
   }
];

// Verdichterstandorte: das Parent-Feature trägt fast nur Aggregate der Einzelmaßnahmen.
// In der Detailansicht zeigt der Standort-Block deshalb nur echte Standort-Informationen;
// alles Maßnahmenspezifische (inkl. NEP-Einordnung, Szenarien, Kernnetz-IDs) steht in den
// aufklappbaren Maßnahmenkarten.
const SITE_DETAIL_GROUPS = [
   {
      id: "standort",
      title: "Standort",
      fields: ["standortName", "bundeslaender"]
   },
   {
      id: "beteiligte",
      title: "Beteiligte",
      fields: ["durchfuehrendeNetzbetreiber", "ansprechpartner", "ogeBeteiligung"]
   },
   {
      id: "hinweise",
      title: "Beschreibung und Hinweise",
      fields: ["beschreibung", "sonstiges"]
   }
];

// Feldauswahl für die aufklappbaren Einzelmaßnahmen eines Verdichterstandorts.
const NESTED_MEASURE_FIELDS = [
   "nepEinordnung",
   "szenario1",
   "szenario2",
   "szenario3",
   "umstellungOderNeubau",
   "ibnJahr",
   "inbetriebnahmeBis",
   "inbetriebnahmeNachKernnetzgenehmigung",
   "verdichterleistungMw",
   "kostenMioEur",
   "kostenermittlung",
   "kernnetzAntragsId",
   "durchfuehrendeNetzbetreiber",
   "ansprechpartner",
   "projektstatus",
   "beschreibung",
   "bedarfsabdeckung"
];

// Kurzlabels für die Kopfzeile einer eingeklappten Maßnahmenkarte.
const SHORT_NEP_LABELS = {
   Startnetzmaßnahme: "Startnetz",
   "Teil des Netzausbauvorschlags": "Netzausbauvorschlag",
   "Nur in Modellierungsergebnissen 2037": "Nur Modellierung 2037"
};

function isEmptyValue(value) {
   return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
   );
}

function formatGermanDate(value) {
   if (isEmptyValue(value)) return EMPTY_VALUE;

   const [year, month, day] = String(value).split("-").map(Number);
   if (!year || !month || !day) return cleanText(value);

   return DATE_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

function formatValue(key, value) {
   if (isEmptyValue(value)) return EMPTY_VALUE;
   if (fieldDescriptions[key]?.type === "date") return formatGermanDate(value);
   if (key === "inbetriebnahmeBisWerte" || key === "inbetriebnahmeNachKernnetzgenehmigungWerte") {
      return value.map(formatGermanDate).join(", ");
   }
   if (Array.isArray(value)) return listLabel(value);
   if (key === "laengeKm") return numberLabel(value, "km");
   if (key === "dnMm") return numberLabel(value, "mm");
   if (key === "dpBar") return numberLabel(value, "bar");
   if (key === "verdichterleistungMw") return numberLabel(value, "MW");
   if (key === "anlagenleistungM3h") return numberLabel(value, "m³/h");
   if (key === "kostenMioEur") return costLabel(value);
   return cleanText(value);
}

function getNepClassification(props) {
   if (props.startnetz === true) return "Startnetzmaßnahme";
   if (props.netzausbauvorschlag === true) return "Teil des Netzausbauvorschlags";
   if (SCENARIO_FIELDS.some(field => props[field] === true)) return "Nur in Modellierungsergebnissen 2037";
   return EMPTY_VALUE;
}

function BooleanValue({ value }) {
   const label = boolLabel(value);
   const Icon = value ? Check : X;

   return (
      <span
         aria-label={label}
         className={value ? "inline-flex text-primary" : "inline-flex text-muted-foreground"}
         role="img"
      >
         <Icon aria-hidden="true" className="size-4" />
      </span>
   );
}

function shouldHideField(field, value) {
   return OPTIONAL_FIELDS.has(field) && isEmptyValue(value);
}

function DetailRow({ field, value }) {
   const meta = LOCAL_FIELD_DESCRIPTIONS[field] ?? fieldDescriptions[field] ?? { label: field };

   return (
      <div className="grid min-h-9 grid-cols-[minmax(8.5rem,0.42fr)_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border/45 py-2.5 text-xs @max-[430px]:grid-cols-1">
         <dt className="flex min-w-0 items-center gap-1.5 wrap-break-word text-muted-foreground">
            <span>{meta.label}</span>
            <HelpTooltip contentClassName="max-w-80" label={meta.label ?? field} side="left" sideOffset={6}>
               {meta.description}
            </HelpTooltip>
         </dt>
         <dd className="m-0 min-w-0 font-normal wrap-break-word text-card-foreground">
            {typeof value === "boolean" ? <BooleanValue value={value} /> : formatValue(field, value)}
         </dd>
      </div>
   );
}

export default function DetailPanel({ focusedSelectionRef, selection, onClose }) {
   const panelRef = useRef(null);

   // Fokussiert das Panel nur bei einer neuen Auswahl. Ohne den (über Moduswechsel hinweg
   // stabilen) Merker würde ein bloßer Datensatz-Wechsel mit erhaltener Auswahl den Fokus vom
   // Umschalter in das neu gemountete Panel reißen.
   useEffect(() => {
      if (!selection) return;
      const selectionId = selection.item.properties.id;
      if (focusedSelectionRef?.current === selectionId) return;
      if (focusedSelectionRef) focusedSelectionRef.current = selectionId;
      panelRef.current?.focus();
   }, [focusedSelectionRef, selection]);

   if (!selection) return null;

   const feature = selection.item;
   const props = feature.properties;
   const isSite = isVerdichterstandortFeature(feature);
   const nestedMeasures = isSite ? (props.massnahmen ?? []) : [];
   const detailGroups = isSite ? SITE_DETAIL_GROUPS : DETAIL_GROUPS;
   const detailValues = {
      ...props,
      nepEinordnung: getNepClassification(props),
      umstellungOderNeubau: getUmstellungOderNeubau(props),
      // Eine einzelne officialId wiederholt nur die Feature-ID; angezeigt wird die Liste erst,
      // wenn ein Feature mehrere offizielle Maßnahmen bündelt.
      officialIds: Array.isArray(props.officialIds) && props.officialIds.length > 1 ? props.officialIds : null,
      // Der Standortname wiederholt meist den Feature-Namen aus der Kopfzeile.
      standortName: props.standortName !== props.name ? props.standortName : null
   };
   const metaLabel = isSite
      ? `Verdichterstandort · ${nestedMeasures.length === 1 ? "1 Maßnahme" : `${nestedMeasures.length} Maßnahmen`}`
      : pipelineMeta(feature);

   return (
      <section
         aria-labelledby="selection-panel-title"
         className="@container h-full max-h-full overflow-auto border border-border/60 bg-muted/55 p-4 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
         ref={panelRef}
         tabIndex={-1}
      >
         <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="grid min-w-0 gap-1">
               <p className="m-0 text-[0.72rem] font-medium text-label-accent uppercase">{metaLabel}</p>
               <h2 id="selection-panel-title" className="m-0 text-sm leading-snug font-medium text-card-foreground">
                  {pipelineTitle(feature)}
               </h2>
            </div>
            <button
               aria-label="Auswahl schließen"
               className="grid size-8 flex-none place-items-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:border-primary/70 hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
               onClick={onClose}
               type="button"
            >
               <X aria-hidden="true" className="size-4" />
            </button>
         </div>
         <MissingGeometryHint geometrieStatus={props.geometrieStatus} />
         <div className="mt-4 grid gap-5">
            {isSite ? <SiteSummary measureCount={nestedMeasures.length} props={props} /> : null}
            {detailGroups.map(group => {
               const fields = group.fields.filter(
                  field =>
                     !shouldHideField(field, detailValues[field]) && !(isSite && isEmptyValue(detailValues[field]))
               );
               if (fields.length === 0) return null;

               return (
                  <section aria-labelledby={`detail-group-${group.id}`} className="grid gap-2.5" key={group.id}>
                     <h3
                        id={`detail-group-${group.id}`}
                        className="m-0 text-[0.7rem] font-medium text-label-accent uppercase"
                     >
                        {group.title}
                     </h3>
                     <dl className="grid border-t border-border/50">
                        {fields.map(field => (
                           <DetailRow field={field} key={field} value={detailValues[field]} />
                        ))}
                     </dl>
                  </section>
               );
            })}
            {nestedMeasures.length > 0 ? (
               <section aria-labelledby="detail-group-massnahmen" className="grid gap-2.5">
                  <h3
                     id="detail-group-massnahmen"
                     className="m-0 text-[0.7rem] font-medium text-label-accent uppercase"
                  >
                     Maßnahmen am Standort ({nestedMeasures.length})
                  </h3>
                  <div className="grid gap-2.5">
                     {nestedMeasures.map(measure => (
                        <MeasureCard
                           defaultOpen={nestedMeasures.length === 1}
                           key={measure.id}
                           measure={measure}
                           siteName={props.name}
                        />
                     ))}
                  </div>
               </section>
            ) : null}
         </div>
      </section>
   );
}

// Features ohne Kartengeometrie ("fehlt": noch unverortet, "aggregiert": übergreifende Maßnahme
// ohne einzelnen Standort) bekommen statt einer Detailzeile einen Hinweis unter der Kopfzeile.
const GEOMETRY_HINTS = {
   fehlt: "Diese Maßnahme ist aktuell nicht auf der Karte verortet und erscheint nur in Suche und Detailansicht.",
   aggregiert:
      "Diese übergreifende Maßnahme ist keinem einzelnen Standort zugeordnet und erscheint nur in Suche und Detailansicht."
};

function MissingGeometryHint({ geometrieStatus }) {
   const hint = GEOMETRY_HINTS[geometrieStatus];
   if (!hint) return null;

   return (
      <p className="m-0 mt-3 flex items-start gap-2 border border-border/70 bg-muted/60 px-3 py-2 text-xs leading-snug text-muted-foreground">
         <MapPinOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
         <span>{hint}</span>
      </p>
   );
}

function SiteSummary({ measureCount, props }) {
   const ibnYears = Array.isArray(props.ibnJahre) && props.ibnJahre.length > 0 ? props.ibnJahre.join(" / ") : null;
   const items = [
      { label: "Maßnahmen", value: String(measureCount) },
      { label: ibnYears && ibnYears.includes("/") ? "IBN-Jahre" : "IBN-Jahr", value: ibnYears ?? EMPTY_VALUE },
      { label: "Leistung gesamt", value: numberLabel(props.verdichterleistungMw, "MW") },
      { label: "Kosten gesamt", value: costLabel(props.kostenMioEur) }
   ];

   return (
      <section
         aria-label="Zusammenfassung des Standorts"
         className="grid grid-cols-2 gap-px border border-border bg-border/60"
      >
         {items.map(item => (
            <div className="bg-muted/75 px-3 py-2" key={item.label}>
               <p className="m-0 truncate text-[0.62rem] font-medium text-muted-foreground">{item.label}</p>
               <p className="m-0 mt-0.5 text-xs font-medium wrap-break-word text-card-foreground">{item.value}</p>
            </div>
         ))}
      </section>
   );
}

function measureSummaryLabel(values) {
   return [
      SHORT_NEP_LABELS[values.nepEinordnung] ?? null,
      values.ibnJahr ? `IBN ${values.ibnJahr}` : null,
      isEmptyValue(values.verdichterleistungMw) ? null : numberLabel(values.verdichterleistungMw, "MW"),
      isEmptyValue(values.kostenMioEur) ? null : costLabel(values.kostenMioEur)
   ]
      .filter(Boolean)
      .join(" · ");
}

function MeasureCard({ defaultOpen = false, measure, siteName }) {
   const values = {
      ...measure,
      nepEinordnung: getNepClassification(measure),
      umstellungOderNeubau: getUmstellungOderNeubau(measure)
   };
   const fields = NESTED_MEASURE_FIELDS.filter(field => !isEmptyValue(values[field]));

   return (
      <details className="group border border-border/60 bg-muted/40" open={defaultOpen}>
         <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <div className="grid min-w-0 flex-1 gap-0.5">
               <p className="m-0 text-[0.7rem] font-medium text-label-accent">{measure.id}</p>
               {measure.name && measure.name !== siteName ? (
                  <p className="m-0 text-xs leading-snug font-medium text-card-foreground">{measure.name}</p>
               ) : null}
               <p className="m-0 text-[0.7rem] leading-snug text-muted-foreground">{measureSummaryLabel(values)}</p>
            </div>
            <ChevronDown
               aria-hidden="true"
               className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            />
         </summary>
         <dl className="mx-3 mb-1 grid border-t border-border/50">
            {fields.map(field => (
               <DetailRow field={field} key={field} value={values[field]} />
            ))}
         </dl>
      </details>
   );
}
