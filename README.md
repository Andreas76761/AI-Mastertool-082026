# Mein App-Katalog

Private App-Inventur mit 132 getrennten Einträgen. Apps werden über feste Katalog- und Quell-IDs zugeordnet. Titel, gemeinsame Plattformübersichten und thematische Ähnlichkeit führen nicht zum Zusammenführen oder Löschen von Apps.

## App-Details

Vier Register pro App: Ziel & Verwendung, Architektur & Zugänge, Optimierungen, Sonstiges. Quellenlogos zeigen den Herkunftsanbieter; Vercel-Hosting wird zusätzlich ausgewiesen. Zugänge enthalten Benutzerkennung, Login-Link und Tresorverweis. Passwörter und Sitzungsschlüssel sind keine Katalogfelder.

## Optimierungen

- Import und wiederholbarer Abgleich von App-Listen aus Gemini, Copilot und weiteren Anbietern, mit Änderungsprotokoll.
- Kontoabhängige Monatsbudgets; Ausgaben und Erstattungen bleiben nach Währung getrennt.
- Vergleich hochgeladener Quelltexte anhand SHA-256 und Wortüberschneidung. Ergebnisse beziehen sich auf die hinterlegten Dateien.
- HTTP-Prüfungen, Browser-Seitenaufbau und dokumentierte Bedienabläufe mit getrennter Aussagekraft.
- Metadatensicherung und echte Wiederherstellungsprobe in temporären PostgreSQL-Tabellen, einschließlich interner Fremdschlüssel. Binärdateien und externe Identitäten separat sichern.

Gemini-/Copilot-Übersichtsseiten gelten nicht als individuelle Apps. Zugriff und Vollständigkeit jeder Quelle sind separat sichtbar. Leere GitHub-Repositories werden als Entwurf geführt.

## Datenverbindung und Zugriff

Der Server benötigt `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`. Schlüssel ausschließlich als Sites-Secrets hinterlegen. Die Site bleibt privat. APIs verlangen bestätigte Site-Identität und prüfen Bearbeitungsrechte; Konten und Budgets sind benutzerbezogen. Neue Katalogtabellen sind für Browserrollen gesperrt und werden nur über den Server verwendet.

Die Offline-Ausgangsdaten liegen serverseitig in `app/catalog-snapshot.json`; technische Details und Optimierungsansichten werden separat geladen. Ein sichtbarer Katalog aktualisiert seinen Datenstand periodisch.

## Prüfen

`npm run build`, `node --test tests/*.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`.

Datenbankmigrationen liegen unter `supabase/migrations`. Die Restore-Funktion arbeitet mit temporären Tabellen und verändert keine produktiven Katalogdaten.
