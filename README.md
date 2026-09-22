# Schulmanager Enhanced (Firefox Add-on)

Schulmanager Enhanced verbessert Schulmanager Online mit einer anpassbaren
Sidebar, modernen Themes und einem übersichtlicheren Stundenplan. Die
wichtigsten Funktionen:

- Permanente, sortierbare Sidebar mit allen Modulen und Kontobereich
- 15 Themes, eigene Akzentfarbe und frei definierbares CSS
- Individuelle Startseite und optimierte Dark-Mode-Darstellung
- Verbesserter Stundenplan mit Uhrzeiten, Pausen, Tagesmarkierung und Live-Zeitlinie
- Stundenplan-Export als `.ics`-Datei für Kalender-Apps

## Funktionen
- **Permanente Sidebar** ersetzt die komplette Headerbar: Logo, alle
  Module (per Drag & Drop sortierbar, dauerhaft gespeichert), sowie
  Konto-Bereich (Mein Account, Benachrichtigungen, Impressum,
  Datenschutz, Ausloggen). Wird bei jedem Laden der Seite automatisch
  neu eingelesen, damit neue/entfernte Module sofort auftauchen.
- **15 Themes**: Hell, Dunkel, sowie 13 Farbverlaufs-Themes im
  "Nitro"-Stil (Purple, Aurora, Sunset, Emerald, Cherry, Cyber, Gold,
  Ocean sowie 5 besonders "prominente" mit farbigem Seiten-Hintergrund
  und starkem Glass-Effekt: Galaxy, Lava, Candy, Neon, Royale).
- **Eigene Akzentfarbe** per Farbwähler, unabhängig vom Theme.
- **Dark-Mode-Fixes für Chats & Berichte**: Nachrichten-Bubbles und die
  farbcodierten Anwesenheits-Zellen im Klassenbuch bleiben jetzt auch
  im Dark Mode lesbar (Schulmanager setzt dort feste helle
  Hintergründe ohne eigene Textfarbe).
- **Anwesenheit statt Abwesenheit**: Im Klassenbuch-Berichte-Modul
  werden alle Abwesenheits-Prozentwerte und -Stunden automatisch in
  Anwesenheits-Werte umgerechnet (100 % = anwesend statt 0 % =
  anwesend) inklusive umbenannter Überschriften.
- **Eigenes CSS**: Freitextfeld für beliebige zusätzliche Anpassungen,
  wird live angewendet und gespeichert.
- **Einstellbare Startseite**: beim Öffnen von Schulmanager direkt zu
  einem gewünschten Modul springen (z.B. Stundenplan) statt zum
  Dashboard.
- **Modernisierter Stundenplan**: echte Uhrzeiten pro Stunde links,
  automatisch berechnete Pausen-Leisten ("5 min Pause" etc.), farblich
  markierte Fächer, hervorgehobene heutige Spalte und eine rote
  Live-Zeit-Linie, die während der aktuellen Stunde die aktuelle
  Position anzeigt.
- **Kalender-Export**: Der sichtbare Stundenplan kann als `.ics`-Datei mit
  wöchentlich wiederkehrenden Terminen, Uhrzeiten, Lehrkraft und Raum
  exportiert werden.
- **Modernisierter Kalender**: abgerundete Termine, dezente
  Hover-Effekte, Akzentfarbe in Toolbar/Buttons, Dark-Mode-taugliche
  Darstellung.

## Bedienung
- Sidebar ist immer sichtbar (auf schmalen Bildschirmen über den
  ☰-Button links oben ein-/ausklappbar).
- ⚙ „Einstellungen" unten in der Sidebar öffnet den Dialog für Theme,
  Akzentfarbe, Startseite, eigenes CSS und „Module neu einlesen".
- Modul-Reihenfolge direkt in der Sidebar per Ziehen ändern.
- Im Stundenplan auf **Kalender exportieren** klicken und die `.ics`-Datei
  in die gewünschte Kalender-App importieren. Explizit ausgefallene Stunden
  werden nicht exportiert.

## Die Stundenplan-Zeiten
```
1: 07:55–08:40   6: 12:35–13:20
2: 08:45–09:30   7: 13:30–14:15
3: 09:50–10:35   8: 14:20–15:05
4: 10:40–11:25   9: 15:10–15:55
5: 11:45–12:30  10: 16:00–16:45
                11: 16:50–17:35
```
Pausenlängen werden automatisch aus den Lücken zwischen den Stunden
berechnet und beschriftet. Falls dein Stundenplan andere Zeiten hat,
lässt sich das Array `PERIODS` in `content/content.js` anpassen.

## Technischer Hintergrund / Grenzen
- Modul-Liste und Konto-Menü stehen bei Schulmanager immer im DOM
  (nur per CSS versteckt), daher liest das Add-on sie direkt aus, ohne
  irgendetwas zu öffnen oder zu klicken.
- Die Live-Zeit-Linie im Stundenplan wird anhand der tatsächlich
  gerenderten Zeilen-Positionen berechnet und alle 20 Sekunden sowie
  bei Fenstergröße-Änderung aktualisiert.
- Interaktive Voransichten (Nachrichten-/Benachrichtigungs-Dropdowns
  mit Live-Inhalten) werden nicht 1:1 nachgebaut - die Sidebar
  verlinkt stattdessen direkt auf die jeweiligen Seiten.
- Da es sich um eine reine DOM-/CSS-Erweiterung ohne Zugriff auf die
  Schulmanager-API handelt, kann eine größere Änderung am
  Schulmanager-Frontend (z.B. andere CSS-Klassennamen) einzelne
  Funktionen beeinträchtigen. In dem Fall bitte im Zahnrad-Dialog auf
  „Module neu einlesen" klicken bzw. Bescheid geben, dann passe ich
  die Selektoren an.

## Installation (temporär, zum Testen)
1. Firefox öffnen und `about:debugging#/runtime/this-firefox` aufrufen
2. „Temporäres Add-on laden…" klicken
3. Die Datei `manifest.json` aus diesem Ordner auswählen
4. Schulmanager Online öffnen

Temporär geladene Add-ons verschwinden beim Neustart von Firefox und
müssen dann erneut geladen werden.

## Dauerhafte Installation
https://addons.mozilla.org/de/firefox/addon/schulmanager-enhanced/

## Wichtiger Hinweis
Dieses Add-on verändert nur Aussehen/Struktur der bereits im Browser
geladenen Seite (CSS/DOM), sendet nichts an Dritte, benötigt keine
eigene Server-Anbindung und greift nicht in die Datenhaltung von
Schulmanager Online ein.
