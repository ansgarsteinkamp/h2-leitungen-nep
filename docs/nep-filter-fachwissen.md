# Fachwissen zu NEP-Gas/Wasserstoff-Filtern

Stand dieser internen Arbeitsnotiz: 2026-07-03. Review erforderlich nach 2026-07-10, weil sich der laufende BNetzA-Prozess danach ändern kann.

Diese Notiz hält das fachliche Verständnis hinter den Filterbegriffen der Anwendung fest. Sie ist als Arbeitsgedächtnis für weitere UI- und Logikentscheidungen gedacht. Der überarbeitete Entwurf des Netzentwicklungsplans Gas und Wasserstoff 2025 wurde am 2026-06-01 der Bundesnetzagentur zur Bestätigung vorgelegt. Die BNetzA konsultiert den überarbeiteten Entwurf bis zum 2026-07-10; am 2026-07-03 ist der NEP daher noch nicht final bestätigt. Formulierungen in der App sollten deshalb nicht suggerieren, dass jede Maßnahme bereits endgültig genehmigt oder zur Umsetzung verpflichtet ist.

## Prozesskette

Die fachliche Kette ist:

1. Energiewirtschaftsgesetz (EnWG), insbesondere integrierte Netzentwicklungsplanung für Gas und Wasserstoff sowie Sonderregelung zum Wasserstoff-Kernnetz.
2. Szenariorahmen Gas/Wasserstoff 2025-2037/2045.
3. Genehmigung des Szenariorahmens durch die Bundesnetzagentur am 2025-04-30.
4. Startnetz und weitere Eingangsdaten für die Netzmodellierung.
5. Szenarienspezifische Netzmodellierung für Methan und Wasserstoff.
6. Modellierungsergebnisse je Szenario und Betrachtungsjahr.
7. Erster Entwurf des NEP und KO.NEP-Konsultation nach § 15c EnWG.
8. Überarbeitung und Vorlage des überarbeiteten Entwurfs an die Bundesnetzagentur.
9. BNetzA-Prüfung mit erneuter Konsultation nach § 15d EnWG.
10.   Ggf. Änderungsverlangen der BNetzA, erneute Vorlage und abschließende Bestätigung des NEP mit Wirkung für Fernleitungsnetzbetreiber und regulierte Wasserstofftransportnetzbetreiber.

Das Wasserstoff-Kernnetz ist dabei ein vorgelagerter Sonderprozess nach § 28q EnWG. Es wurde am 2024-10-22 von der Bundesnetzagentur genehmigt und wird im NEP Gas/Wasserstoff 2025 überprüft sowie im Rahmen der rollierenden Planung weiterentwickelt. "Rollierend" meint dabei keinen Live-Datenstand, sondern den zweijährlichen NEP-Prozess nach § 15a EnWG. Ein Teil der Kernnetzmaßnahmen wird im NEP als Startnetz behandelt.

## Begriffe

### Wasserstoff-Kernnetz

Das Wasserstoff-Kernnetz ist nicht der NEP und nicht identisch mit dem Netzausbauvorschlag. Es ist eine gesetzlich beschleunigte erste Stufe eines überregionalen Wasserstofftransportnetzes. Ziel nach § 28q EnWG ist ein deutschlandweites, effizientes, schnell realisierbares, ausbaufähiges und klimafreundliches Wasserstoff-Kernnetz, das wesentliche Wasserstoffproduktionsstätten, Importpunkte, Verbrauchspunkte und Speicher verbindet.

Wichtige Arbeitsdaten:

- Genehmigung durch die BNetzA: 2024-10-22.
- Genehmigter Umfang laut öffentlicher BNetzA-Darstellung: rund 9.040 km.
- Erwartete Investitionen laut öffentlicher BNetzA-Darstellung: rund 18,9 Mrd. Euro.
- Rund 60 Prozent basieren auf Umstellung bestehender Erdgasleitungen.
- Für die ursprüngliche Kernnetz-Genehmigungsfähigkeit musste die planerische Inbetriebnahme bis spätestens 2032-12-31 vorgesehen sein; eine spätere Überprüfung und Bestätigung eines NEP kann für einzelne genehmigte Kernnetzprojekte abweichende planerische Inbetriebnahmen bis spätestens 2037-12-31 vorsehen.

Kernnetzmaßnahmen bleiben auch dann Teil des genehmigten Wasserstoff-Kernnetzes, wenn eine spätere NEP-Überprüfung und NEP-Bestätigung eine abweichende planerische Inbetriebnahme bis spätestens 2037-12-31 vorsieht. Eine zeitliche Streckung bedeutet daher nicht automatisch, dass die Maßnahme aus dem Kernnetz herausfällt.

