/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MarktabfrageDetailPanel from "./MarktabfrageDetailPanel";

afterEach(() => {
   cleanup();
});

const labels = {
   wasserstoff_projekt: {
      attribute: {
         projektnummer: "Projektnummer",
         qsPruefungBestanden: "QS-Prüfung bestanden",
         anschlussanfrageBereitsGestellt: "Anschlussanfrage gestellt"
      },
      zeitreihen: {
         einspeiseleistungH2Mw: "Einspeiseleistung H2",
         auslastungProzent: "Auslastung"
      }
   }
};

function makeSelection(overrides = {}) {
   const { properties = {}, attribute = {}, zeitreihen = {} } = overrides;

   return {
      item: {
         type: "Feature",
         geometry: { type: "Point", coordinates: [7, 51] },
         properties: {
            id: "H2-42",
            name: "Wasserstoffpark Nord",
            betreiber: "Muster Energie AG",
            featureTyp: "marktabfrage_projekt",
            projektTyp: "wasserstoff_projekt",
            geometrieStatus: "vorhanden",
            kategorie: "Einspeisung",
            haertegradStufe: 2,
            inbetriebnahmeJahr: 2035,
            marktabfrage: { projektTyp: "wasserstoff_projekt", attribute, zeitreihen },
            ...properties
         }
      }
   };
}

function renderPanel(selection, extra = {}) {
   const onClose = vi.fn();
   render(<MarktabfrageDetailPanel labels={labels} onClose={onClose} selection={selection} {...extra} />);
   return { onClose };
}

