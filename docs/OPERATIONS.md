# Betrieb des Mein App-Katalogs

## Zugriffsmodell

Die veröffentlichte Master-App bleibt privat. Der erste bestätigte Besucher der privaten Site erhält einmalig die Admin-Rolle im zentralen Katalog; spätere Besucher beginnen als Viewer. Rollenänderungen erfolgen ausschließlich in `catalog_site_users` über das Supabase-Dashboard.

## Dateien

Screenshots gehören in `catalog-screenshots`, geprüfte Dokumente in `catalog-documents` und erzeugte Ausgaben in `catalog-exports`. Keine Zugangsdaten, privaten Browser-Profile oder ungeprüften Fallakten hochladen.

## Integrationen

GitHub und Vercel liefern Status erst nach einer signierten Webhook- oder API-Verbindung. Zugangsdaten werden als Laufzeitgeheimnisse gespeichert, nie in Git oder der Datenbank.

## Lokale Rechner

Je Rechner wird `scripts/catalog-status-agent.ps1` über eine lokale Aufgabe ausgeführt. Der Agent meldet nur einen definierten Port, Testergebnis und Laufzeit. Das Agenten-Token ist pro Rechner als lokale Umgebungsvariable zu hinterlegen.

## Sicherung und Datenqualität

Die Supabase-Migrationen gehören in dieses Repository. Zusätzlich kann `scripts/export-supabase-catalog.ps1` einen JSON-Export der Metadaten erstellen. Die Datenbankansicht `catalog_quality_issues` zeigt fehlende URLs, Architekturangaben und Teststände.