Für die mit der Kernnetz-Genehmigung zur Durchführung bestimmten Unternehmen können sich nach Maßgabe der Genehmigung Umsetzungspflichten für Kernnetz-Projekte ergeben. Das betrifft die genehmigten Kernnetz-Projekte, soweit in der Kernnetz-Genehmigung Unternehmen zur Durchführung bestimmt wurden, nicht automatisch jede zusätzliche NEP-Maßnahme über das Kernnetz hinaus. Besondere Rechtsfolgen wie "energiewirtschaftlich notwendig", "vordringlich" oder "überragendes öffentliches Interesse" dürfen in UI-Texten nicht pauschal auf alle im Entwurf sichtbaren Leitungen übertragen werden.

Die Sonderfinanzierung über §§ 28r, 28s EnWG bezieht sich auf das genehmigte Wasserstoff-Kernnetz. Neue Wasserstoff-Maßnahmen, die im NEP über das Kernnetz hinaus als Netzausbauvorschlag ermittelt werden, sind nach dem überarbeiteten Entwurf nicht Bestandteil des Kernnetzes und unterliegen damit nicht den Finanzierungsbedingungen des Amortisationskontos. Für diese neuen Maßnahmen benennen die Wasserstofftransportnetzbetreiber im Entwurf vorerst keine Vorhabenträger; für die Umsetzung sind verbindliche regionale Bedarfe erforderlich.

Wichtig für die UI: "Kernnetz" bedeutet nicht automatisch "aktuell im NEP 2025 als Netzausbauvorschlag bis 2037 neu vorgeschlagen". Kernnetzmaßnahmen können im NEP als Startnetz behandelt, im Entwurf als Bestandteil des Netzausbauvorschlags vorgesehen, zeitlich/dimensional angepasst oder in kommenden NEP erneut überprüft werden.

### Kernnetz-ID

Die Kernnetz-ID ist der Referenzschlüssel aus der Wasserstoff-Kernnetz-Genehmigung bzw. den Kernnetz-Maßnahmenlisten. Im NEP wird sie neben der NEP-ID geführt, um Kernnetzmaßnahmen und deren Anpassungen nachverfolgen zu können. Typische Präfixe sind z. B. `KLN`, `KLU`, `KVS` oder `AND`. Sie ist kein eigenständiger Status wie `startnetz` oder `netzausbauvorschlag` und auch keine verlässliche 1:1-Geometrie-ID, weil Kernnetzmaßnahmen im NEP gesplittet, angepasst oder zusammengeführt sein können.

### Startnetz

Das Startnetz ist die Ausgangsbasis der Modellierung. Startnetzmaßnahmen werden in der Netzsimulation wie bereits bestehende Leitungen oder Anlagen behandelt. Fachlich ist es deshalb eine Modellierungsbasis und kein Unterfall des Netzausbauvorschlags; in der UI wird es dennoch bewusst als Rollenfilter unter "Einordnung im NEP" angeboten.

Für Methan umfasst das Startnetz im NEP-Kontext insbesondere:

- Bestand des Fernleitungsnetzes,
- gegenüber vorherigen NEP bereits in Betrieb genommene Maßnahmen,
- im Bau befindliche Maßnahmen,
- weitere ausgewählte Maßnahmen aus dem NEP Gas 2022-2032, soweit die Kriterien zum Stichtag 2025-09-01 erfüllt sind, insbesondere Final Investment Decision (FID) und erforderliche öffentlich-rechtliche Genehmigungen.

Maßnahmen, die bis zum Stichtag bereits in Betrieb genommen wurden, können in NEP-Maßnahmenlisten bzw. in der NEP-Gas-Datenbank als Maßnahmen verschwinden, weil sie faktisch in den Bestand übergehen. Das ist eine mögliche Erklärung für scheinbare Datenlücken.

Für Wasserstoff knüpft das Startnetz an das genehmigte Wasserstoff-Kernnetz an. Nach § 28q Abs. 8 EnWG werden bestimmte frühe Kernnetzmaßnahmen im NEP nicht erneut überprüft: insbesondere Projekte mit planerischer Inbetriebnahme vor Ablauf des 2027-12-31, wenn mit ihrer Durchführung bis 2025-12-31 bereits begonnen wurde. Diese Maßnahmen werden im NEP als Wasserstoff-Startnetz zugrunde gelegt. Zusätzlich werden die Methan-Startnetz-Kriterien auch im Wasserstoffbereich angewendet, insbesondere FID und erforderliche öffentlich-rechtliche Genehmigungen zum Stichtag 2025-09-01.

Wichtige Arbeitsdaten aus dem überarbeiteten NEP-Entwurf 2025:

- Wasserstoff-Startnetz: ca. 2.201 km Leitungen, ca. 4,0 Mrd. Euro Investitionsvolumen.