describe("MarktabfrageDetailPanel", () => {
   it("renders title, meta line, and operator", () => {
      renderPanel(makeSelection());

      expect(screen.getByRole("heading", { name: "Wasserstoffpark Nord" })).toBeTruthy();
      expect(screen.getByText("H₂-Projekt · Einspeisung · HG 2 · IBN 2035")).toBeTruthy();
      expect(screen.getByText("Muster Energie AG")).toBeTruthy();
   });

   it("groups known attributes with labels and unknown ones under Weitere Angaben", () => {
      renderPanel(
         makeSelection({
            attribute: { projektnummer: "PN-1001", sonderfeld: "Zusatzwert" }
         })
      );

      const projektGruppe = screen.getByRole("region", { name: "Projekt" });
      expect(within(projektGruppe).getByText("Projektnummer")).toBeTruthy();
      expect(within(projektGruppe).getByText("PN-1001")).toBeTruthy();

      const weitere = screen.getByRole("region", { name: "Weitere Angaben" });
      expect(within(weitere).getByText("sonderfeld")).toBeTruthy();
      expect(within(weitere).getByText("Zusatzwert")).toBeTruthy();
   });

   it("renders booleans as a Ja/Nein symbol", () => {
      renderPanel(
         makeSelection({
            attribute: { qsPruefungBestanden: true, anschlussanfrageBereitsGestellt: false }
         })
      );

      expect(screen.getByRole("img", { name: "Ja" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Nein" })).toBeTruthy();
   });

   it("renders curated time series tables with sorted years, units, and gaps", () => {
      renderPanel(
         makeSelection({
            zeitreihen: {
               einspeiseleistungH2Mw: { 2035: 5, 2040: 20 },
               einspeisemengeH2MwhProJahr: { 2040: 43810 }
            }
         })
      );

      expect(screen.getByRole("heading", { name: "Einspeisung H₂" })).toBeTruthy();
      // Die Tabelle trägt die Überschrift als programmatischen Namen (aria-labelledby).
      expect(screen.getByRole("table", { name: "Einspeisung H₂" })).toBeTruthy();

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.map(cell => cell.textContent)).toEqual(["Jahr", "Leistung", "Menge pro Jahr"]);

      expect(screen.getAllByRole("rowheader").map(cell => cell.textContent)).toEqual(["2035", "2040"]);
      // Die Einheit steht mit schmalem geschütztem Leerzeichen (U+202F) am Wert; die Lücke
      // (2035 ohne Einspeisemenge) erscheint als Strich ohne Einheit. Die unsichtbaren
      // Füllzellen des Spaltenrasters sind aria-hidden und tauchen hier nicht auf.
      const zellen = screen.getAllByRole("cell").map(cell => cell.textContent);
      expect(zellen).toEqual(["5\u202FMW", "–", "20\u202FMW", "43.810\u202FMWh"]);
   });

   it("merges storage time series into a shared storage table", () => {
      renderPanel(
         makeSelection({
            zeitreihen: {
               einspeiseleistungH2Mw: { 2035: 100 },
               ausspeiseleistungH2Mw: { 2035: 120 },
               arbeitsgasvolumenH2Mwh: { 2035: 240000 }
            }
         })
      );

      expect(screen.getByRole("heading", { name: "Speicher H₂" })).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "Einspeisung H₂" })).toBeNull();
      expect(screen.queryByRole("heading", { name: "Ausspeisung H₂" })).toBeNull();

      // Lange Titel tragen einen weichen Trennstrich (U+00AD) für den Umbruch bei Platznot.
      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.map(cell => cell.textContent)).toEqual([
         "Jahr",
         "Einspeise\u00ADleistung",
         "Ausspeise\u00ADleistung",
         "Arbeitsgas\u00ADvolumen"
      ]);
   });

   it("keeps each series in a single table when a storage project also reports an offtake volume", () => {
      renderPanel(
         makeSelection({
            zeitreihen: {
               einspeiseleistungH2Mw: { 2035: 100 },
               ausspeiseleistungH2Mw: { 2035: 120 },
               arbeitsgasvolumenH2Mwh: { 2035: 240000 },
               ausspeisemengeH2MwhProJahr: { 2035: 50000 }
            }
         })
      );

      // Die Ausspeiseleistung gehört zur Speichertabelle und darf in der Ausspeisungstabelle
      // nicht erneut erscheinen; dort bleibt nur die (unkonsumierte) Menge übrig.
      const speicherTabelle = screen.getByRole("table", { name: "Speicher H₂" });
      expect(
         within(speicherTabelle)
            .getAllByRole("columnheader")
            .map(cell => cell.textContent)
      ).toEqual(["Jahr", "Einspeise\u00ADleistung", "Ausspeise\u00ADleistung", "Arbeitsgas\u00ADvolumen"]);

      const ausspeisungTabelle = screen.getByRole("table", { name: "Ausspeisung H₂" });
      expect(
         within(ausspeisungTabelle)
            .getAllByRole("columnheader")
            .map(cell => cell.textContent)
      ).toEqual(["Jahr", "Menge pro Jahr"]);
      expect(
         within(ausspeisungTabelle)
            .getAllByRole("cell")
            .map(cell => cell.textContent)
      ).toEqual(["50.000\u202FMWh"]);
   });

   it("collects unknown time series with catalog label and suffix unit under Weitere Zeitreihen", () => {
      renderPanel(
         makeSelection({
            zeitreihen: {
               ausspeiseleistungH2Mw: { 2035: 10 },
               ausspeisemengeH2MwhProJahr: { 2035: 50000 },
               auslastungProzent: { 2035: 50 }
            }
         })
      );

      expect(screen.getByRole("heading", { name: "Ausspeisung H₂" })).toBeTruthy();

      const tabelle = screen.getByRole("heading", { name: "Weitere Zeitreihen" }).parentElement;
      expect(within(tabelle).getByText("Auslastung")).toBeTruthy();
      expect(
         within(tabelle)
            .getAllByRole("cell")
            .map(cell => cell.textContent)
      ).toEqual(["50\u202F%"]);
   });

   it("renders the four profile tables Strom, Erzeugung, Einspeisung, and Wärme for PtG plants", () => {
      renderPanel(
         makeSelection({
            properties: { projektTyp: "ptg_anlage" },
            zeitreihen: {
               elektrischeLeistungMw: { 2035: 150 },
               elektrischerEnergiebedarfMwhProJahr: { 2035: 600000 },
               wirkungsgradProzent: { 2035: 60 },
               erzeugungsleistungH2Mw: { 2035: 90 },
               eigenverbrauchsmengeH2MwhProJahr: { 2035: 309750 },
               einspeiseleistungH2Mw: { 2035: 90 },
               einspeisemengeH2MwhProJahr: { 2035: 0 },
               maxWaermeleistungMw: { 2035: 0 },
               waermebereitstellungMwhProJahr: { 2035: 0 }
            }
         })
      );

      expect(
         ["Strom", "Wasserstoff · Erzeugung", "Wasserstoff · Einspeisung", "Wärme"].map(
            name => screen.getByRole("heading", { name }) && name
         )
      ).toEqual(["Strom", "Wasserstoff · Erzeugung", "Wasserstoff · Einspeisung", "Wärme"]);
      expect(screen.queryByRole("heading", { name: "Weitere Zeitreihen" })).toBeNull();
   });

   it("calls onClose when closing", () => {
      const { onClose } = renderPanel(makeSelection());

      fireEvent.click(screen.getByRole("button", { name: "Auswahl schließen" }));
      expect(onClose).toHaveBeenCalledOnce();
   });

   it("shows a note when the geometry is missing", () => {
      renderPanel(makeSelection({ properties: { geometrieStatus: "fehlt" } }));

      expect(
         screen.getByText(
            "Dieses Projekt ist aktuell nicht auf der Karte verortet und erscheint nur in Suche und Detailansicht."
         )
      ).toBeTruthy();
   });

   it("hides the geometry note when a geometry is present", () => {
      renderPanel(makeSelection());

      expect(screen.queryByText(/nicht auf der Karte verortet/)).toBeNull();
   });

   it("focuses the panel on a new selection but not on re-renders with the same selection", () => {
      const focusedSelectionRef = { current: null };
      const baseProps = { focusedSelectionRef, labels, onClose: vi.fn() };
      const { rerender } = render(<MarktabfrageDetailPanel {...baseProps} selection={makeSelection()} />);

      const panel = screen.getByRole("region", { name: "Wasserstoffpark Nord" });
      expect(document.activeElement).toBe(panel);

      // Fokus wandert weg (z. B. auf den Schließen-Button); ein Re-Render mit derselben
      // Auswahl darf ihn nicht zurück in das Panel reißen.
      const schliessenButton = screen.getByRole("button", { name: "Auswahl schließen" });
      schliessenButton.focus();
      rerender(<MarktabfrageDetailPanel {...baseProps} selection={makeSelection()} />);
      expect(document.activeElement).toBe(schliessenButton);

      // Eine neue Auswahl (andere ID) fokussiert das Panel wieder.
      rerender(
         <MarktabfrageDetailPanel
            {...baseProps}
            selection={makeSelection({ properties: { id: "H2-43", name: "Wasserstoffpark Süd" } })}
         />
      );
      expect(document.activeElement).toBe(screen.getByRole("region", { name: "Wasserstoffpark Süd" }));
   });

   it("renders nothing without a selection", () => {
      const { container } = render(<MarktabfrageDetailPanel labels={labels} onClose={vi.fn()} selection={null} />);

      expect(container.firstChild).toBeNull();
   });
});
