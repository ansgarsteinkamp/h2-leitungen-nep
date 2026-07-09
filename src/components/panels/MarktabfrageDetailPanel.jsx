import { Check, MapPinOff, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { isPtgAnlage, getMarktabfrageAttribute, getMarktabfrageZeitreihen } from "@/lib/domain/marktabfrage";
import { projektMeta, projektTitle } from "@/lib/domain/marktabfrageFormatters";

const NUMBER_FORMAT = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

// Gruppierung der Marktabfrage-Attribute für die Detailansicht. Nicht gelistete Attribute landen
// automatisch in "Weitere Angaben", damit neue Felder der Quelldatei nie verloren gehen.
const WASSERSTOFF_DETAIL_GROUPS = [
   {
      id: "projekt",
      title: "Projekt",
      fields: [
         "projektnummer",
         "datenbankId",
         "qsPruefungBestanden",
         "projektstatus",
         "haertegrad",
         "kommentarZumHaertegrad",
         "fid",
         "kategorie",
         "sektorDerAusspeisung",
         "sektorIndustrieIndustriebranche",
         "sektorIndustrieDerivatErzeugt",
         "h2Reinheit",
         "gemeldetInDerLetztenMarktabfrage",
         "idInDerLetztenMarktabfrage"
      ]
   },
   {
      id: "kraftwerk",
      title: "Kraftwerk",
      fields: [
         "sektorKraftwerkKraftwerkstyp",
         "technologieDesKraftwerks",
         "kraftwerkImMaStREnthalten",
         "mastrNr",
         "statusAntragKraftNAV",
         "anschlussnetzbetreiberStrom",
         "regelzoneDerUeNB",
         "industriekraftwerkZurEigenversorgung",
         "elektrLeistungDesKraftwerksNettoInMW",
         "elektrLeistungDesKraftwerksBruttoInMW",
         "technMindestleistungDesKraftwerksNettoInMW",
         "waermeleistungDesKraftwerksInMW",
         "kraftwerkDerOeffentlWaermeversorgung"
      ]
   },
   {
      id: "standort",
      title: "Standort",
      fields: ["strasseUndHausnummer", "plz", "ort", "bundesland", "landkreisSchluessel", "landkreisName"]
   },
   {
      id: "netzanschluss",
      title: "Netz und Anschluss",
      fields: [
         "netz",
         "ausspeisezoneNetzkopplungspunktName",
         "ausspeisezoneNetzkopplungspunktFNB",
         "ausspeisezoneNetzkopplungspunktVNB",
         "ergaenzendeAngabenZuNKPUndFNBWTNB",
         "grosskundeNetzanschlussnehmer",
         "anschlussanfrageBereitsGestellt",
         "anschlussanfrageFNB",
         "anschlussanfrageWasserstoffnetzbetreiber"
      ]
   },
   {
      id: "zeitplan",
      title: "Zeitplan",
      fields: ["monatDerInbetriebnahme", "jahrDerInbetriebnahme"]
   },
   {
      id: "foerderung",
      title: "Förderung",
      fields: [
         "foerderantragPCIGestellt",
         "foerderantragIPCEIGestellt",
         "foerderantragReallaborGestellt",
         "foerderantragKlimaschutzvGestellt",
         "sonstigerFoerderantrag"
      ]
   },
   {
      id: "beschreibung",
      title: "Beschreibung",
      fields: ["beschreibungDesH2Aufkommens", "projektbeschreibung"]
   },
   {
      id: "veroeffentlichung",
      title: "Veröffentlichung",
      fields: [
         "zustimmungZurVeroeffentlichung",
         "anonymisierungProjektname",
         "anonymisierungGrosskunde",
         "anonymisierungFoerderantraege"
      ]
   }
];

const PTG_DETAIL_GROUPS = [
   {
      id: "anlage",
      title: "Anlage",
      fields: [
         "datenbankId",
         "anlagenbetreiber",
         "sektorDesAnlagenbetreibers",
         "weitereBeteiligteUnternehmen",
         "anlagentyp",
         "fid",
         "h2Reinheit",
         "teilverbrauchDesH2VorOrt",
         "offshoreElektrolyse"
      ]
   },
   {
      id: "standort",
      title: "Standort",
      fields: ["plz"]
   },
   {
      id: "zeitplan",
      title: "Zeitplan",
      fields: ["initialeInbetriebnahme", "endausbau", "ausserbetriebnahme"]
   },
   {
      id: "strom",
      title: "Strom",
      fields: [
         "potenziellerStromnetzbetreiber",
         "anvisierteSpannungsebene",
         "netzanschlussantragGestellt",
         "direktanschlussAnStromerzeugungsanlage",
         "artDerStromerzeugung",
         "leistungDerErzeugungsanlageInMW",
         "vorgabenNachParagraf310fEnWGErfuellt",
         "projektstatusStrom"
      ]
   },
   {
      id: "wasserstoff",
      title: "Wasserstoff",
      fields: [
         "anschlussanfrageBereitsGestellt",
         "anschlussanfrageFernleitungsnetzbetreiber",
         "anschlussanfrageVNBSonstige",
         "projektstatusWasserstoff"
      ]
   },
   {
      id: "waerme",
      title: "Wärme",
      fields: [
         "auskopplungVonWaermeleistung",
         "potenziellesWaermenetz",
         "vorlauftemperaturInGradC",
         "ruecklauftemperaturInGradC",
         "projektstatusWaerme"
      ]
   },
   {
      id: "foerderung",
      title: "Förderung",
      fields: ["foerderantraege", "vertraglicheVereinbarungenOderAbsichtserklaerungen"]
   },
   {
      id: "beschreibung",
      title: "Beschreibung",
      fields: ["projektbeschreibung", "kommentar"]
   },
   {
      id: "veroeffentlichung",
      title: "Veröffentlichung",
      fields: ["anonymisierungProjektname", "anonymisierungAnlagenbetreiber", "anonymisierungFoerderantraege"]
   }
];

// Jahresangaben dürfen nicht als Zahl mit Tausendertrennzeichen erscheinen ("2.027").
const JAHR_ATTRIBUTE = new Set(["jahrDerInbetriebnahme", "initialeInbetriebnahme", "endausbau", "ausserbetriebnahme"]);

// Der Projektname steht bereits in der Kopfzeile und wird nicht als Attributzeile wiederholt.
const HIDDEN_ATTRIBUTE = new Set(["projektname"]);

// Einheiten der Zeitreihen sind im Feldnamen kodiert; die Labels aus den Metadaten tragen keine.
const ZEITREIHEN_UNIT_SUFFIXES = [
   ["MwhProJahr", "MWh/a"],
   ["Mwh", "MWh"],
   ["Mw", "MW"],
   ["Prozent", "%"]
];

function getZeitreihenUnit(key) {
   const match = ZEITREIHEN_UNIT_SUFFIXES.find(([suffix]) => key.endsWith(suffix));
   return match ? match[1] : null;
}

// Kuratierte Zeitreihen-Tabellen: mehrere schmale thematische Tabellen mit zwei bis drei
// Wertspalten statt einer breiten Gesamttabelle. Die Einheit steht dezent an jedem Wert;
// "pro Jahr" gehört in die Überschrift, damit die Zelleneinheit ein kurzes "MWh" bleibt.
// Überschriften sind einzeilig und brechen nur bei Platznot am weichen Trennstrich (U+00AD)
// bzw. am Leerzeichen um. Nicht zugeordnete Zeitreihen landen in "Weitere Zeitreihen".
const WASSERSTOFF_ZEITREIHEN_GROUPS = [
   {
      id: "speicher",
      title: "Speicher H₂",
      // Nur Speicher melden ein Arbeitsgasvolumen; ihre Ein- und Ausspeiseleistung gehört dann
      // in dieselbe Tabelle statt in die Ausspeisungs-/Einspeisungstabellen darunter.
      requires: "arbeitsgasvolumenH2Mwh",
      spalten: [
         { key: "einspeiseleistungH2Mw", header: "Einspeise\u00ADleistung", unit: "MW", width: "w-24" },
         { key: "ausspeiseleistungH2Mw", header: "Ausspeise\u00ADleistung", unit: "MW", width: "w-24" },
         { key: "arbeitsgasvolumenH2Mwh", header: "Arbeitsgas\u00ADvolumen", unit: "MWh", width: "w-34" }
      ]
   },
   {
      id: "ausspeisung",
      title: "Ausspeisung H₂",
      spalten: [
         { key: "ausspeiseleistungH2Mw", header: "Leistung", unit: "MW", width: "w-24" },
         { key: "ausspeisemengeH2MwhProJahr", header: "Menge pro Jahr", unit: "MWh", width: "w-34" }
      ]
   },
   {
      id: "einspeisung",
      title: "Einspeisung H₂",
      spalten: [
         { key: "einspeiseleistungH2Mw", header: "Leistung", unit: "MW", width: "w-24" },
         { key: "einspeisemengeH2MwhProJahr", header: "Menge pro Jahr", unit: "MWh", width: "w-34" }
      ]
   }
];

const PTG_ZEITREIHEN_GROUPS = [
   {
      id: "strom",
      title: "Strom",
      spalten: [
         { key: "elektrischeLeistungMw", header: "Elektrische Leistung", unit: "MW", width: "w-24" },
         { key: "elektrischerEnergiebedarfMwhProJahr", header: "Energiebedarf pro Jahr", unit: "MWh", width: "w-34" },
         { key: "wirkungsgradProzent", header: "Wirkungs\u00ADgrad", unit: "%", width: "w-22" }
      ]
   },
   {
      id: "wasserstoff-erzeugung",
      title: "Wasserstoff · Erzeugung",
      spalten: [
         { key: "erzeugungsleistungH2Mw", header: "Erzeugungs\u00ADleistung", unit: "MW", width: "w-32" },
         { key: "eigenverbrauchsmengeH2MwhProJahr", header: "Eigenverbrauch pro Jahr", unit: "MWh", width: "w-34" }
      ]
   },
   {
      id: "wasserstoff-einspeisung",
      title: "Wasserstoff · Einspeisung",
      spalten: [
         { key: "einspeiseleistungH2Mw", header: "Einspeise\u00ADleistung", unit: "MW", width: "w-32" },
         { key: "einspeisemengeH2MwhProJahr", header: "Einspeisemenge pro Jahr", unit: "MWh", width: "w-34" }
      ]
   },
   {
      id: "waerme",
      title: "Wärme",
      spalten: [
         { key: "maxWaermeleistungMw", header: "Maximale Leistung", unit: "MW", width: "w-32" },
         { key: "waermebereitstellungMwhProJahr", header: "Bereitstellung pro Jahr", unit: "MWh", width: "w-34" }
      ]
   }
];

const hasZeitreihenWerte = werte => Object.keys(werte ?? {}).length > 0;

// Ordnet die vorhandenen Zeitreihen den kuratierten Tabellen zu; jede Reihe erscheint nur einmal.
// Was übrig bleibt (etwa neue Felder der Quelldatei), kommt gesammelt in "Weitere Zeitreihen".
function selectZeitreihenGroups(groups, labels, zeitreihen) {
   const consumed = new Set();
   const active = [];

   groups.forEach(group => {
      if (group.requires && !hasZeitreihenWerte(zeitreihen[group.requires])) return;
      // Bereits von einer früheren Gruppe konsumierte Spalten fallen heraus, damit keine Reihe
      // doppelt erscheint (etwa die Ausspeiseleistung eines Speichers mit Ausspeisemenge).
      const freieSpalten = group.spalten.filter(spalte => !consumed.has(spalte.key));
      if (!freieSpalten.some(spalte => hasZeitreihenWerte(zeitreihen[spalte.key]))) return;
      active.push({ ...group, spalten: freieSpalten });
      freieSpalten.forEach(spalte => consumed.add(spalte.key));
   });

   const rest = Object.keys(zeitreihen).filter(key => hasZeitreihenWerte(zeitreihen[key]) && !consumed.has(key));
   if (rest.length > 0) {
      active.push({
         id: "weitere",
         title: "Weitere Zeitreihen",
         spalten: rest.map(key => ({ key, header: labels?.[key] ?? key, unit: getZeitreihenUnit(key) }))
      });
   }

   return active;
}

function isEmptyValue(value) {
   return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function BooleanValue({ value }) {
   const label = value ? "Ja" : "Nein";
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

function formatAttributeValue(field, value) {
   if (typeof value === "number") {
      return JAHR_ATTRIBUTE.has(field) ? String(value) : NUMBER_FORMAT.format(value);
   }
   // Mehrjahresangaben wie "2028: … | 2029: …" werden zeilenweise lesbar.
   return String(value).replaceAll(" | ", "\n");
}

function DetailRow({ field, label, value }) {
   return (
      <div className="grid min-h-9 grid-cols-[minmax(8.5rem,0.42fr)_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border/45 py-2.5 text-xs @max-[430px]:grid-cols-1">
         <dt className="flex min-w-0 items-center gap-1.5 wrap-break-word text-muted-foreground">
            <span>{label}</span>
         </dt>
         <dd className="m-0 min-w-0 font-normal whitespace-pre-line wrap-break-word text-card-foreground">
            {typeof value === "boolean" ? <BooleanValue value={value} /> : formatAttributeValue(field, value)}
         </dd>
      </div>
   );
}

function AttributeGroups({ attribute, groups, labels }) {
   const groupedFields = new Set(groups.flatMap(group => group.fields));
   const remainingFields = Object.keys(attribute).filter(
      field => !groupedFields.has(field) && !HIDDEN_ATTRIBUTE.has(field)
   );
   const allGroups = [...groups, { id: "weitere", title: "Weitere Angaben", fields: remainingFields }];

   return allGroups.map(group => {
      const fields = group.fields.filter(field => field in attribute && !isEmptyValue(attribute[field]));
      if (fields.length === 0) return null;

      return (
         <section aria-labelledby={`detail-group-${group.id}`} className="grid gap-2.5" key={group.id}>
            <h3 id={`detail-group-${group.id}`} className="m-0 text-[0.7rem] font-medium text-label-accent uppercase">
               {group.title}
            </h3>
            <dl className="grid border-t border-border/50">
               {fields.map(field => (
                  <DetailRow field={field} key={field} label={labels?.[field] ?? field} value={attribute[field]} />
               ))}
            </dl>
         </section>
      );
   });
}

function ZeitreihenGroupTable({ group, zeitreihen }) {
   const jahre = [...new Set(group.spalten.flatMap(spalte => Object.keys(zeitreihen[spalte.key] ?? {})))].sort();
   // Verknüpft die Tabelle mit ihrer Überschrift, damit sie einen programmatischen Namen trägt;
   // useId hält die id über mehrere gleichzeitig gerenderte Panels hinweg eindeutig.
   const headingId = useId();

   return (
      <div className="grid min-w-0 gap-1.5">
         <h4 className="m-0 text-[0.72rem] font-medium text-card-foreground" id={headingId}>
            {group.title}
         </h4>
         {/* Sicherheitsnetz für die generische Resttabelle: viele unbekannte Spalten dürfen
             scrollen statt das Panel zu sprengen. Die kuratierten Tabellen passen immer. */}
         <div className="overflow-x-auto">
            {/* Festes Spaltenraster: schmale Jahr-Spalte, Wertspalten mit inhaltsangepasster
                Breite (schmal für MW/Prozent, breit für MWh-Mengen), dahinter eine Füllspalte.
                So rücken die Werte nah ans Jahr, die Zeilenlinien laufen aber wie bei den
                Attributzeilen über die volle Panelbreite. */}
            <table aria-labelledby={headingId} className="w-full table-fixed border-collapse text-xs">
               <colgroup>
                  <col className="w-12" />
                  {group.spalten.map(spalte => (
                     <col className={spalte.width ?? "w-32"} key={spalte.key} />
                  ))}
                  <col />
               </colgroup>
               <thead>
                  <tr className="border-b border-border/60 align-bottom leading-tight text-muted-foreground">
                     <th className="py-1 pr-2 text-left font-medium" scope="col">
                        Jahr
                     </th>
                     {group.spalten.map(spalte => (
                        <th className="py-1 pl-2 text-right font-medium" key={spalte.key} scope="col">
                           {spalte.header}
                        </th>
                     ))}
                     <td aria-hidden="true" className="p-0" />
                  </tr>
               </thead>
               <tbody>
                  {jahre.map(jahr => (
                     <tr className="border-b border-border/45 text-card-foreground" key={jahr}>
                        <th className="py-1 pr-2 text-left font-medium text-muted-foreground tabular-nums" scope="row">
                           {jahr}
                        </th>
                        {group.spalten.map(spalte => {
                           const wert = zeitreihen[spalte.key]?.[jahr];
                           return (
                              <td className="py-1 pl-2 text-right tabular-nums" key={spalte.key}>
                                 {Number.isFinite(wert) ? (
                                    <>
                                       {NUMBER_FORMAT.format(wert)}
                                       {spalte.unit ? (
                                          // Schmales geschütztes Leerzeichen (U+202F): Zahl und Einheit
                                          // bleiben zusammen, die Einheit tritt in Kleinschrift zurück.
                                          <span className="text-[0.58rem] text-muted-foreground/80">{`\u202F${spalte.unit}`}</span>
                                       ) : null}
                                    </>
                                 ) : (
                                    "–"
                                 )}
                              </td>
                           );
                        })}
                        <td aria-hidden="true" className="p-0" />
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}

function ZeitreihenTables({ groups, labels, zeitreihen }) {
   const activeGroups = selectZeitreihenGroups(groups, labels, zeitreihen);
   if (activeGroups.length === 0) return null;

   return (
      <section aria-labelledby="detail-group-zeitreihen" className="grid gap-2.5">
         <h3 id="detail-group-zeitreihen" className="m-0 text-[0.7rem] font-medium text-label-accent uppercase">
            Zeitreihen
         </h3>
         {/* Auf breiten Containern (Panel unter der Karte auf mittleren Bildschirmen) stehen die
             Tabellen zweispaltig nebeneinander — das halbiert den Scrollweg der PtG-Ansicht.
             Ab 50rem sind beide Rasterspalten breit genug für die dreispaltige Strom-Tabelle. */}
         <div className="grid gap-x-10 gap-y-4 border-t border-border/50 pt-2.5 @min-[50rem]:grid-cols-2">
            {activeGroups.map(group => (
               <ZeitreihenGroupTable group={group} key={group.id} zeitreihen={zeitreihen} />
            ))}
         </div>
      </section>
   );
}

function MissingGeometryHint({ geometrieStatus }) {
   if (geometrieStatus !== "fehlt") return null;

   return (
      <p className="m-0 mt-3 flex items-start gap-2 border border-border/70 bg-muted/60 px-3 py-2 text-xs leading-snug text-muted-foreground">
         <MapPinOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
         <span>
            Dieses Projekt ist aktuell nicht auf der Karte verortet und erscheint nur in Suche und Detailansicht.
         </span>
      </p>
   );
}

export default function MarktabfrageDetailPanel({ focusedSelectionRef, labels, onClose, selection }) {
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
   const typLabels = labels?.[props.projektTyp] ?? {};
   const attribute = getMarktabfrageAttribute(props);
   const zeitreihen = getMarktabfrageZeitreihen(props);
   const ptg = isPtgAnlage(props);
   const groups = ptg ? PTG_DETAIL_GROUPS : WASSERSTOFF_DETAIL_GROUPS;
   const zeitreihenGroups = ptg ? PTG_ZEITREIHEN_GROUPS : WASSERSTOFF_ZEITREIHEN_GROUPS;

   return (
      <section
         aria-labelledby="selection-panel-title"
         className="@container h-full max-h-full overflow-auto border border-border/60 bg-muted/55 p-4 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
         ref={panelRef}
         tabIndex={-1}
      >
         <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="grid min-w-0 gap-1">
               <p className="m-0 text-[0.72rem] font-medium text-label-accent uppercase">{projektMeta(feature)}</p>
               <h2 id="selection-panel-title" className="m-0 text-sm leading-snug font-medium text-card-foreground">
                  {projektTitle(feature)}
               </h2>
               {props.betreiber ? (
                  <p className="m-0 text-xs leading-snug text-muted-foreground">{props.betreiber}</p>
               ) : null}
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
            <AttributeGroups attribute={attribute} groups={groups} labels={typLabels.attribute} />
            <ZeitreihenTables groups={zeitreihenGroups} labels={typLabels.zeitreihen} zeitreihen={zeitreihen} />
         </div>
      </section>
   );
}