UI-Risiko: "Startnetz" kann von Nutzerinnen und Nutzern als "Startansicht" oder als vollständiges Kernnetz missverstanden werden. In der App bleibt "Startnetz" deshalb als kurze Kategorienoption unter "Einordnung im NEP" erhalten; der Tooltip erklärt "Ausgangsbasis der Modellierung". Eine eigene Netzansicht nur für Startnetz wird vermieden, weil sie dieselbe Menge redundant zur Kategorienauswahl zeigen würde.

### Szenariorahmen

Der Szenariorahmen ist die verbindliche Annahmenbasis für die Modellierung. Er enthält Annahmen zu Energiebedarf, Erzeugung, Import/Export, Speichern, Kraftwerken, Elektrolyseuren, Transformation von Methan zu Wasserstoff und den Betrachtungsjahren 2037 und 2045. Die BNetzA genehmigte den Szenariorahmen 2025 am 2025-04-30 mit Änderungen und Maßgaben. Genehmigt wurden vier Szenarien: Szenario 1 bis 3 für Methan und Wasserstoff in den Jahren 2037 und 2045 sowie Szenario 4 als reines Methan-Versorgungssicherheitsszenario für 2030.

Für die in dieser App sichtbaren Wasserstoff-Leitungen sind vor allem die Szenarien 1 bis 3 für 2037 relevant, weil die GeoJSON-Marker `szenario1`, `szenario2`, `szenario3` anzeigen, ob eine Maßnahme im jeweiligen Wasserstoff-Modellierungsergebnis 2037 enthalten ist. Szenario 4 ist bedarfsbasiert, nur auf Methanversorgungssicherheit 2030 bezogen und nicht Teil der H2-Szenariofilter.

### Szenario 1, 2 und 3

Arbeitsverständnis nach den bisherigen Quellen:

- Szenario 1 (2037): hoher und breiter Wasserstoffhochlauf auf Basis von O45-H2. Wasserstoff wird bereits 2037 in allen Verbrauchssektoren angesetzt. Im überarbeiteten NEP-Entwurf weist Szenario 1 die höchste Gesamt-H2-Ausspeiseleistung aus; Szenario 2 hat dagegen den höheren Kraftwerksanteil. Die Wasserstoff-Leitungslänge des Modellierungsergebnisses 2037 liegt nahe bei Szenario 2, die Verdichterleistung aber höher.
- Szenario 2 (2037): stärker elektrifizierter Pfad auf Basis von O45-Strom und eng mit Szenario B des NEP Strom abgestimmt. Wasserstoff wird 2037 im Wesentlichen für Kraftwerke und Industrie angesetzt; keine Wasserstoffnutzung in privaten Haushalten, GHD und Verkehr. Die Wasserstoff-Leitungslängen ähneln Szenario 1, unterscheiden sich aber bei Leistungs- und Verdichterannahmen.
- Szenario 3 (2037): verzögerte Transformation mit weniger weitreichendem Erdgasausstieg. Wasserstoff wird 2037 deutlich geringer angesetzt; Methan bleibt insbesondere für Kraftwerke, Industrie und Wärme länger relevant. Das Wasserstoff-Modellierungsergebnis 2037 liegt bei Leitungslänge und Verdichterleistung deutlich unter Szenario 1 und 2. Für 2045 steigt der Wasserstoffinfrastrukturbedarf in Szenario 3 deutlich gegenüber 2037, bleibt aber bei Ausspeiseleistung, Leitungslänge und Verdichterleistung unter Szenario 1 und 2. Zusätzlich verbleibt in Szenario 3 Methanbedarf im Kraftwerkssektor; in Szenario 1 und 2 wird 2045 kein innerdeutscher Methanverbrauch angesetzt.

Orientierende Werte aus dem überarbeiteten Entwurf, jeweils inklusive Startnetz:

- 2037: Szenario 1 ca. 10.430 km und 767 MW Verdichterleistung; Szenario 2 ca. 10.199 km und 526 MW; Szenario 3 ca. 7.433 km und 14 MW.
- 2045: Szenario 1 ca. 18.249 km und 3.534 MW; Szenario 2 ca. 18.434 km und 2.553 MW; Szenario 3 ca. 17.277 km und 1.818 MW.

Vorsicht: Die Szenarien sind keine Rangfolge und keine Versionen. "Szenario 1" ist nicht "besser" oder "aktueller" als "Szenario 2". UI-Texte sollten deshalb mindestens das Jahr nennen: "Szenario 1 (2037)".

### Modellierungsergebnis

Ein Modellierungsergebnis beschreibt, welche Netzelemente in einem bestimmten Szenario technisch benötigt werden. Es ist ein Zwischenergebnis der Netzsimulation, keine Bauentscheidung. Eine Maßnahme kann in einem oder mehreren Szenarien erscheinen, ohne Teil des Netzausbauvorschlags zu sein.

UI-Risiko: "Szenarioergebnis" klingt für Laien schnell wie "finales Ergebnis". Präziser ist "Nur in Modellierungsergebnissen 2037" für Maßnahmen, die nicht Startnetz und nicht Teil des Netzausbauvorschlags sind, aber in mindestens einem Szenario 2037 vorkommen.

### Netzausbauvorschlag

Der Netzausbauvorschlag ist die kriterienbasierte Auswahl aus Modellierungsergebnissen und der Kernnetz-Überprüfung. Das Startnetz wird daneben als Modellierungsbasis geführt und ist gerade nicht Bestandteil des Netzausbauvorschlags. Der Netzausbauvorschlag ist der fachlich relevante Vorschlagskorb der Netzbetreiber im NEP-Entwurf, der von der BNetzA geprüft und konsultiert wird.

Für Wasserstoff gilt außerdem eine wichtige Umstellungslogik: Das EnWG verlangt, die Umstellung vorhandener Leitungsinfrastruktur auf Wasserstoff gegenüber Neubau vorrangig zu prüfen und darzulegen, sofern dies möglich und wirtschaftlich sinnvoll ist. Umstellung ist aber kein Automatismus. Sie setzt voraus, dass die Erdgasinfrastruktur aus dem Fernleitungsnetz herausgelöst werden kann und das verbleibende Erdgasnetz die voraussichtlich verbleibenden Erdgasbedarfe erfüllt.

Für Wasserstoff nennt der überarbeitete Entwurf sieben Kriterien H2(1) bis H2(7). Arbeitsverständnis:

- H2(1): Kernnetzmaßnahmen, die in allen drei Szenarien 2037 Modellierungsergebnis sind, sind Bestandteil des Netzausbauvorschlags.
- H2(2): Kernnetzmaßnahmen, die in mindestens einem Szenario 2037 Modellierungsergebnis sind, sind Bestandteil des Netzausbauvorschlags; Dimensionierung und Inbetriebnahme können angepasst werden.
- H2(3): Kernnetzmaßnahmen, die in keinem Szenario 2037 benötigt werden, sind nicht Bestandteil des Netzausbauvorschlags 2037 im NEP-Entwurf. Das bedeutet nicht automatisch, dass sie ihren genehmigten Kernnetzstatus verlieren.
- H2(4): Zusätzliche Maßnahmen über das Kernnetz hinaus, die in allen drei Szenarien 2037 resultieren, sind Bestandteil des Netzausbauvorschlags.
- H2(5): Zusätzliche Maßnahmen über das Kernnetz hinaus, die 2037 nicht in allen drei Szenarien enthalten sind, werden grundsätzlich nicht aufgenommen.
- H2(6): Bestimmte Umstellungsmaßnahmen über das Kernnetz hinaus können dennoch aufgenommen werden, wenn sie nicht in allen drei Szenarien erforderlich sind, aber in allen drei Szenarien 2037 ohne erdgasverstärkende Maßnahmen umstellbar sind.
- H2(7): Neubaumaßnahmen, die erst 2045 über den 2037-Vorschlag hinaus erforderlich werden, sind nicht Bestandteil des Netzausbauvorschlags.

Wichtige Arbeitsdaten aus dem überarbeiteten NEP-Entwurf 2025:

- Wasserstoff-Netzausbauvorschlag: ca. 7.040 km Leitungen, ca. 20,3 Mrd. Euro und ca. 255 MW Verdichterleistung.
- Wasserstoff-Startnetz: ca. 2.201 km Leitungen, ca. 4,0 Mrd. Euro.
- Gesamtangabe aus Tabelle 43 des überarbeiteten Entwurfs: 7.040 km Netzausbauvorschlag plus 2.201 km Startnetz ergeben ca. 9.241 km Wasserstoffinfrastruktur und ca. 24,4 Mrd. Euro.
- Rundungs-/Quellenhinweis: Das PDF des überarbeiteten Entwurfs nennt in Tabelle 43 rund 24,4 Mrd. Euro; BNetzA-Kommunikation bzw. Kurzfassungen können gerundet rund 24,3 Mrd. Euro nennen.
- Struktur des Wasserstoff-Netzausbauvorschlags: ca. 3.658 km Umstellung, ca. 3.196 km Neubau und ca. 186 km Offshore-Neubau. Die Investitionsvolumina verteilen sich sehr unterschiedlich: Umstellung ca. 2,5 Mrd. Euro, Neubau ca. 14,0 Mrd. Euro, Offshore-Neubau ca. 1,9 Mrd. Euro. Diese Größenordnung erklärt, warum Umstellung fachlich und wirtschaftlich so stark geprüft wird.
- Methan-Netzausbauvorschlag: Größenordnung ca. 672 km und ca. 2,9 Mrd. Euro im überarbeiteten Entwurf; ältere Zahlen aus dem ersten Entwurf unterscheiden sich und müssen mit Dokumentstand zitiert werden.

UI-Risiko: "Netzausbauvorschlag inkl. Startnetz" ist funktional nachvollziehbar, weil die App `startnetz || netzausbauvorschlag` zeigt. Fachlich kann "inkl." aber so gelesen werden, als sei das Startnetz ein Unterfall des Netzausbauvorschlags. Sauberer sind "Startnetz und Netzausbauvorschlag" oder "Netzausbauvorschlag plus Startnetzmaßnahmen".

## Weitere fachliche Abhängigkeiten

### Integrierte Methan- und Wasserstoffplanung

Der NEP Gas und Wasserstoff 2025 ist erstmals als integrierte Planung für Methan und Wasserstoff angelegt. Eine Wasserstoffleitung ist deshalb nicht isoliert zu verstehen: Gerade bei Umstellungen bestehender Erdgasleitungen muss geprüft werden, ob die verbleibenden Methanbedarfe in der Region weiterhin sicher gedeckt werden können.

Für die UI heißt das: `leitungstyp = Umstellung` ist kein einfacher Hinweis auf "günstiger" oder "schneller". Eine Umstellung ist eine Systementscheidung. Sie kann voraussetzen, dass Methanflüsse umgelagert, andere Leitungen verstärkt, zeitliche Übergänge organisiert oder einzelne Methanbedarfe anders versorgt werden.

### CH4-Kriterien

Neben den H2-Kriterien enthält der überarbeitete Entwurf CH4-Kriterien für den Methan-Netzausbauvorschlag. Für diese App sind sie vor allem deshalb wichtig, weil sie erklären, warum Methanmaßnahmen und Wasserstoffumstellungen fachlich miteinander gekoppelt sind.

Arbeitsverständnis:

- CH4-Maßnahmen können aus Versorgungssicherheit, Szenarioergebnissen oder Startnetz-/Bestandslogik folgen.
- Erdgasverstärkende Maßnahmen sind besonders heikel: Sie können nur dann Teil des Methan-Netzausbauvorschlags sein, wenn die zugehörige H2-Umstellungsmaßnahme Teil des H2-Netzausbauvorschlags ist.
- Die Methanlogik begrenzt damit mittelbar, welche H2-Umstellungen möglich sind. Wasserstoff und Methan sind nicht zwei unabhängige Kartenebenen.

UI-Risiko: Eine "Umstellung" sollte nicht so gelesen werden, als sei die Methanleitung automatisch frei verfügbar. Die Umstellung hängt an der integrierten Methan-/H2-Prüfung.

### Erdgasverstärkende Maßnahmen und Kreuzbetrachtung

Erdgasverstärkende Maßnahmen können auf den ersten Blick wie ein Widerspruch zum Wasserstoffhochlauf wirken. In der integrierten Planung können sie aber Voraussetzung dafür sein, dass bestehende Erdgasleitungen später für Wasserstoff frei werden, ohne die Methanversorgung zu gefährden.

Besonders wichtig ist die Kreuzbetrachtung zwischen Wasserstoff- und Methanszenarien: Eine Leitung, die im Wasserstoffszenario als Umstellung erscheint, ist nur dann plausibel umstellbar, wenn sie im relevanten Methanpfad nicht weiterhin für Methan gebraucht wird. Der überarbeitete Entwurf betrachtet deshalb, ob bestimmte Umstellungsmaßnahmen bei höheren Methanbedarfen weiterhin möglich wären oder durch Neubau ersetzt werden müssten.

Ein konkreter Prüfpunkt aus dem überarbeiteten Entwurf ist die Negativmodellierung mit H2-Netz aus Szenario 2 und Methannetz aus Szenario 3. Nach der Darstellung im überarbeiteten Entwurf wären 17 Umstellungsleitungen mit ca. 1.101 km bei höherem Methanbedarf nicht frei; Neubau statt Umstellung würde die H2-Leitungskosten in dieser Betrachtung um ca. 4,3 Mrd. Euro erhöhen. Diese Größenordnung zeigt, warum der Datenwert "Umstellung" ohne Methankontext nicht vollständig interpretierbar ist.

Der überarbeitete Entwurf prüft außerdem, ob H2-Neubau durch zusätzliche Methanumstellungen plus marktbasierte Instrumente ersetzt werden kann. Das Ergebnis der Prüfung spricht gegen die einfache Lesart "mehr Umstellung wäre immer möglich": Außerhalb des Startnetzes wurden keine geeigneten H2-Maßnahmen mit alternativer Methaninfrastruktur und ausreichend liquiden marktlichen Instrumenten gefunden.

UI-Risiko: Umstellungsleitungen sollten nicht als unabhängig realisierbare Einzelobjekte gelesen werden. Ein Tooltip oder Detailtext sollte bei Gelegenheit erklären, dass Umstellung die Freimachung aus dem Methansystem voraussetzt.

### GDRM-Anlagen und nicht-lineare Netzelemente

Die Leitungsdaten bilden nur einen Teil der Infrastruktur ab. Gas-Druckregel- und Messanlagen (GDRM-Anlagen), Verdichter, Speicheranbindungen, Importpunkte und Ausspeisepunkte sind für die technische Netzfunktion ebenfalls relevant. Bei Maßnahmenbezeichnungen wie "inkl. GDRM-Anlagen" sind Kosten und Funktion daher nicht vollständig aus der Leitungslänge ableitbar.

Für Auswertungen bedeutet das: Kilometerwerte erklären nicht allein das Investitionsvolumen. Kurze Maßnahmen können hohe Kosten haben, wenn Anlagen, Verdichter oder komplexe Kopplungspunkte enthalten sind; lange Leitungsabschnitte können im Verhältnis günstiger erscheinen, wenn sie überwiegend aus Umstellung bestehen.

### Regionale Ebene, VNB und GTP

Der NEP beschreibt die Fernleitungs- und Wasserstofftransportebene. Er ist nicht gleichbedeutend mit der vollständigen regionalen Wasserstoffversorgung. Regionale Transformationsplanungen, Verteilnetzbetreiber und der Gasnetzgebietstransformationsplan (GTP) können zusätzliche Bedarfe, zeitliche Pfade und lokale Anschlusslogiken enthalten.

Für den Szenariorahmen 2025 wurden VNB-Langfristprognosen berücksichtigt, kommunale Wärmeplanungen und GTP-Transformationspläne aber noch nicht flächendeckend als belastbare Bedarfsgrundlage verwendet. Sie können künftig ergänzend wichtiger werden, ersetzen aber nicht die NEP-Bestätigung.

UI-Risiko: Wenn in der Karte in einer Region keine Leitung sichtbar ist, bedeutet das nicht automatisch "dort gibt es keinen Wasserstoffbedarf". Es bedeutet nur, dass in diesem Datensatz kein entsprechendes Leitungsfeature auf der betrachteten Transportnetzebene enthalten ist.

### Speicher, Importpunkte und Flussrichtung

Speicher, Grenzübergangspunkte, LNG- bzw. sonstige Importpunkte und Elektrolyseure werden in der Modellierung netzdienlich regionalisiert. Bei Speichern sind Einspeisung und Ausspeisung aus Sicht des Netzes zu verstehen: Eine "Ausspeisung" aus dem Netz kann Befüllung eines Speichers bedeuten, eine "Einspeisung" in das Netz kann Ausspeicherung bedeuten.

UI-Risiko: "Importpunkt", "Speicher" oder "Einspeisung" sollten nicht als unmittelbare Projektzusage oder als feste physische Flussrichtung ohne Modellierungskontext gelesen werden.

### Europäische und grenzüberschreitende Bezüge

Importpunkte, Grenzübergangspunkte, Speicher und europäische Korridore sind für die Modellierung relevant. Europäische Planungen wie ENTSOG/TYNDP oder Corridor-Initiativen können Hintergrundannahmen liefern, sind aber nicht automatisch Bestandteil des deutschen NEP-Netzausbauvorschlags. Für die UI sollte deshalb zwischen "im deutschen NEP-Datensatz enthalten" und "europäisch/strategisch relevant" unterschieden werden.

### OGE-Bezug

In der App wird "OGE-Bezug" absichtlich beibehalten. Der Begriff ist kurz und im OGE-Kontext verständlich. Fachlich muss der Tooltip die Breite erklären: OGE ist als Ansprechpartner oder durchführender Netzbetreiber genannt. Das bedeutet nicht zwingend Eigentum, alleinige Umsetzungsverantwortung oder Investitionsverantwortung.

Die App unterscheidet:

- `ogeBeteiligung`: abgeleitet aus Ansprechpartnern und durchführenden Netzbetreibern; Filter "Nur OGE-Bezug".
- `ogeIstDurchfuehrenderNetzbetreiber`: abgeleitet nur aus durchführenden Netzbetreibern; Darstellungs-Hervorhebung, kein Filter.

Der Begriff "durchführender Netzbetreiber" sollte nicht überdehnt werden. Die spätere NEP-Bestätigung kann Unternehmen unter den gesetzlichen Voraussetzungen zur Umsetzung verpflichten; aus einem UI-Filter oder einer Nennung in den Daten folgt aber nicht automatisch Eigentum, alleinige Investitionspflicht oder alleinige Verantwortung.

## Datenmarker in diesem Projekt

Die GeoJSON-Daten werden beim Upload normalisiert. Relevante Marker:

- `startnetz`: Startnetzmaßnahme.
- `netzausbauvorschlag`: Teil des Netzausbauvorschlags Wasserstoff im NEP-Entwurf.
- `szenario1`, `szenario2`, `szenario3`: Maßnahme ist im jeweiligen Wasserstoff-Modellierungsergebnis 2037 enthalten.
- `standardAnzeige`: wird beim Import abgeleitet als `startnetz || netzausbauvorschlag`; für die Filterlogik zählt die direkte Regel, nicht ein eventuell angeliefertes Rohfeld.
- `kernnetzAntragsId`: Referenzschlüssel zur Kernnetz-Zuordnung; Grundlage für den Filter "Teil des Kernnetzes" mit den Optionen "Mit Kernnetz-ID" und "Ohne Kernnetz-ID", aber kein eigener NEP-Status.
- `ogeBeteiligung`: wird beim Import aus `durchfuehrendeNetzbetreiber` und `ansprechpartner` abgeleitet.
- `ogeIstDurchfuehrenderNetzbetreiber`: wird beim Import nur aus `durchfuehrendeNetzbetreiber` abgeleitet.

Realdatencheck mit `quelldaten_v2.geojson` am 2026-07-03:

- 331 Leitungsfeatures.
- Leitungstypen: Neubau, Umstellung.
- Inbetriebnahmejahre: 2025 bis 2036, keine fehlenden Jahre.
- Startnetz: 90 Features.
- Mit Kernnetz-ID: 265 Features.
- Ohne Kernnetz-ID: 66 Features.
- Standardansicht (`startnetz || netzausbauvorschlag`): 289 Features.
- Standardansicht mit Kernnetz-ID: 261 Features.
- Standardansicht ohne Kernnetz-ID: 28 Features.
- Startnetz und Szenario 1 (2037): 326 Features.
- Startnetz und Szenario 2 (2037): 308 Features.
- Startnetz und Szenario 3 (2037): 226 Features.
- Alle Maßnahmen im Datensatz: 331 Features.
- Nur in Modellierungsergebnissen 2037 bei Szenario 1: 42 Features.
- OGE-Bezug: 71 Features.
- OGE als durchführender Netzbetreiber nach Ableitung: 32 Features.

Die lokale GeoJSON ist nicht geeignet, die gesamten 20,3 Mrd. Euro des Wasserstoff-Netzausbauvorschlags direkt nachzurechnen, weil die offiziellen Gesamtinvestitionen auch Verdichterpositionen enthalten. Eine interne Datenauswertung ergab für `netzausbauvorschlag` in der lokalen GeoJSON 199 Leitungsfeatures, ca. 7.010,2 km und ca. 18.248,3 Mio. Euro. Das liegt nahe an der Tabellenposition "Leitungen inkl. GDRM-Anlagen" von ca. 18,3 Mrd. Euro, aber unter der Gesamtinvestition von ca. 20,3 Mrd. Euro inklusive ca. 2,0 Mrd. Euro Verdichterstationen. Die Szenario-Längensummen der lokalen GeoJSON passen dagegen sehr eng zu den NEP-Tabellen: Szenario 1 ca. 10.429,6 km, Szenario 2 ca. 10.198,6 km, Szenario 3 ca. 7.432,8 km.

## Aktuelle UI-Entscheidungen und offene Punkte

Aktuell umgesetzt:

- "Netzauswahl" wurde zu "Netzansicht".
- "Netzausbauvorschlag + Startnetz" wurde nach fachlicher Prüfung zu "Startnetz und Netzausbauvorschlag".
- "Szenario 1/2/3 (2037) + Startnetz" wurde nach fachlicher Prüfung zu "Startnetz und Szenario 1/2/3 (2037)".
- "Alle Leitungsmaßnahmen" wurde zu "Alle Maßnahmen im Datensatz", weil die Option keine eigene NEP-Kategorie ist, sondern die vollständige geladene GeoJSON einschließlich reiner Modellierungsergebnisse zeigt.
- Die eigene Netzansicht "Startnetzmaßnahmen" wurde nach fachlicher Prüfung entfernt; dieselbe fachliche Menge ist über "Einordnung im NEP" > "Startnetz" erreichbar.
- "NEP-Einordnung" wurde zu "Einordnung im NEP".
- "Startnetz" bleibt als kurze Kategorienoption erhalten; der Tooltip erklärt die Modellierungsbasis.
- "Netzausbauvorschlag" bleibt als kurze Kategorienoption erhalten; der Tooltip erklärt die Abgrenzung zum Startnetz.
- "Nur Szenarioergebnis" wurde zu "Nur Modellierung 2037".
- Der Filter "Teil des Kernnetzes" wurde als eigene Achse direkt nach "Einordnung im NEP" vorgesehen. Er filtert datenpräzise nach vorhandener oder fehlender `kernnetzAntragsId` mit den Optionen "Alle", "Mit Kernnetz-ID" und "Ohne Kernnetz-ID".
- Wichtig: "Teil des Kernnetzes" ist als nutzerverständliches Gruppenlabel gemeint; die Optionen und der Tooltip stellen klar, dass die App nach Kernnetz-ID filtert und daraus kein Nachweis für Baurecht, Bauentscheidung, Umsetzungsstand oder die aktuelle NEP-Einordnung folgt.
- "Neue Maßnahmen NEP 2025" wurde nicht als globale Option gewählt, weil Maßnahmen ohne Kernnetz-ID in der Ansicht "Alle Maßnahmen im Datensatz" auch reine Modellierungsergebnisse enthalten können.
- Die Filter-Leiste folgt fachlich der Reihenfolge: Netzansicht als Grundmenge, Einordnung im NEP als Rollenfilter, Teil des Kernnetzes als Kernnetz-ID-Achse, optionaler Szenariofilter als Schnittmenge, danach Leitungstyp, Inbetriebnahmejahr und Betreiber-/OGE-Filter.
- Die Tooltips erklären ausdrücklich den Unterschied zwischen Szenario-Netzansichten und dem separaten Szenariofilter: Szenario-Netzansichten enthalten Startnetzmaßnahmen zusätzlich, der separate Szenariofilter fügt keine Startnetzmaßnahmen hinzu.
- Der Tooltip zum Leitungstyp erklärt bei Umstellungen, dass die Leitung aus dem Methansystem freigemacht werden kann.
- Der Tooltip zum Inbetriebnahmejahr erklärt, dass das Jahr ein planerischer Wert aus den Maßnahmendaten ist.
- "OGE-Bezug" bleibt unverändert.
- Die Hervorhebung "OGE durchführender FNB" ist bewusst als Darstellung und nicht als Filter erklärt; "Nur OGE-Bezug" bleibt dagegen der breitere Filter über Ansprechpartner oder durchführende Netzbetreiber.

Offene Diskussionspunkte:

- Sollten die Szenariofilter-Optionen selbst "Szenario 1 (2037)" usw. heißen, obwohl die Gruppe bereits "In Szenario 2037 enthalten" heißt? Aktuelle Tendenz: Optionen kurz lassen, weil der Gruppenname das Jahr bereits trägt.

## Primärquellen

- § 15a EnWG Netzentwicklungsplan Gas und Wasserstoff: https://www.gesetze-im-internet.de/enwg_2005/__15a.html
- § 15b EnWG Szenariorahmen: https://www.gesetze-im-internet.de/enwg_2005/__15b.html
- § 15c EnWG Erstellung des Netzentwicklungsplans: https://www.gesetze-im-internet.de/enwg_2005/__15c.html
- § 15d EnWG Prüfung und Bestätigung des Netzentwicklungsplans: https://www.gesetze-im-internet.de/enwg_2005/__15d.html
- § 28q EnWG Wasserstoff-Kernnetz: https://www.gesetze-im-internet.de/enwg_2005/__28q.html
- § 28r EnWG Finanzierung Wasserstoff-Kernnetz: https://www.gesetze-im-internet.de/enwg_2005/__28r.html
- § 28s EnWG Amortisationskonto: https://www.gesetze-im-internet.de/enwg_2005/__28s.html
- BNetzA Wasserstoff-Kernnetz: https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Wasserstoff/Kernnetz/start.html
- BNetzA Genehmigung Wasserstoff-Kernnetz PDF: https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Wasserstoff/_DL/Genehmigung.pdf?__blob=publicationFile&v=6
- BNetzA NEP Gas/Wasserstoff: https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NEP/Gas/start.html
- BNetzA Konsultationsfragebogen NEP Gas/Wasserstoff 2025 PDF: https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NEP/Gas/DL/Konsultationsfragebogen.pdf?__blob=publicationFile&v=9
- BNetzA Genehmigung Szenariorahmen Gas/Wasserstoff 2025 PDF: https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NEP/DL_Szenariorahmen/Genehm_SR_2025Gas.pdf?__blob=publicationFile&v=2
- Überarbeiteter Entwurf NEP Gas und Wasserstoff 2025 PDF: https://data.bundesnetzagentur.de/Bundesnetzagentur/SharedDocs/Downloads/DE/Sachgebiete/Energie/Unternehmen_Institutionen/NEP/Gas/NEP2025-2037/Zweiter_Entwurf_NEP_Gas_Wasserstoff_2025.pdf
- KO.NEP Netzentwicklungsplan 2025: https://ko-nep.de/netzentwicklungspl%C3%A4ne/netzentwicklungsplan-2025/
- KO.NEP Verfahren: https://ko-nep.de/verfahren/
- FNB Gas Wasserstoff-Kernnetz: https://fnb-gas.de/wasserstofftransport/wasserstoff-kernnetz/
