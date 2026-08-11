"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Source = "GitHub" | "Lokaler Rechner" | "Google Drive" | "Cloud";
type Status = "Aktiv" | "Prüfen" | "Dokumentiert" | "Entwurf";
type DetailPanel = "masterdata" | "tags" | "architecture" | "features";
type WindowTab = "profile" | "systems" | "screens";
type MainView = "dashboard" | "catalog" | "control";
type ControlTab = "analytics" | "sources" | "devices" | "matrix" | "scores" | "ideas" | "remote";

type Tool = {
  id: string;
  title: string;
  description: string;
  source: Source;
  status: Status;
  category: string;
  detail: string;
  location: string;
  overlap?: string;
  url?: string;
  archive?: string;
  createdAt?: string;
  checkedAt?: string;
  performance?: string;
  trafficLight?: "green" | "gray" | "red";
  trafficNote?: string;
};

type TestResult = { phase: "testing" | "done" | "error"; message: string };

const networkDevices = [
  { id: "local", name: "Dieser Rechner", system: "Windows 11", address: "192.168.2.185", state: "online", detail: "Master-App und lokale Dienste sind erreichbar." },
  { id: "w1", name: "Windows Laptop 1", system: "Windows 11", address: "192.168.1.100:9001", state: "unavailable", detail: "Am 11.08.2026 per Ping und Gesundheitsdienst nicht erreichbar; anderes Netzsegment." },
  { id: "ubuntu", name: "Ubuntu Desktop", system: "Ubuntu 22.04", address: "192.168.1.102:9002", state: "unavailable", detail: "Am 11.08.2026 per Ping und Gesundheitsdienst nicht erreichbar; anderes Netzsegment." },
  { id: "w2", name: "Windows Laptop 2", system: "Windows 10", address: "192.168.1.103:9003", state: "unavailable", detail: "Am 11.08.2026 per Ping und Gesundheitsdienst nicht erreichbar; anderes Netzsegment." },
];

const featureIdeas = [
  { id: "sync", title: "Geräte-Status-Agent", detail: "Kleiner Dienst je Rechner für aktuelle Inventur und Gesundheitsstatus.", votes: 0 },
  { id: "github", title: "GitHub-Abgleich", detail: "Commits, Pull Requests und Deployments direkt im Projektprofil bündeln.", votes: 0 },
  { id: "search", title: "Globale Projektsuche", detail: "Suche über Dateien, Dokumentation und Screenshots hinweg.", votes: 0 },
  { id: "portfolio", title: "Portfolio-Report", detail: "Exportierbarer Management-Bericht für Status und Fortschritt.", votes: 0 },
];

const tools: Tool[] = [
  { id: "overview", title: "AI-Artefakte Übersicht", description: "Bestehender plattformübergreifender Projektkatalog.", source: "Lokaler Rechner", status: "Aktiv", category: "Katalog", detail: "Der klarste Vorgänger des neuen Master-Tools. Er soll als Grundlage geprüft und gezielt erweitert werden.", location: "C:\\2026\\Claude\\Übersicht", overlap: "Master-Tool-Vorläufer", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 8000 (26.110 Bytes)." },
  { id: "business", title: "AI Business Berater", description: "Vergleichsportal für Datenbanken und Bildspeicher.", source: "Lokaler Rechner", status: "Aktiv", category: "Beratung", detail: "Lokale Codex-App mit Startdokumentation und eigenem Projektordner.", location: "C:\\2026\\Codex\\AI Business Berater", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 4173 (8.997 Bytes)." },
  { id: "bau", title: "Bau Slowakei", description: "Projektseite mit Vertrags- und Baudokumenten.", source: "Lokaler Rechner", status: "Aktiv", category: "Bau", detail: "Eigenständige Web-App mit HTML, CSS, JavaScript und verknüpften PDF-Dokumenten.", location: "C:\\2026\\Codex\\Bau Slowakei" },
  { id: "calendar", title: "Codex Calendar", description: "Lokale Kalenderauswertung und Terminfilter.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Organisation", detail: "Enthält Kalenderdaten, CSV-Auswertungen und gespeicherte Filter.", location: "C:\\2026\\Codex\\Codex Calendar" },
  { id: "contracts", title: "oneSCM Vertragsmanagement", description: "Multi-Agent-System für Vertragsarbeit.", source: "Lokaler Rechner", status: "Prüfen", category: "Verträge", detail: "Umfangreiches System für Vertragsmanagement mit Workflows und Datenbankmodell.", location: "C:\\2026\\Claude\\Test2\\files", overlap: "VertragsBuddy · ServiceVertrag-Dashboard · DokuPress" },
  { id: "contracts-hub", title: "ServiceVertrag-Dashboard", description: "GitHub-Projekt für Serviceverträge.", source: "GitHub", status: "Prüfen", category: "Verträge", detail: "Privates GitHub-Repository; wird gegen die lokalen Vertragswerkzeuge abgegrenzt.", location: "Andreas76761/ServiceVertrag-Dashboard", overlap: "oneSCM Vertragsmanagement", url: "https://github.com/Andreas76761/ServiceVertrag-Dashboard" },
  { id: "dokupress", title: "DokuPress", description: "Backend für Benutzerhandbücher und Dokumentation.", source: "Lokaler Rechner", status: "Aktiv", category: "Dokumentation", detail: "PostgreSQL-Backend mit Mandantentrennung für Dokumentationsprozesse.", location: "C:\\2026\\Claude\\Fable\\DTP für Usermanual\\dokupress-backend", overlap: "Vertrags- und Dokumentationswerkzeuge", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 8090 (316.240 Bytes)." },
  { id: "slides", title: "Sketch-to-Slide", description: "Bild oder Skizze in professionelle PowerPoint-Folien überführen.", source: "Lokaler Rechner", status: "Aktiv", category: "Präsentation", detail: "Lokale Anwendung mit Bild-Upload, KI-Inhalt und PowerPoint-Export.", location: "C:\\2026\\Claude\\PPT Bilderstellung\\sketch-to-slide", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 4321 (101.053 Bytes). KI-Analyse benötigt eine eigene Anthropic-Konfiguration." },
  { id: "presentation", title: "Presentation Designer", description: "PowerPoint-Archiv und Designsystem mit KI-Einblicken.", source: "Lokaler Rechner", status: "Prüfen", category: "Präsentation", detail: "Lokale App unter dem Arbeitstitel Thumbnail; Abgleich mit GitHub-Generator nötig.", location: "C:\\2026\\Claude\\Thumbnail", overlap: "Thumnail_Generator" },
  { id: "thumbnail", title: "Thumnail Generator", description: "GitHub-Projekt für visuelle Generierung.", source: "GitHub", status: "Prüfen", category: "Präsentation", detail: "Öffentliches Repository, vermutlich funktional nah am lokalen Presentation Designer.", location: "Andreas76761/Thumnail_Generator", overlap: "Presentation Designer", url: "https://github.com/Andreas76761/Thumnail_Generator" },
  { id: "releaseletter", title: "Releaseletter", description: "Lokaler Workflow für Release-Kommunikation.", source: "Lokaler Rechner", status: "Prüfen", category: "Kommunikation", detail: "Lokale Anwendung; Abgleich mit n8n-Workflow und Dify-Repository vorgesehen.", location: "C:\\2026\\Claude\\Releaseletter", overlap: "Dify_Releaseletter · n8n" },
  { id: "dify", title: "Dify Releaseletter", description: "GitHub-Projekt für automatisierte Release-Briefe.", source: "GitHub", status: "Prüfen", category: "Kommunikation", detail: "Repository mit separatem Entwicklungszweig; fachlich wahrscheinlich mit dem lokalen Releaseletter verbunden.", location: "Andreas76761/Dify_Releaseletter", overlap: "Releaseletter · n8n", url: "https://github.com/Andreas76761/Dify_Releaseletter" },
  { id: "studio", title: "Google AI Studio", description: "KI-Experimente, Videoerzeugung und Vertragsbilder.", source: "Google Drive", status: "Dokumentiert", category: "KI", detail: "Drive-Ordner mit Video-Artefakten, Zugriffshistorie, Vergleichsdokument und Vertrags-Visualisierungen.", location: "Google Drive / Meine Ablage / Google AI Studio" },
  { id: "n8n", title: "n8n Releaseletter-Abgleich", description: "Workflow-Vergleich für Jira und Releaseletter.", source: "Google Drive", status: "Dokumentiert", category: "Automatisierung", detail: "Als JSON-Workflow in Google Drive gefunden; wird dem Releaseletter-Cluster zugeordnet.", location: "Google Drive / n8n_workflow_jira_releaseletter_vergleich.json", overlap: "Releaseletter · Dify Releaseletter" },
  { id: "knowledge", title: "KnowledgeHub", description: "Cloud-basierte Wissens- und Tool-Übersicht.", source: "Google Drive", status: "Prüfen", category: "Katalog", detail: "Als HTML-Artefakt in Google Drive vorhanden; wird gegen den lokalen Übersichtsvorläufer geprüft.", location: "Google Drive / KnowledgeHub App.html", overlap: "AI-Artefakte Übersicht · KI-Hub" },
  { id: "event", title: "AI Eventorganizer", description: "Event- und Messe-Organisation mit KI.", source: "GitHub", status: "Aktiv", category: "Organisation", detail: "Öffentliches Repository; korrespondierender lokaler AI-Messe-Guide enthält eine Vercel-Konfiguration.", location: "Andreas76761/AI_Eventorganizer", overlap: "AI Messe Guide", url: "https://github.com/Andreas76761/AI_Eventorganizer" },
  { id: "cost", title: "Kostenkurven-Simulator", description: "Modell- und Managementdokumentation zur Kostenanalyse.", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Mehrere PDF-Unterlagen und Management-Zusammenfassungen in Google Drive.", location: "Google Drive / Benutzerhandbuch_KostenkurvenSimulator.pdf" },
];

const statuses: Status[] = ["Aktiv", "Prüfen", "Dokumentiert", "Entwurf"];

const categoryTags: Record<string, string[]> = {
  Katalog: ["Portfolio", "Schnellsuche", "Übersicht", "Konsolidierung"],
  Beratung: ["Datenbanken", "Entscheidung", "Vergleich", "Analyse"],
  Bau: ["Bauprojekt", "Verträge", "Dokumente", "Projektsteuerung"],
  Organisation: ["Planung", "Termine", "Workflow", "Produktivität"],
  Verträge: ["Vertragsmanagement", "Compliance", "Workflows", "Dokumentation"],
  Dokumentation: ["Handbücher", "Wissensbasis", "Prozesse", "PostgreSQL"],
  Präsentation: ["PowerPoint", "Design", "Folien", "Visualisierung"],
  Kommunikation: ["Release", "Jira", "Automatisierung", "Kommunikation"],
  KI: ["Gemini", "Experimente", "Video", "Prompting"],
  Automatisierung: ["n8n", "Jira", "Integration", "Workflow"],
  Analyse: ["Kosten", "Simulation", "Management", "Reporting"],
};

const aiMesseGuide: Tool = { id: "messe", title: "AI Messe Guide", description: "Dashboard fuer KI-Messen, Konferenzen und Reisen.", source: "Lokaler Rechner", status: "Aktiv", category: "Organisation", detail: "Verwaltungs-App mit lokalem Modus sowie optionalem Cloud-Login, MFA und Synchronisierung.", location: "C:\\2026\\Claude\\AI_Messe_Guide", overlap: "AI Eventorganizer", url: "https://ai-messe-guide.vercel.app", checkedAt: "11.08.2026", performance: "Live-Zugang im Browser geprüft; Oberfläche und Inhalte wurden geladen" };
const claudeWorkspaceTools: Tool[] = [
  { id: "claude-workspace-app-overview", title: "Claude App Übersicht", description: "Lokale Übersicht bereits angelegter Anwendungen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Katalog", detail: "Statische HTML-Übersicht aus dem Claude-Arbeitsbereich.", location: "C:\\2026\\Claude\\-Übersicht Apps\\app-uebersicht.html", createdAt: "24.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-1e9", title: "1E9 2026", description: "Claude-Projekt mit Python-, Bild- und Präsentationsartefakten.", source: "Lokaler Rechner", status: "Prüfen", category: "Katalog", detail: "Projektordner mit Python-Skripten, JSON-Daten, Bildern und PPTX-Dateien; Web-Startpunkt noch nicht verifiziert.", location: "C:\\2026\\Claude\\1E9_2026", createdAt: "03.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-messe-explorer", title: "Messe Explorer Designauswahl", description: "Vier Designrichtungen für eine Messe-Explorer-Vorlage.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Organisation", detail: "Statische HTML-Designvarianten für den Messe-Explorer.", location: "C:\\2026\\Claude\\Artefact_Messe\\design-varianten\\index.html", createdAt: "05.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-bw-bank", title: "BW Bank Kreditkarten-App", description: "Lokale Kreditkartenübersicht auf Basis von Abrechnungen und Excel-Dateien.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Analyse", detail: "HTML-App mit zugehörigen Kreditkartenabrechnungen und Tabellen.", location: "C:\\2026\\Claude\\BW Bank 2025 2026\\BW_Bank_Kreditkarte_App.html", createdAt: "28.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-dateibetrachter", title: "Dateiverwaltung", description: "Dateibetrachter mit Vorschauen für Bilder, PDFs und Präsentationen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Katalog", detail: "Lokale HTML- und Python-App mit Vorschau- und Index-Pipeline.", location: "C:\\2026\\Claude\\Dateibetrachter neu\\Dateiverwaltung.html", createdAt: "19.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-dateiorganizer", title: "Dateiorganizer", description: "Lokales Explorer-Dashboard mit Analyse, Duplikatensuche und Automatisierungsskripten.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Automatisierung", detail: "HTML-Dashboards sowie PowerShell- und Batch-Werkzeuge für die Dateiorganisation.", location: "C:\\2026\\Claude\\Dateiorganizer\\00_Explorer_Dashboard.html", createdAt: "28.06.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-db-flow", title: "Deckungsbeitragsflussrechnung", description: "Abweichungsanalyse für Deckungsbeiträge und Finanzkennzahlen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Analyse", detail: "Lokale Fable/Claude-HTML-App mit Chart-Studio und Finanzanalyse.", location: "C:\\2026\\Claude\\Fable\\Deckungsbeitragflussrechnung\\app\\index.html", createdAt: "08.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-linkedin", title: "LinkedIn Dashboard", description: "Lokales Dashboard und Skripte für LinkedIn-Datenexporte.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Analyse", detail: "HTML-Dashboard mit lokalen JavaScript-Hilfsprogrammen und Exportbestand.", location: "C:\\2026\\Claude\\LinkedIn\\linkedin-dashboard.html", createdAt: "17.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-sirius", title: "SIRIUS oneSCM Dokumentation", description: "Benutzerhandbuch, Chatbot, Knowledge Graph und Vertragsanlagen für SIRIUS.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Dokumentation", detail: "Mehrere lokale HTML-Anwendungen mit Bilddatenbank und Benutzerhandbuch.", location: "C:\\2026\\Claude\\oneSCM Doku\\SIRIUS_Chatbot_App.html", createdAt: "23.06.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-webinar-recorder", title: "Webinar Screen Recorder", description: "Windows-App für Webinar-Screenshots, Audioaufzeichnung, OCR und lokale Transkription.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Dokumentation", detail: "Python/Windows-Anwendung mit EXE-Build, Aufnahmebereich und lokaler Whisper-Transkription.", location: "C:\\2026\\Claude\\Videoscreen", createdAt: "17.07.2026", checkedAt: "11.08.2026" },
  { id: "claude-workspace-wad", title: "WAD 2026 Explorer", description: "Designauswahl für den WeAreDevelopers World Congress 2026 Explorer.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Organisation", detail: "Statische HTML-Designvarianten für den WAD-Explorer.", location: "C:\\2026\\Claude\\WAD_2026\\index.html", createdAt: "06.07.2026", checkedAt: "11.08.2026" },
];
const googleStudioTestResults: Record<string, Pick<Tool, "trafficLight" | "trafficNote" | "performance">> = {
  "google-studio-vibe-web": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-vibe-android": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-excel-sharepoint": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-jira-release-qa": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-intellifile": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-gmx": { trafficLight: "green", trafficNote: "Editor und echte Vorschau laden bis zum MailArchive-Pro-Login.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor sowie Vorschau erfolgreich geladen." },
  "google-studio-taxflow": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-code-smells": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-studienbescheinigung": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-jiraextender": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-untitled": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-phasen": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-usecase": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-kihub": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-n8n-support": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-presentation": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-app-building": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-n8n-expert": { trafficLight: "gray", trafficNote: "Editor lädt, aber ein Modellanbieter-Fehler blockiert die Vorschau.", performance: "Einzeltest 11.08.2026: Editor geöffnet; Preview-Steuerung wegen wiederholtem Provider-Fehler deaktiviert." },
  "google-studio-featurewatch": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-systemdoc": { trafficLight: "green", trafficNote: "Google AI Studio lädt; Editor und Preview vorhanden.", performance: "Einzeltest 11.08.2026: Google-AI-Studio-Editor geladen." },
  "google-studio-release-hub": { trafficLight: "gray", trafficNote: "App vorhanden, aber Google meldet eine überschrittene Projekt-Quota.", performance: "Einzeltest 11.08.2026: Editor erreichbar; Modell-/Projektliste durch Google-Quota blockiert." },
  "google-studio-reportmonitor": { trafficLight: "gray", trafficNote: "App vorhanden, aber Google meldet eine überschrittene Modell-Quota.", performance: "Einzeltest 11.08.2026: Editor erreichbar; Modellliste durch Google-Quota blockiert." },
  "google-studio-einnahmen": { trafficLight: "red", trafficNote: "Google AI Studio liefert „Seite nicht gefunden“.", performance: "Einzeltest 11.08.2026: Direkter Link nicht vorhanden." },
  "google-studio-social": { trafficLight: "gray", trafficNote: "App vorhanden, aber Google meldet eine überschrittene Modell-Quota.", performance: "Einzeltest 11.08.2026: Editor erreichbar; Modellliste durch Google-Quota blockiert." },
};
const googleStudioModelEvidence: Record<string, string> = {
  "google-studio-gmx": "Gemini 3.5 Flash (im Google-AI-Studio-Verlauf am 11.08.2026 sichtbar)",
  "google-studio-n8n-expert": "Gemini 3.6 Flash (im Google-AI-Studio-Verlauf am 11.08.2026 sichtbar)",
  "google-studio-featurewatch": "Gemini 3.6 Flash (im Google-AI-Studio-Verlauf am 11.08.2026 sichtbar)",
};
const googleStudioTools: Tool[] = [
  { id: "google-studio-vibe-web", title: "Vibe Evaluator", description: "IT Stack und MVP Use Case Evaluator für Konzernumgebungen", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Google-AI-Studio-App zur Bewertung von IT-Stack und MVP-Use-Cases.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/68504720-64f6-456b-97af-3afec59064ea?showPreview=true&showAssistant=true", createdAt: "07.08.2026", checkedAt: "10.08.2026" },
  { id: "google-studio-vibe-android", title: "Vibe Evaluator Android", description: "IT Stack Evaluator für Rapid Prototyping in DAX-Konzernen", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Android-Variante des Vibe Evaluators in Google AI Studio.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/c4c56c76-bf5a-4e09-ab4c-ae8c25f12485?showPreview=true&showAssistant=true", createdAt: "07.08.2026", checkedAt: "07.08.2026" },
  { id: "google-studio-excel-sharepoint", title: "Excel to SharePoint List Converter", description: "Automatisierter SharePoint-Listen-Generator aus Excel-Dateien mit PnP PowerShell, Power Automate und Python.", source: "Google Drive", status: "Dokumentiert", category: "Automatisierung", detail: "Google-AI-Studio-App für Excel-zu-SharePoint-Listen.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/94a343a5-7476-4851-ac06-1174cb1d6d98?showPreview=true&showAssistant=true", createdAt: "07.08.2026", checkedAt: "07.08.2026" },
  { id: "google-studio-jira-release-qa", title: "Jira & Release Letter QA Studio", description: "KI-gestützte QA für Jira Tickets und deutsche/englische Releaseletter, mit Word-Export und Screenshots.", source: "Google Drive", status: "Dokumentiert", category: "Kommunikation", detail: "Google-AI-Studio-App für Inhalts- und Übersetzungsprüfung von Releaselettern.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/5c3df07f-c925-40cc-8a70-6967380f14d1?showPreview=true&showAssistant=true", createdAt: "04.08.2026", checkedAt: "04.08.2026" },
  { id: "google-studio-intellifile", title: "IntelliFile Organizer", description: "KI-gestützte Dateiverwaltung und Bildersuche", source: "Google Drive", status: "Dokumentiert", category: "Katalog", detail: "Google-AI-Studio-App zur Datei- und Bildorganisation.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/0458f263-b472-4f20-b580-9ea40302177d?showPreview=true&showAssistant=true", createdAt: "28.06.2026", checkedAt: "15.07.2026" },
  { id: "google-studio-gmx", title: "GMX Mail Importer", description: "Import, Filter und Export von GMX-E-Mails inklusive Anhängen", source: "Google Drive", status: "Dokumentiert", category: "Kommunikation", detail: "Google-AI-Studio-App für GMX-Mail-Verarbeitung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/9178a5d0-a2a0-490f-934a-a9002d98bfdf?showPreview=true&showAssistant=true", createdAt: "11.07.2026", checkedAt: "15.07.2026" },
  { id: "google-studio-taxflow", title: "TaxFlow", description: "Buchhaltungssystem mit KI-Steuerberater, Belegen, Reisekosten und DATEV-kompatiblem Export.", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Google-AI-Studio-App für Buchhaltung und Steuerprozesse.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/1a9c516d-4656-4333-8309-22368ef85b1d?showPreview=true&showAssistant=true", createdAt: "14.03.2026", checkedAt: "15.07.2026" },
  { id: "google-studio-code-smells", title: "Clean Code Smells Guide", description: "Interaktive Referenz-App für Code Smells mit Erklärungen, Tipps und Empfehlungen auf Deutsch.", source: "Google Drive", status: "Dokumentiert", category: "KI", detail: "Google-AI-Studio-App für Code-Qualität.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/6ff17327-92a1-499d-a950-8f389bea8168?showPreview=true&showAssistant=true", createdAt: "05.07.2026", checkedAt: "05.07.2026" },
  { id: "google-studio-studienbescheinigung", title: "Studienbescheinigung 2026", description: "Digitale Immatrikulationsbescheinigung mit dynamischer Semesterauswahl und Druckfunktion.", source: "Google Drive", status: "Dokumentiert", category: "Organisation", detail: "Google-AI-Studio-App zur digitalen Studienbescheinigung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/85c39714-7a3e-4066-93e8-01066d7be8b9?showPreview=true&showAssistant=true", createdAt: "28.06.2026", checkedAt: "01.07.2026" },
  { id: "google-studio-jiraextender", title: "JiraExtender - IT Ticket Management", description: "Jira-Tickets importieren, klassifizieren und verwalten, inklusive Admin, Nutzerbereichen, Bild- und Dokumentarchiv.", source: "Google Drive", status: "Dokumentiert", category: "Automatisierung", detail: "Google-AI-Studio-App für Jira-Ticket-Management.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/2c38d148-1924-444a-91bc-c5c52a124cb8?showPreview=true&showAssistant=true", createdAt: "10.03.2026", checkedAt: "28.06.2026" },
  { id: "google-studio-untitled", title: "Untitled", description: "Keine Beschreibung in Google AI Studio hinterlegt.", source: "Google Drive", status: "Prüfen", category: "KI", detail: "Unbenannte Google-AI-Studio-App; fachliche Einordnung steht aus.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/7712247a-b2df-4176-95b7-ef5ef10a4b18?showPreview=true&showAssistant=true", createdAt: "12.05.2026", checkedAt: "16.06.2026" },
  { id: "google-studio-phasen", title: "AI-Phasen Projektmanager", description: "Projektplaner für KI-Entwicklung auf Basis eines 7-Phasen-Modells.", source: "Google Drive", status: "Dokumentiert", category: "Organisation", detail: "Google-AI-Studio-App für KI-Projektplanung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/9d9c831f-05a4-471b-8be1-610944156700?showPreview=true&showAssistant=true", createdAt: "18.04.2026", checkedAt: "16.06.2026" },
  { id: "google-studio-usecase", title: "Use-Case Manager Pro", description: "Business-Use-Cases entdecken, priorisieren und mit RICE sowie ROI bewerten.", source: "Google Drive", status: "Dokumentiert", category: "Beratung", detail: "Google-AI-Studio-App für Use-Case-Priorisierung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/34431d08-f200-4533-a46d-556028855017?showPreview=true&showAssistant=true", createdAt: "20.03.2026", checkedAt: "13.06.2026" },
  { id: "google-studio-kihub", title: "KI-Hub 2026", description: "Zentrale Plattform für KI-gestützte Produktivität und Zusammenarbeit", source: "Google Drive", status: "Dokumentiert", category: "Katalog", detail: "Google-AI-Studio-App als KI-Produktivitäts-Hub.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/c51f32f9-c21a-4290-ae4b-7f7e70e544eb?showPreview=true&showAssistant=true", createdAt: "12.03.2026", checkedAt: "13.06.2026" },
  { id: "google-studio-n8n-support", title: "n8n Support Ticket Automator", description: "n8n-Workflow und Leitfaden für KI-Zusammenfassungen von Supporttickets nach Slack.", source: "Google Drive", status: "Dokumentiert", category: "Automatisierung", detail: "Google-AI-Studio-App für Supportticket-Automatisierung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/3a8e489c-2b8a-4433-b855-8146cf968487?showPreview=true&showAssistant=true", createdAt: "22.04.2026", checkedAt: "30.04.2026" },
  { id: "google-studio-presentation", title: "AI Presentation Builder", description: "Präsentationen per Spracheingabe, mit drei Designstilen, Architekturdiagrammen und KI-Bildern.", source: "Google Drive", status: "Dokumentiert", category: "Präsentation", detail: "Google-AI-Studio-App für KI-gestützte Präsentationen.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/1827120f-0923-4b06-8fee-65cdb23838d5?showPreview=true&showAssistant=true", createdAt: "13.03.2026", checkedAt: "29.04.2026" },
  { id: "google-studio-app-building", title: "APP Building V.1.0", description: "Leitfaden und Template für Apps in Gemini AI Studio, mit zwölf Kernbausteinen von Authentifizierung bis Export.", source: "Google Drive", status: "Dokumentiert", category: "KI", detail: "Google-AI-Studio-App für standardisierte App-Erstellung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/b30c0a26-ffb4-441f-9b61-e1d9e9269de1?showPreview=true&showAssistant=true", createdAt: "26.04.2026", checkedAt: "28.04.2026" },
  { id: "google-studio-n8n-expert", title: "N8N Workflow Expert", description: "n8n-Workflows mit Gemini AI interpretieren, analysieren und archivieren.", source: "Google Drive", status: "Dokumentiert", category: "Automatisierung", detail: "Google-AI-Studio-App für n8n-Workflow-Analyse.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/a494e7d4-f2c9-43f6-97ff-2f7f4d48a221?showPreview=true&showAssistant=true", createdAt: "18.04.2026", checkedAt: "20.04.2026" },
  { id: "google-studio-featurewatch", title: "FeatureWatch", description: "Agile Feature- und Aufgabenplanung für Teams", source: "Google Drive", status: "Dokumentiert", category: "Organisation", detail: "Google-AI-Studio-App für Feature-Planung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/49e68d5b-aa1a-4c65-abbb-fef1ecba24ac?showPreview=true&showAssistant=true", createdAt: "19.04.2026", checkedAt: "20.04.2026" },
  { id: "google-studio-systemdoc", title: "SystemDOC", description: "Enterprise-Systemdokumentation und Lineage-Tool mit Mandantenfähigkeit.", source: "Google Drive", status: "Dokumentiert", category: "Dokumentation", detail: "Google-AI-Studio-App für Systemdokumentation.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/bf171343-5d4a-4e95-8662-2d9a9807869e?showPreview=true&showAssistant=true", createdAt: "13.03.2026", checkedAt: "17.04.2026" },
  { id: "google-studio-release-hub", title: "Release Hub oneSCM", description: "Plattform zum Veröffentlichen und Verwalten mehrsprachiger Release Notes und Briefe.", source: "Google Drive", status: "Dokumentiert", category: "Kommunikation", detail: "Google-AI-Studio-App für Release-Kommunikation.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/2062e7c5-6993-4a45-8a35-9c11f53f27b3?showPreview=true&showAssistant=true", createdAt: "28.02.2026", checkedAt: "16.04.2026" },
  { id: "google-studio-reportmonitor", title: "ReportMonitor", description: "Gesamtdokumentation und Monitoring-Dashboard für Geschäfts-, Prozess- und Steuerungskennzahlen.", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Google-AI-Studio-App für Monitoring und Dokumentation.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/4bc99f33-f10e-498f-a99a-a57e79feebec?showPreview=true&showAssistant=true", createdAt: "20.03.2026", checkedAt: "11.04.2026" },
  { id: "google-studio-einnahmen", title: "Einnahmen Treppendiagramm", description: "Interaktives Treppendiagramm für Einnahmen auf Basis einer editierbaren Datentabelle.", source: "Google Drive", status: "Dokumentiert", category: "Analyse", detail: "Google-AI-Studio-App zur Einnahmenvisualisierung.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/b7db094b-6032-4beb-b9c8-2ebe9d41dd8c?showPreview=true&showAssistant=true", createdAt: "28.02.2026", checkedAt: "29.03.2026" },
  { id: "google-studio-social", title: "Social Media Content Generator", description: "Maßgeschneiderte Posts und Bilder für LinkedIn, Twitter und Instagram erzeugen.", source: "Google Drive", status: "Dokumentiert", category: "Kommunikation", detail: "Google-AI-Studio-App für Social-Media-Inhalte.", location: "Google AI Studio / My apps", url: "https://aistudio.google.com/apps/d242ae67-d15b-4807-89c6-913100c85f80?showPreview=true&showAssistant=true", createdAt: "12.03.2026", checkedAt: "12.03.2026" },
].map((tool) => ({ ...tool, ...googleStudioTestResults[tool.id] }));
const codexDiscoveredTools: Tool[] = [
  { id: "codex-n8n", title: "Codex N8N Releaseletter-System", description: "Multi-Agent-Grundgeruest fuer Releaseletter, Freigaben und Ausspielung.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Automatisierung", detail: "Codex-Projekt mit Workflow-, Ontologie-, Graph- und Infrastrukturartefakten.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\Codex N8N", overlap: "Releaseletter · Dify Releaseletter · n8n", checkedAt: "11.08.2026", performance: "Quellcode und Archive vorhanden; keine laufende Web-App gestartet" },
  { id: "voice-presentation", title: "Voice Präsentationstool", description: "Codex-Projekt fuer sprachgesteuerte Präsentationssuche.", source: "Lokaler Rechner", status: "Entwurf", category: "Präsentation", detail: "Projektordner wurde im Codex gefunden; im Stammordner liegt noch keine lauffaehige Anwendung.", location: "C:\\2026\\Codex\\Voice Präsentationstool", overlap: "Präsentations-Finder · Presentation Designer", checkedAt: "11.08.2026", performance: "Kein Startpunkt im Projektordner gefunden" },
  { id: "funding", title: "Förderantrag", description: "Codex-Projekt mit Antragunterlagen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Analyse", detail: "Im Projektordner liegt derzeit eine PDF-Antragsunterlage.", location: "C:\\2026\\Codex\\Förderantrag", checkedAt: "11.08.2026", performance: "Dokumentenbestand vorhanden; keine Web-App" },
  { id: "n8n-excel", title: "Investitions-Dashboard", description: "Web-App fuer Investitionsentscheidungen auf Basis von Excel-Auswertungen.", source: "Lokaler Rechner", status: "Aktiv", category: "Analyse", detail: "Node-Anwendung mit Excel-Quellen, Tests und Vercel-Konfiguration.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\N8N Excel Erweiterung", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 3110 (4.587 Bytes). Die Startseite trägt aktuell den Titel „Releaseletter App“; Zuordnung im Projekt weiter prüfen." },
  { id: "n8n-slides", title: "Präsentationsfolien Studio", description: "Lokale Web-App fuer Briefing, Folienentwurf, Bilder und PPTX-Export.", source: "Lokaler Rechner", status: "Aktiv", category: "Präsentation", detail: "Node-App mit SQLite, KI-Konfigurationscheck und überprüftem PPTX-Export.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\N8N Präsentationsfolien", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 3010 (41.276 Bytes). Dokumentierter Bildvorschlags-Test: 152 ms." },
  { id: "transparency", title: "Transparenz Hub", description: "Analyse- und Bearbeitungsplattform fuer Dateien, Bilder und Office-Dokumente.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Katalog", detail: "React- und Express-System fuer Explorer, Preview, Duplikate und Job-Monitor.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\N8N Bildbetrachter", checkedAt: "11.08.2026", performance: "MVP-Quellcode und Testdaten vorhanden; Anwendung noch nicht in dieser Sitzung gestartet" },
  { id: "n8n-library", title: "n8n Bibliothek Dashboard", description: "Durchsuchbare Workflow-Bibliothek mit Graph Memory und Integrationsstatus.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Automatisierung", detail: "Statisches Dashboard mit 200 Workflows, API-Handlern und Graph-Backends.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\N8N Bibliothek", checkedAt: "11.08.2026", performance: "Dokumentierte API- und UI-Checks erfolgreich; keine laufende Instanz getestet" },
  { id: "pc-optimizer", title: "PC Optimizer Dashboard", description: "Browser-App zur Windows- und Programmanalyse.", source: "Lokaler Rechner", status: "Aktiv", category: "Analyse", detail: "Express-Dashboard mit Programmkatalog, JSON-Datenbank und lokalen Windows-Analysen.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\Codex PC analyse", checkedAt: "11.08.2026", performance: "Lokaler Start geprüft: HTTP 200 auf Port 3080 (23.679 Bytes). Anmeldung wurde nicht ausgeführt." },
  { id: "waterdamage", title: "Wasserschaden Fallakte", description: "Codex-Projekt mit Kommunikations- und Argumentationsunterlagen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Verträge", detail: "Sammlung strukturierter Markdown-Protokolle und Zeitstrahlen; keine eigene Web-App gefunden.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\Wasserschaden", checkedAt: "11.08.2026", performance: "Dokumentenbestand vorhanden; keine Web-App" },
  { id: "testing-screen", title: "Testing Screen Tool", description: "Als Codex-Projekt registriertes Testwerkzeug.", source: "Lokaler Rechner", status: "Prüfen", category: "Katalog", detail: "Projektordner ist registriert, enthält im Stammordner aber noch keine identifizierbare Anwendung.", location: "C:\\Users\\andre\\OneDrive\\Dokumente\\Testing Screen Tool", checkedAt: "11.08.2026", performance: "Kein Startpunkt im Projektordner gefunden" },
  { id: "presentation-finder", title: "Präsentations-Finder", description: "Einzelplatz-App mit Sprachsuche, Folien-Thumbnails und lokalen Sicherungen.", source: "Lokaler Rechner", status: "Dokumentiert", category: "Präsentation", detail: "Codex-Projekt mit lokalem Dienst, Eigentümermodus, Hintergrundaufträgen und SQLite-Sicherung.", location: "C:\\Users\\andre\\Documents\\Codex\\2026-07-30\\realtime-voice-chat", overlap: "Voice Präsentationstool · Presentation Designer", checkedAt: "11.08.2026", performance: "Laut letzter Codex-Prüfung: Build, Lint und 9 Tests erfolgreich; lokaler Server auf Port 4310 geprüft" },
  { id: "hackathon", title: "MB AI Hackathon", description: "ChatGPT-Projekt, fachliche Umsetzung noch zu erfassen.", source: "Cloud", status: "Prüfen", category: "KI", detail: "Als ChatGPT-Projekt registriert; es liegt noch keine technische Projektakte im lokalen Katalog vor.", location: "ChatGPT Projekt / MB AI Hackathon", checkedAt: "11.08.2026", performance: "Zugang zur Projektübersicht vorhanden; keine lauffaehige App identifiziert" },
];
const allTools = [...tools, aiMesseGuide, ...claudeWorkspaceTools, ...googleStudioTools, ...codexDiscoveredTools];

function isGoogleStudio(tool: Tool) {
  return tool.id === "studio" || tool.id.startsWith("google-studio-");
}

function isClaudeWorkspace(tool: Tool) {
  return ["overview", "contracts", "dokupress", "slides", "presentation", "releaseletter", "messe"].includes(tool.id) || tool.id.startsWith("claude-workspace-");
}

const claudeSurfaces: Record<string, "Claude Code" | "Claude Desktop"> = {
  overview: "Claude Code",
  contracts: "Claude Desktop",
  dokupress: "Claude Desktop",
  slides: "Claude Desktop",
  presentation: "Claude Desktop",
  releaseletter: "Claude Desktop",
  messe: "Claude Desktop",
  "claude-workspace-app-overview": "Claude Code",
  "claude-workspace-dateibetrachter": "Claude Code",
};

const claudeModelEvidence: Record<string, string> = {
  slides: "Claude Opus 4.8 Vision ist als App-Modell dokumentiert; das Erstellmodell des Artefakts ist nicht separat belegt.",
  presentation: "Claude 3.5 Sonnet ist im Projekt dokumentiert; das Erstellmodell des Artefakts ist nicht separat belegt.",
  contracts: "Erstellmodell nicht nachgewiesen; GPT-4o ist als Produktionsintegration dokumentiert.",
  dokupress: "Erstellmodell nicht nachgewiesen; Qwen ist als lokale Runtime dokumentiert.",
};

function claudeSurfaceFor(tool: Tool) {
  return claudeSurfaces[tool.id] ?? "Claude Desktop";
}

function claudeCreationModelFor(tool: Tool) {
  return claudeModelEvidence[tool.id] ?? "Erstellmodell im Artefakt nicht nachgewiesen";
}

function sourceIconFor(tool: Tool) {
  if (isGoogleStudio(tool)) return "G";
  if (isClaudeWorkspace(tool)) return "C";
  return tool.source === "GitHub" ? "GH" : tool.source === "Google Drive" ? "GD" : tool.source === "Cloud" ? "CL" : "PC";
}

function ProviderIcon({ tool, detail = false }: { tool: Tool; detail?: boolean }) {
  const className = `${detail ? "detail-icon" : "source-icon"} ${isGoogleStudio(tool) ? "google-icon" : isClaudeWorkspace(tool) ? "claude-icon" : ""}`;
  if (isClaudeWorkspace(tool)) return <span className={className} title="Claude / Anthropic"><img src="https://cdn.simpleicons.org/anthropic/D97757" alt="Claude" /></span>;
  return <span className={className} aria-hidden="true">{sourceIconFor(tool)}</span>;
}

function ClaudeSurfaceBadge({ tool }: { tool: Tool }) {
  if (!isClaudeWorkspace(tool)) return null;
  const surface = claudeSurfaceFor(tool);
  return <span className={`claude-surface ${surface === "Claude Code" ? "code" : "desktop"}`} title={`${surface} · ${claudeCreationModelFor(tool)}`} aria-label={`${surface}. ${claudeCreationModelFor(tool)}`}><b aria-hidden="true">{surface === "Claude Code" ? "&lt;/&gt;" : "▣"}</b><small>{surface === "Claude Code" ? "Code" : "Desktop"}</small></span>;
}

function trafficLabelFor(tool: Tool) {
  return tool.trafficLight === "green" ? "Lauffähig" : tool.trafficLight === "gray" ? "Inaktiv / blockiert" : tool.trafficLight === "red" ? "Nicht vorhanden" : null;
}

const fullyDocumentedIds = new Set([
  "overview", "business", "contracts", "dokupress", "slides", "presentation", "releaseletter", "dify", "event", "messe",
  "codex-n8n", "n8n-excel", "n8n-slides", "transparency", "n8n-library", "pc-optimizer", "presentation-finder",
]);

function documentationStateFor(tool: Tool) {
  return fullyDocumentedIds.has(tool.id) ? "Fertig dokumentiert" : "Teilweise dokumentiert";
}

function documentationScoreFor(tool: Tool) {
  if (documentationStateFor(tool) === "Fertig dokumentiert") return tool.performance ? 90 : 82;
  if (tool.status === "Entwurf") return 35;
  return 55;
}

function tagsFor(tool: Tool) {
  return [tool.category, tool.source, "KI-gestützt", "2026", "Web-App", "Weiterentwicklung", "Inventur", ...categoryTags[tool.category] ?? []].slice(0, 10);
}

function scopeFor(tool: Tool) {
  return ["Bau", "Beratung", "Verträge", "Dokumentation", "Kommunikation", "Analyse"].includes(tool.category) ? "Beruflich" : "Privat und beruflich prüfen";
}

function quickStartFor(tool: Tool) {
  if (tool.url) return tool.url;
  if (tool.source === "Google Drive") return "https://drive.google.com/drive/home";
  return `file:///${tool.location.replace(/\\/g, "/")}`;
}

function testTargetFor(tool: Tool) {
  return localHrefFor(tool) ?? quickStartFor(tool);
}

function accessProfileFor(tool: Tool) {
  if (isGoogleStudio(tool)) return "Google-Anmeldung; aktive Sitzung im Browser";
  if (tool.source === "GitHub") return "GitHub-Zugang je Repository; keine Zugangsdaten im Katalog gespeichert";
  if (tool.url?.startsWith("https://")) return "Direktlink; Anmeldung nur falls die Ziel-App sie verlangt";
  if (localHrefFor(tool)) return "Lokal auf diesem Rechner; keine Zugangsdaten im Katalog gespeichert";
  if (tool.source === "Cloud") return "Cloud-Konto erforderlich; Zugangsdaten nicht im Katalog speichern";
  return "Lokaler Ordnerzugang; keine Zugangsdaten im Katalog gespeichert";
}

function archiveFor(tool: Tool) {
  if (tool.archive) return tool.archive;
  if (tool.source === "GitHub" && tool.url) return tool.url;
  if (tool.source === "Google Drive") return "https://drive.google.com/drive/home";
  if (tool.source === "Cloud") return "https://chatgpt.com/";
  return quickStartFor(tool);
}

function folderFor(tool: Tool) {
  return tool.source === "Lokaler Rechner" ? quickStartFor(tool) : archiveFor(tool);
}

function statusFor(tool: Tool) {
  return `${tool.status} · Stand ${tool.checkedAt ?? "erste Inventur"}`;
}

function architectureFor(tool: Tool) {
  if (tool.id === "bau") return { frontend: "HTML, CSS und JavaScript", middleware: "Keine separate Schicht erfasst", backend: "Lokale Dokumente und Dateien" };
  if (tool.id === "contracts") return { frontend: "Web-App (genau prüfen)", middleware: "Multi-Agent-Workflows", backend: "Datenbankmodell und Vertragsdaten" };
  if (tool.id === "dokupress") return { frontend: "Noch zu ergänzen", middleware: "API-Backend", backend: "PostgreSQL mit Mandantentrennung" };
  if (tool.id === "n8n") return { frontend: "n8n-Oberfläche", middleware: "n8n-Workflow", backend: "Jira- und Releaseletter-Integration" };
  if (tool.source === "Google Drive") return { frontend: "Artefakt oder Dokument", middleware: "Noch zu prüfen", backend: "Google Drive" };
  if (tool.source === "GitHub") return { frontend: "Aus Repository analysieren", middleware: "Noch zu prüfen", backend: "Noch zu prüfen" };
  return { frontend: "Web-Oberfläche", middleware: "Noch zu prüfen", backend: "Lokale Projektdateien" };
}

function featuresFor(tool: Tool) {
  const shared = ["Screenshot und Live-Link hinterlegen", "Nutzung und Tokenverbrauch messen", "Verantwortlichkeit und Status pflegen"];
  if (tool.category === "Katalog") return ["Automatische Inventur weiterer Rechner", "Dubletten-Erkennung aus Funktionen und Code", "Vorschau pro Anwendung", ...shared];
  if (tool.category === "Verträge") return ["Vertragsvergleich und Fristenwarnung", "Dokumenten-Upload mit Suche", ...shared];
  if (tool.category === "Präsentation") return ["Vorlagenbibliothek", "Export-Qualitätsprüfung", ...shared];
  return ["Quellen sauber verknüpfen", "Prioritäten und nächste Schritte erfassen", ...shared];
}

function builtWithFor(tool: Tool) {
  const builders: Record<string, string> = { overview: "Claude", business: "Codex", bau: "Codex", calendar: "Codex", contracts: "Claude", dokupress: "Claude und Fable", slides: "Claude", presentation: "Claude", releaseletter: "Claude", studio: "Google AI Studio", n8n: "n8n", knowledge: "Google Drive / unbekannt", messe: "Claude" };
  return builders[tool.id] ?? (tool.source === "GitHub" ? "GitHub-Repository - genauer Ursprung folgt" : "Noch zu erfassen");
}

function databaseFor(tool: Tool) {
  if (tool.id === "messe") return "Supabase PostgreSQL optional; lokal LocalStorage und IndexedDB";
  if (tool.id === "dokupress") return "PostgreSQL mit Mandantentrennung";
  if (tool.id === "calendar") return "Lokale SQLite-Datenbank";
  if (tool.id === "contracts") return "Datenbankmodell vorhanden - Zielsystem wird geprüft";
  if (tool.id === "n8n") return "n8n-Workflowdaten und angebundene Systeme";
  if (tool.source === "Google Drive") return "Google Drive als Dokumentenablage";
  return "Noch keine Datenbank erfasst";
}

function connectionsFor(tool: Tool) {
  const connections: Record<string, string[]> = { messe: ["GitHub zu Vercel Deployment", "Supabase Auth mit MFA", "Supabase Cloud-Sync und Row-Level Security"], presentation: ["Anthropic API", "OpenAI API", "Google Gemini API", "Notion API", "Web Speech und Canvas API"], dokupress: ["PostgreSQL", "Jira-Webhook", "Confluence-Webhook", "LibreTranslate", "llama.cpp und ffmpeg"], slides: ["Anthropic API", "PowerPoint Export"], business: ["Lokale Node-API", "SQLite-Katalog", "Offizielle Produkt- und Preisquellen"], n8n: ["n8n", "Jira", "Releaseletter-Workflow"] };
  return connections[tool.id] ?? (tool.source === "GitHub" ? ["GitHub Repository", "Weitere Verbindungen werden aus dem Code ermittelt"] : ["Noch nicht verifiziert"]);
}

function modelsFor(tool: Tool) {
  const models: Record<string, string> = { presentation: "Claude 3.5 Sonnet, GPT-4 Turbo und Gemini Pro", dokupress: "Qwen2.5 1.5B Instruct Q4 lokal ueber llama.cpp", slides: "Claude Opus 4.8 Vision", studio: "Google AI Studio - genauer Modellname noch erfassen", messe: "Kein LLM im App-Code dokumentiert" };
  return models[tool.id] ?? "Kein Modellbezug verifiziert";
}

function screensFor(tool: Tool) {
  const authentic: Record<string, { src: string; title: string; source: string }[]> = {
    overview: [
      { src: "/screenshots/master-1.png", title: "Herkunft & Tool", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-2.png", title: "Masterdaten", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-3.png", title: "Tags", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-4.png", title: "IT-Architektur", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-5.png", title: "Neue Features", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-6.png", title: "Dashboard", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-7.png", title: "Schnellfilter", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-8.png", title: "Arbeitsfenster", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-9.png", title: "Architektur & Daten", source: "Originalansicht der AI-Artefakte Übersicht" },
      { src: "/screenshots/master-10.png", title: "Screens-Register", source: "Originalansicht der AI-Artefakte Übersicht" },
    ],
    business: [
      { src: "/screenshots/ai-business-berater-catalog-live.png", title: "Technologie-Katalog", source: "Echte lokale Live-App" },
      { src: "/screenshots/ai-business-berater-graph-live.png", title: "Technologie-Beziehungsgraph", source: "Echte lokale Live-App" },
    ],
    "contracts-hub": [
      { src: "/screenshots/service-kpis.png", title: "Kennzahlen", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-campaigns.png", title: "Kampagnen", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-retention.png", title: "Kundenbindung", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-market-share.png", title: "Marktanteile", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-lohn-teile.png", title: "Lohn und Teile", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-swot.png", title: "SWOT", source: "Originalbild aus dem Repository" },
      { src: "/screenshots/service-werkstattrechnung.png", title: "Werkstattrechnung", source: "Originalbild aus dem Repository" },
    ],
    messe: [
      { src: "/screenshots/ai-messe-dashboard-live.png", title: "Live Dashboard", source: "Echte Live-App" },
      { src: "/screenshots/ai-messe-calendar-live.png", title: "Veranstaltungskalender", source: "Echte Live-App" },
      { src: "/screenshots/ai-messe-costs-live.png", title: "Kosten & Budget", source: "Echte Live-App" },
    ],
    event: [
      { src: "/screenshots/ai-messe-dashboard-live.png", title: "Live Dashboard", source: "Echte Live-App derselben Codebasis" },
      { src: "/screenshots/ai-messe-calendar-live.png", title: "Veranstaltungskalender", source: "Echte Live-App derselben Codebasis" },
      { src: "/screenshots/ai-messe-costs-live.png", title: "Kosten & Budget", source: "Echte Live-App derselben Codebasis" },
    ],
    transparency: [
      { src: "/screenshots/transparency-dashboard.jpg", title: "Dashboard", source: "Original-Mockup aus dem Projekt" },
      { src: "/screenshots/transparency-explorer.jpg", title: "Datei-Explorer", source: "Original-Mockup aus dem Projekt" },
    ],
    "n8n-library": [
      { src: "/screenshots/n8n-library-dashboard.png", title: "Bibliothek Dashboard", source: "Original-Testansicht aus dem Projekt" },
      { src: "/screenshots/n8n-library-workflows.png", title: "Workflow Hub", source: "Original-Testansicht aus dem Projekt" },
    ],
    "pc-optimizer": [
      { src: "/screenshots/pc-optimizer-overview.jpg", title: "Gesamtsicht", source: "Original-Mockup aus dem Projekt" },
      { src: "/screenshots/pc-optimizer-operations.jpg", title: "Operations", source: "Original-Mockup aus dem Projekt" },
    ],
    "n8n-excel": [
      { src: "/screenshots/investment-cashflow.png", title: "Investitionen und Cashflow", source: "Original-Auswertung aus dem Projekt" },
      { src: "/screenshots/investment-interest.png", title: "Zinssensitivitaet", source: "Original-Auswertung aus dem Projekt" },
    ],
  };
  return authentic[tool.id] ?? [];
}

type AppDetails = { builder: string; frontend: string; middleware: string; backend: string; database: string; connections: string; models: string; evidence: string; access?: string };

const appDetails: Record<string, AppDetails> = {
  overview: { builder: "Claude Code", frontend: "HTML, CSS und JavaScript", middleware: "Python Dashboard-Service optional", backend: "Lokale JSON-Dateien und Browser-Speicher", database: "Keine zentrale Datenbank; Admin-Entscheidungen lokal im Browser", connections: "Lokale Projektpfade, GitHub-Links, optional lokaler HTTP-Server", models: "Kein Modellaufruf im Dashboard belegt", evidence: "README, package.json und lokale Projektdateien" },
  business: { builder: "Codex", frontend: "Statisches Web-Frontend", middleware: "Node HTTP-Server mit API und Exporten", backend: "Node.js", database: "SQLite: storage/catalog.sqlite", connections: "Lokale API, gespeicherte Produkt- und Preisquellen", models: "Kein Modellaufruf im Code belegt", evidence: "README und db.js" },
  bau: { builder: "Codex", frontend: "HTML, CSS und JavaScript", middleware: "Keine separate Schicht", backend: "Lokale Dateien und PDF-Dokumente", database: "Keine Datenbank erfasst", connections: "Lokale Vertrags- und Baudokumente", models: "Kein Modellbezug erfasst", evidence: "index.html, app.js und lokale PDFs" },
  calendar: { builder: "Codex", frontend: "Lokale Kalenderauswertung", middleware: "Lokale Filter und Auswertung", backend: "Lokale Kalenderdaten", database: "SQLite: calendar.sqlite", connections: "CSV- und JSON-Exporte", models: "Kein Modellbezug erfasst", evidence: "calendar.sqlite sowie CSV- und JSON-Dateien" },
  contracts: { builder: "Claude", frontend: "React 18 und Vite", middleware: "n8n Agent-Workflows", backend: "In der aktuellen App Frontend-Demo; Produktion ueber n8n", database: "PostgreSQL geplant: 25 Tabellen", connections: "n8n Webhooks, OpenAI Credentials, Vercel-Konfiguration", models: "OpenAI GPT-4o; produktive Credentials noch nicht eingebunden", evidence: "README, App.jsx, package.json und vercel.json" },
  "contracts-hub": { builder: "Repository-Projekt; Ursprung nicht dokumentiert", frontend: "Statisches HTML, CSS und JavaScript", middleware: "Keine separate Middleware", backend: "Clientseitiges Dashboard mit eingebetteten Daten", database: "Keine Datenbank im Repository belegt", connections: "Google Fonts; lokale Daten-, Filter-, Galerie- und Exportmodule", models: "Kein Modellbezug im Code belegt", evidence: "index.html, app.js, data.js, Export- und Filtermodule", access: "Ohne Anmeldung als statische Anwendung lauffaehig" },
  dokupress: { builder: "Claude und Fable", frontend: "Redaktions-Frontend", middleware: "Node.js und Express API", backend: "Node.js mit Import, Export und Webhooks", database: "PostgreSQL mit RLS-Mandantentrennung", connections: "Jira, Confluence, LibreTranslate, llama.cpp, ffmpeg und Medien-API", models: "Qwen2.5 1.5B Instruct Q4 lokal ueber llama.cpp", evidence: "README, server.js und package.json" },
  slides: { builder: "Claude", frontend: "Lokale Upload- und Folienoberflaeche", middleware: "Node.js Server", backend: "Claude Vision Analyse und PowerPoint-Export", database: "Keine Datenbank dokumentiert", connections: "Anthropic API und PPTX-Export", models: "Claude Opus 4.8 Vision", evidence: "README und server.js" },
  presentation: { builder: "Claude", frontend: "React und Vite", middleware: "LLM-Service im Browser", backend: "Externe KI-APIs und Notion-Sync", database: "Keine eigene Datenbank; Notion als Cloud-Sync", connections: "Anthropic, OpenAI, Google Gemini, Notion, Web Speech und Canvas API", models: "Claude 3.5 Sonnet, GPT-4 Turbo und Gemini Pro", evidence: "README und src/services/llmService.js" },
  thumbnail: { builder: "Claude", frontend: "React 18, Tailwind CSS und Vite", middleware: "Browser-Services, Web Worker und Service-Module", backend: "Direkte Browser-Aufrufe an optionale KI- und Notion-Schnittstellen", database: "LocalStorage; Notion-Datenbank optional fuer Cloud-Sync", connections: "Anthropic, OpenAI, Google Gemini, Notion, JSZip, Tesseract OCR, Canvas, Web Speech und PPTX-Worker", models: "Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro; Llama nur als Platzhalter", evidence: "README, package.json, llmService.js und databaseService.js", access: "Start ohne Login; KI- und Notion-Funktionen brauchen eigene API-Konfiguration" },
  releaseletter: { builder: "Claude", frontend: "Word- und Dokumentvorlagen", middleware: "Python und n8n Workflow", backend: "Jira-Import und Dokumenterzeugung", database: "Keine Datenbank im aktuellen Setup; Logging optional", connections: "Jira, n8n Webhook, Word- und PDF-Export", models: "Kein Modellbezug im aktuellen Workflow dokumentiert", evidence: "COMPLETE_SETUP_GUIDE und n8n-Dokumentation" },
  dify: { builder: "Dify und n8n", frontend: "Dify Workflow-Oberflaeche", middleware: "n8n Jira-Trigger und Python-Code-Nodes", backend: "Dify Workflow-Run-API", database: "Keine Datenbank im exportierten Workflow belegt", connections: "Jira Cloud oder Jira Automation, n8n und Dify API", models: "GPT-4o ist als DSL-Platzhalter eingetragen; in Dify muss ein freigegebenes Modell gewaehlt werden", evidence: "Dify-Workflow-DSL, n8n Bridge, Jira-Trigger-Dokumentation", access: "Login in Jira, n8n und Dify erforderlich; Zugangsdaten sind nicht im Repository hinterlegt" },
  studio: { builder: "Google AI Studio", frontend: "Google AI Studio Artefakte", middleware: "Google Plattform", backend: "Google Drive Ablage", database: "Google Drive als Artefaktablage", connections: "Google Drive, Video- und Bildartefakte", models: "Gemini-Modellname in den abgelegten Artefakten noch nicht verifiziert", evidence: "Google-Drive-Ordnerinhalt" },
  n8n: { builder: "n8n", frontend: "n8n Editor", middleware: "n8n Workflow", backend: "Jira- und Releaseletter-Verarbeitung", database: "Keine Datenbank im exportierten Workflow belegt", connections: "Jira und Releaseletter-Webhook", models: "Kein Modellbezug im exportierten Workflow verifiziert", evidence: "Google-Drive-Workflowdatei und Releaseletter-Dokumentation" },
  knowledge: { builder: "Noch zu pruefen", frontend: "HTML-Artefakt", middleware: "Noch zu pruefen", backend: "Google Drive Ablage", database: "Keine Datenbank erfasst", connections: "Google Drive", models: "Noch zu pruefen", evidence: "KnowledgeHub App.html in Google Drive" },
  event: { builder: "Claude", frontend: "Statisches HTML, CSS und JavaScript als Progressive Web App", middleware: "Optionales Supabase Cloud-Modul", backend: "Supabase Auth, Synchronisierung und Konto-Loeschung optional", database: "Supabase PostgreSQL optional; sonst LocalStorage und IndexedDB", connections: "GitHub zu Vercel, Supabase MFA, Google-Kalender-Links, ICS-Export und EZB-Wechselkurse", models: "Kein LLM im App-Code belegt", evidence: "README, cloud.js, db.js, schema.sql, vercel.json und Live-App", access: "Lokal ohne Login nutzbar; Cloud-Login mit Supabase-Konfiguration und MFA" },
  messe: { builder: "Claude", frontend: "Statisches HTML, CSS und JavaScript", middleware: "Optionales Supabase Cloud-Modul", backend: "Supabase Auth, Sync und Konto-Loeschung", database: "Supabase PostgreSQL optional; lokal LocalStorage und IndexedDB", connections: "GitHub zu Vercel Deployment, Supabase MFA, Cloud-Sync und Row-Level Security", models: "Kein LLM im App-Code dokumentiert", evidence: "README, cloud.js, schema.sql, vercel.json und Live-Screen", access: "Live-App ohne Konto sichtbar; Cloud-Login ist erst nach Supabase-Konfiguration verfuegbar" },
  cost: { builder: "Noch zu pruefen", frontend: "Dokument- und Analyseartefakte", middleware: "Noch zu pruefen", backend: "Google Drive Ablage", database: "Keine Datenbank erfasst", connections: "Google Drive und PDF-Unterlagen", models: "Kein Modellbezug verifiziert", evidence: "Google-Drive-PDFs und Managementunterlagen" },
  "codex-n8n": { builder: "Codex", frontend: "Control-Center Frontend-Skelett", middleware: "n8n Orchestrierungs- und Freigabe-Workflows", backend: "Docker-Compose und Agenten-Infrastruktur", database: "Graphdatenbank als Zielarchitektur", connections: "Jira, Confluence, Mural, Excel, Teams und SharePoint", models: "Agentenmodell vorgesehen; konkrete Modelle noch offen", evidence: "README, Workflow-Archive, Ontologie- und Graph-Ordner", access: "Projektarchiv lokal vorhanden; keine laufende Oberfläche registriert" },
  "voice-presentation": { builder: "Codex", frontend: "Noch nicht vorhanden", middleware: "Noch nicht vorhanden", backend: "Noch nicht vorhanden", database: "Noch nicht vorhanden", connections: "Noch keine Verbindung belegt", models: "Noch nicht belegt", evidence: "Codex-Projektregistrierung und leerer Stammordner", access: "Kein App-Startpunkt vorhanden" },
  funding: { builder: "Codex", frontend: "PDF-Unterlage", middleware: "Keine", backend: "Lokaler Dokumentenbestand", database: "Keine", connections: "Keine belegt", models: "Kein Modellbezug belegt", evidence: "Förderantrag LBWW.pdf", access: "Lokaler Dokumentenzugang" },
  "n8n-excel": { builder: "Codex", frontend: "Web-Dashboard", middleware: "Node.js Server", backend: "Excel-Auswertung und Reporting-Skripte", database: "Excel-Arbeitsmappen als Quelldaten", connections: "Vercel-Konfiguration; lokale Excel-, XLSM- und Reportingdateien", models: "Kein Modellbezug im package.json belegt", evidence: "package.json, server.js, Excel-Dateien und Tests", access: "Lokaler Startpunkt vorhanden; keine Anmeldung dokumentiert" },
  "n8n-slides": { builder: "Codex", frontend: "HTML, CSS und clientseitiges JavaScript", middleware: "Node.js API", backend: "Node.js, SQLite und PPTX-Export", database: "SQLite: presentation-studio.db im lokalen AppData", connections: "Lokale Browser-Speicherung fuer KI-Zugangsdaten; PPTX-Export", models: "Modelle waehlen und testen; konkrete Providerkonfiguration lokal", evidence: "README, server.js, client.js und package.json", access: "Lokale Nutzung ohne Konto; KI-Funktionen erst nach eigener API-Konfiguration" },
  transparency: { builder: "Codex", frontend: "React und Vite", middleware: "Express mit Sicherheits-Middleware", backend: "Lokale Datei- und Preview-Pipeline", database: "SQLite im lokalen AppData-Bereich", connections: "Lokale Laufwerke, SharePoint- und Cloud-Connectoren vorbereitet, Office COM", models: "KI-Reorganisationsplaene vorhanden; konkretes Modell noch nicht belegt", evidence: "README, Client- und Server-Workspace", access: "Lokale Konfiguration ueber server/.env erforderlich" },
  "n8n-library": { builder: "Codex", frontend: "React, TypeScript und Vite", middleware: "API-Handler, n8n Workflows und Graph API", backend: "Graph Backends: JSON, Neo4j, Cognee oder Notion", database: "JSON-Fallback oder Neo4j; Notion optional", connections: "Notion, GitHub, Vercel und n8n", models: "Kein konkreter LLM-Aufruf im README belegt", evidence: "README, API-, Graph- und Workflow-Ordner", access: "Demo lokal nutzbar; externe Backends benoetigen eigene Secrets" },
  "pc-optimizer": { builder: "Codex", frontend: "Browser-Dashboard mit sieben Registern", middleware: "Express", backend: "Windows Registry- und Prozessanalyse per PowerShell", database: "Dateibasierte JSON-Datenbank: data/optimizer.db.json", connections: "Lokale Windows-Registry und laufende Prozesse", models: "Kein Modellbezug im README belegt", evidence: "README, app-server.js, package.json und Mockup", access: "Lokaler Login vorhanden; keine Zugangsdaten im Katalog gespeichert oder verwendet" },
  waterdamage: { builder: "Codex", frontend: "Markdown-Dokumente", middleware: "Keine", backend: "Lokale Fallakte", database: "Keine", connections: "Kommunikationsprotokolle und Zeitstrahlen", models: "Kein Modellbezug belegt", evidence: "Sechs lokale Protokoll- und Argumentationsdateien", access: "Lokaler Dokumentenzugang" },
  "testing-screen": { builder: "Codex", frontend: "Noch nicht identifiziert", middleware: "Noch nicht identifiziert", backend: "Noch nicht identifiziert", database: "Noch nicht identifiziert", connections: "Noch nicht identifiziert", models: "Noch nicht identifiziert", evidence: "Codex-Projektregistrierung und leerer Stammordner", access: "Kein App-Startpunkt vorhanden" },
  "presentation-finder": { builder: "Codex", frontend: "Lokale Desktop-nahe Web-Oberflaeche", middleware: "Lokaler Dienst auf 127.0.0.1", backend: "Persistente Hintergrundauftraege fuer Video und Sicherungen", database: "SQLite mit Medien, Vorschaubildern, Exporten und Sicherungsarchiv", connections: "Lokale Dateien, Fotos, Praesentationen und PDFs", models: "Sprachsuche vorgesehen; konkretes Modell nicht aus dem Abschlussbericht belegt", evidence: "Codex-Abschlussbericht, Production-Dokumentation und Teststand", access: "Einzelplatzbetrieb; letzter Bericht bestaetigt lokalen Server und 9 erfolgreiche Tests" },
  hackathon: { builder: "ChatGPT", frontend: "Noch nicht identifiziert", middleware: "Noch nicht identifiziert", backend: "Noch nicht identifiziert", database: "Noch nicht identifiziert", connections: "ChatGPT-Projektbereich", models: "Noch nicht identifiziert", evidence: "ChatGPT-Projektregistrierung", access: "Projekt ist im ChatGPT-Bereich sichtbar; keine lauffaehige App belegt" },
};

function detailsFor(tool: Tool): AppDetails {
  if (isGoogleStudio(tool)) return { builder: "Google AI Studio", frontend: "Google AI Studio App", middleware: "Google AI Studio Plattform", backend: "Google Cloud verwaltet", database: "Nicht in der App-Übersicht verifiziert", connections: "Google AI Studio; weitere Verbindungen pro App noch prüfen", models: googleStudioModelEvidence[tool.id] ?? "Gemini in Google AI Studio; konkretes Modell noch nicht einzeln geprüft", evidence: `Google AI Studio / My apps, am 11.08.2026 geprüft${googleStudioModelEvidence[tool.id] ? "; Einzeltest der App durchgeführt" : ""}`, access: "Öffnet im angemeldeten Google-AI-Studio-Konto" };
  if (appDetails[tool.id]) return appDetails[tool.id];
  if (isClaudeWorkspace(tool)) return { builder: claudeSurfaceFor(tool), frontend: "Lokales Artefakt oder Web-Frontend", middleware: "Noch zu prüfen", backend: "Lokale Projektdateien", database: "Noch nicht verifiziert", connections: "Lokaler Projektordner", models: claudeCreationModelFor(tool), evidence: "Projektordner unter C:\\2026\\Claude, am 11.08.2026 inventarisiert", access: "Öffnet lokal aus dem Projektordner" };
  return { builder: "Noch zu pruefen", frontend: "Noch zu pruefen", middleware: "Noch zu pruefen", backend: "Noch zu pruefen", database: "Noch zu pruefen", connections: "Noch zu pruefen", models: "Noch zu pruefen", evidence: "Noch keine Quelle bewertet" };
}

type BuilderFilter = "Alle" | "Claude" | "Codex" | "Google" | "Lovable";
const builderFilters: BuilderFilter[] = ["Alle", "Claude", "Codex", "Google", "Lovable"];
const creationDates: Record<string, string> = {
  overview: "26.06.2026", business: "05.07.2026", bau: "19.07.2026", calendar: "22.07.2026", contracts: "01.05.2026", dokupress: "01.08.2026", slides: "24.07.2026", presentation: "29.04.2026", releaseletter: "08.05.2026", messe: "06.07.2026",
  "contracts-hub": "08.07.2026", thumbnail: "30.04.2026", dify: "28.07.2026", event: "06.07.2026",
  "codex-n8n": "14.04.2026", "voice-presentation": "30.07.2026", funding: "17.07.2026", "n8n-excel": "15.04.2026", "n8n-slides": "15.04.2026", transparency: "14.04.2026", "n8n-library": "14.04.2026", "pc-optimizer": "14.04.2026", waterdamage: "04.07.2026", "testing-screen": "10.07.2026", "presentation-finder": "30.07.2026",
};

const localPorts: Record<string, string> = {
  overview: "http://localhost:8000", business: "http://localhost:4173", contracts: "http://localhost:5173", dokupress: "http://localhost:8090", slides: "http://localhost:4321", presentation: "http://localhost:5173", messe: "http://localhost:8933",
  "codex-n8n": "http://localhost:3000", "n8n-excel": "http://localhost:3110", "n8n-slides": "http://localhost:3010", transparency: "http://localhost:5173 (API: 4000)", "n8n-library": "http://localhost:4173", "pc-optimizer": "http://localhost:3080", "presentation-finder": "http://localhost:4310",
};

function createdFor(tool: Tool) {
  return tool.createdAt ?? creationDates[tool.id] ?? "Noch nicht verifiziert";
}

function localPortFor(tool: Tool) {
  return localPorts[tool.id] ?? "— (kein lokaler Port)";
}

function localHrefFor(tool: Tool) {
  const port = localPorts[tool.id];
  return port?.startsWith("http") ? port.split(" ")[0] : null;
}

function builderForFilter(tool: Tool): Exclude<BuilderFilter, "Alle"> | "Andere" {
  const builder = detailsFor(tool).builder.toLocaleLowerCase("de");
  if (builder.includes("claude")) return "Claude";
  if (builder.includes("codex")) return "Codex";
  if (builder.includes("google")) return "Google";
  if (builder.includes("lovable")) return "Lovable";
  return "Andere";
}

export default function Home() {
  const [mainView, setMainView] = useState<MainView>("catalog");
  const [controlTab, setControlTab] = useState<ControlTab>("analytics");
  const [darkMode, setDarkMode] = useState(false);
  const [ideaVotes, setIdeaVotes] = useState<Record<string, number>>({});
  const [networkNotice, setNetworkNotice] = useState("Letzte lokale Prüfung: 11.08.2026. Drei hinterlegte Geräte antworten im aktuellen Netz nicht.");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<Source | "Alle">("Alle");
  const [status, setStatus] = useState<Status | "Alle">("Alle");
  const [builderFilter, setBuilderFilter] = useState<BuilderFilter>("Alle");
  const [sortBy, setSortBy] = useState<"created" | "status">("created");
  const [showAllTools, setShowAllTools] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [selectedId, setSelectedId] = useState("overview");
  const [panel, setPanel] = useState<DetailPanel>("masterdata");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [windowTab, setWindowTab] = useState<WindowTab>("profile");
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const selected = allTools.find((tool) => tool.id === selectedId) ?? allTools[0];
  const opened = allTools.find((tool) => tool.id === openedId);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("catalog-theme");
    const savedVotes = window.localStorage.getItem("catalog-feature-votes");
    setDarkMode(savedTheme === "dark");
    if (savedVotes) setIdeaVotes(JSON.parse(savedVotes) as Record<string, number>);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("catalog-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function voteForIdea(id: string) {
    setIdeaVotes((current) => {
      const next = { ...current, [id]: (current[id] ?? 0) + 1 };
      window.localStorage.setItem("catalog-feature-votes", JSON.stringify(next));
      return next;
    });
  }

  function exportCatalog(format: "json" | "csv" | "markdown") {
    const rows = allTools.map((tool) => ({ app: tool.title, dokumentation: documentationStateFor(tool), status: tool.status, quelle: tool.source, port: localPortFor(tool), pruefgrundlage: detailsFor(tool).evidence }));
    const content = format === "json" ? JSON.stringify(rows, null, 2) : format === "csv" ? ["App;Dokumentation;Status;Quelle;Lokaler Port;Prüfgrundlage", ...rows.map((row) => [row.app, row.dokumentation, row.status, row.quelle, row.port, row.pruefgrundlage].map((value) => `\"${value.replaceAll("\"", "\"\"")}\"`).join(";"))].join("\n") : ["# Mein App-Katalog", "", ...rows.map((row) => `- **${row.app}** — ${row.dokumentation}; ${row.status}; ${row.port}`)].join("\n");
    const type = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/markdown";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = `mein-app-katalog.${format === "markdown" ? "md" : format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function openTool(tool: Tool) {
    setSelectedId(tool.id);
    setOpenedId(tool.id);
    setWindowTab("profile");
    setWindowPosition({ x: 0, y: 0 });
  }

  async function copyLocation(tool: Tool) {
    await navigator.clipboard?.writeText(tool.location);
  }

  async function testApp(tool: Tool) {
    const target = testTargetFor(tool);
    const testWindow = window.open(target, "_blank");
    if (testWindow) testWindow.opener = null;

    if (!target.startsWith("https://")) {
      const isLocalWebApp = target.startsWith("http://localhost:");
      setTestResults((current) => ({ ...current, [tool.id]: { phase: "done", message: isLocalWebApp ? `Lokale App wurde auf ${target} in einem neuen Fenster geöffnet.` : "Neues Fenster wurde geöffnet. Lokale Ordner können nicht über einen externen Server geprüft werden." } }));
      return;
    }

    setTestResults((current) => ({ ...current, [tool.id]: { phase: "testing", message: "Neues Fenster geöffnet – Zielserver wird geprüft …" } }));
    try {
      const response = await fetch(`/api/test?url=${encodeURIComponent(target)}`, { cache: "no-store" });
      const data = await response.json() as { outcome?: string; status?: number; durationMs?: number; message?: string; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Der Linktest konnte nicht gestartet werden.");
      const message = data.outcome === "available" ? `Erreichbar: HTTP ${data.status} in ${data.durationMs} ms.` : data.outcome === "login_required" ? `Erreichbar, Anmeldung erforderlich: HTTP ${data.status} in ${data.durationMs} ms.` : data.outcome === "local_only" ? data.message ?? "Lokaler Ordner." : `${data.message ?? "Nicht erreichbar"}${data.status ? ` (HTTP ${data.status})` : ""}`;
      setTestResults((current) => ({ ...current, [tool.id]: { phase: "done", message } }));
    } catch (error) {
      setTestResults((current) => ({ ...current, [tool.id]: { phase: "error", message: error instanceof Error ? error.message : "Linktest fehlgeschlagen." } }));
    }
  }

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button,a")) return;
    drag.current = { startX: event.clientX, startY: event.clientY, x: windowPosition.x, y: windowPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveWindow(event: React.PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    setWindowPosition({ x: drag.current.x + event.clientX - drag.current.startX, y: drag.current.y + event.clientY - drag.current.startY });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return allTools.filter((tool) => {
      const searchable = `${tool.title} ${tool.description} ${tool.category} ${tool.detail} ${tool.location} ${tool.overlap ?? ""}`.toLocaleLowerCase("de");
      return (source === "Alle" || tool.source === source) && (status === "Alle" || tool.status === status) && (builderFilter === "Alle" || builderForFilter(tool) === builderFilter) && (!needle || searchable.includes(needle));
    }).sort((a, b) => sortBy === "created" ? createdFor(b).localeCompare(createdFor(a), "de") : a.status.localeCompare(b.status, "de"));
  }, [query, source, status, builderFilter, sortBy]);
  const fullyDocumented = allTools.filter((tool) => documentationStateFor(tool) === "Fertig dokumentiert");
  const partlyDocumented = allTools.filter((tool) => documentationStateFor(tool) === "Teilweise dokumentiert");
  const documentationRows = [...allTools].sort((a, b) => documentationStateFor(a).localeCompare(documentationStateFor(b), "de") || a.title.localeCompare(b.title, "de"));
  const renderedTools = showAllTools ? filtered : filtered.slice(0, 24);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">M</span><span>Mein App-Katalog</span></div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <button type="button" className={mainView === "dashboard" ? "active" : ""} onClick={() => setMainView("dashboard")}>Dashboard</button>
          <button type="button" className={mainView === "catalog" ? "active" : ""} onClick={() => setMainView("catalog")}>Apps</button>
          <button type="button" className={mainView === "control" ? "active" : ""} onClick={() => setMainView("control")}>Control Center</button>
          <button type="button" className="theme-toggle" onClick={() => setDarkMode((current) => !current)} aria-label="Darstellung wechseln">{darkMode ? "Hell" : "Dunkel"}</button>
        </nav>
        <p>Arbeitsstand: erste Inventur · 18 GitHub-Repositories · Google Drive verbunden</p>
      </header>

      <div className={mainView === "catalog" ? "catalog-view" : "catalog-view view-hidden"}>
      <section className="hero">
        <div>
          <p className="eyebrow">Zentrale Übersicht</p>
          <h1>Alle Werkzeuge an einem Ort.</h1>
          <p className="lead">Finde Apps, erkenne Überschneidungen und öffne die passende Quelle, um ein Projekt weiterzuentwickeln.</p>
        </div>
        <div className="summary" aria-label="Inventurstand">
          <span><strong>{allTools.length}</strong> erfasste Werkzeuge</span>
          <span><strong>4</strong> Quelltypen</span>
          <span><strong>5</strong> Prüfcluster</span>
        </div>
      </section>

      <section className="workspace" aria-label="Werkzeugübersicht">
        <div className="catalog">
          <div className="search-row">
            <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Apps, Funktionen oder Inhalte suchen" aria-label="Werkzeuge durchsuchen" /></label>
            <span className="result-count">{filtered.length} Treffer</span>
          </div>
          <div className="filters" aria-label="Filter">
            <select value={source} onChange={(event) => setSource(event.target.value as Source | "Alle")} aria-label="Quelle filtern">
              <option>Alle</option><option>GitHub</option><option>Lokaler Rechner</option><option>Google Drive</option><option>Cloud</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as Status | "Alle")} aria-label="Status filtern">
              <option>Alle</option>{statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "created" | "status")} aria-label="Sortierung">
              <option value="created">Neueste Erstellung</option><option value="status">Status</option>
            </select>
          </div>
          <div className="quick-filters" aria-label="Schnellfilter nach Erstellwerkzeug"><span>Erstellt mit</span>{builderFilters.map((item) => <button key={item} type="button" className={builderFilter === item ? "active" : ""} onClick={() => setBuilderFilter(item)}>{item}<small>{item === "Alle" ? allTools.length : allTools.filter((tool) => builderForFilter(tool) === item).length}</small></button>)}</div>
          <div className="tool-grid">
            {renderedTools.map((tool) => <article key={tool.id} className={`tool-card ${selected.id === tool.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => openTool(tool)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openTool(tool); }}>
              <span className="card-top"><span className="source-marks"><ProviderIcon tool={tool} /><ClaudeSurfaceBadge tool={tool} /></span><span className={`status ${tool.status.toLowerCase()}`}>{tool.status}</span></span>
              <button className="card-select" onClick={(event) => { event.stopPropagation(); openTool(tool); }}><span className="tool-title">{tool.title}</span><span className="tool-description">{tool.description}</span></button>
              <span className="tool-meta">{tool.source} · {tool.category}</span>
              <span className="classification">{builderForFilter(tool)} · erstellt {createdFor(tool)}</span>
              <span className="local-port">{localHrefFor(tool) ? <a href={localHrefFor(tool) ?? undefined} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Lokal: {localPortFor(tool)}</a> : `Lokal: ${localPortFor(tool)}`}</span>
              {tool.trafficLight && <span className={`traffic-light ${tool.trafficLight}`} title={tool.trafficNote}><i></i>{trafficLabelFor(tool)}</span>}
              <span className="resource-links" aria-label={`Zugänge für ${tool.title}`}>
                <a href={quickStartFor(tool)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Link</a>
                <a href={archiveFor(tool)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Archiv</a>
                <a href={folderFor(tool)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Ordner</a>
                <button type="button" title={tool.location} onClick={(event) => { event.stopPropagation(); copyLocation(tool); }}>Pfad kopieren</button>
              </span>
              <span className="checked-status" title={tool.performance ?? "Keine Performance-Angabe"}>Status: {statusFor(tool)}</span>
              <span className="card-actions" aria-label={`Aktionen für ${tool.title}`}>
                <a href={quickStartFor(tool)} target="_blank" rel="noreferrer" onClick={(event) => { event.stopPropagation(); setSelectedId(tool.id); }}>Start</a>
                <button onClick={(event) => { event.stopPropagation(); testApp(tool); }}>Test</button>
                <button onClick={(event) => { event.stopPropagation(); setSelectedId(tool.id); setPanel("masterdata"); }}>Daten</button>
                <button onClick={(event) => { event.stopPropagation(); setSelectedId(tool.id); setPanel("tags"); }}>Tags</button>
                <button onClick={(event) => { event.stopPropagation(); setSelectedId(tool.id); setPanel("architecture"); }}>IT</button>
                <button onClick={(event) => { event.stopPropagation(); setSelectedId(tool.id); setPanel("features"); }}>Features</button>
              </span>
            </article>)}
          </div>
          {filtered.length > renderedTools.length && <button type="button" className="load-more" onClick={() => setShowAllTools(true)}>Alle {filtered.length} Apps laden</button>}
        </div>

        <aside className="detail" aria-live="polite">
          <p className="eyebrow">Ausgewähltes Werkzeug</p>
          <div className="detail-head"><span className="source-marks"><ProviderIcon tool={selected} detail /><ClaudeSurfaceBadge tool={selected} /></span><span className={`status ${selected.status.toLowerCase()}`}>{selected.status}</span></div>
          <h2>{selected.title}</h2><p>{selected.detail}</p>
          <div className="detail-actions" aria-label="Detailansichten">
            <button className={panel === "masterdata" ? "active" : ""} onClick={() => setPanel("masterdata")}>Masterdata</button>
            <button className={panel === "tags" ? "active" : ""} onClick={() => setPanel("tags")}>10 Tags</button>
            <button className={panel === "architecture" ? "active" : ""} onClick={() => setPanel("architecture")}>IT-Architektur</button>
            <button className={panel === "features" ? "active" : ""} onClick={() => setPanel("features")}>Neue Features</button>
          </div>
          {panel === "masterdata" && <dl className="info-list"><div><dt>Erstelldatum</dt><dd>{createdFor(selected)}</dd></div><div><dt>Erstellt mit</dt><dd>{builderForFilter(selected)}</dd></div>{isClaudeWorkspace(selected) && <><div><dt>Claude-Oberfläche</dt><dd>{claudeSurfaceFor(selected)}</dd></div><div><dt>Erstellmodell</dt><dd>{claudeCreationModelFor(selected)}</dd></div></>}<div><dt>Direkt-URL</dt><dd><a className="data-link" href={quickStartFor(selected)} target="_blank" rel="noreferrer">{quickStartFor(selected)}</a></dd></div><div><dt>Lokaler Port</dt><dd>{localPortFor(selected)}</dd></div><div><dt>Zugang</dt><dd>{accessProfileFor(selected)}</dd></div><div><dt>Letzte Aktualisierung</dt><dd>{selected.checkedAt ?? "Aus der ersten Inventur"}</dd></div><div><dt>Aktueller Status</dt><dd>{statusFor(selected)}</dd></div><div><dt>Performance / Zugang</dt><dd>{selected.performance ?? detailsFor(selected).access ?? "Noch nicht gemessen"}</dd></div><div><dt>Tokenverbrauch</dt><dd>Noch nicht gemessen</dd></div><div><dt>Nutzung</dt><dd>{scopeFor(selected)}</dd></div></dl>}
          {panel === "tags" && <div className="tags-panel"><p>Vorläufige Beschreibung</p><div className="tag-list">{tagsFor(selected).map((tag) => <span key={tag}>{tag}</span>)}</div><p className="similar"><strong>Ähnliche Apps:</strong> {selected.overlap ?? "Noch abgleichen"}</p><p className="similar"><strong>Zuordnung:</strong> {scopeFor(selected)}</p></div>}
          {panel === "architecture" && <dl className="info-list architecture">{Object.entries(architectureFor(selected)).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>}
          {panel === "features" && <ul className="features-list">{featuresFor(selected).map((feature) => <li key={feature}>{feature}</li>)}</ul>}
          <div className="selected-links"><a href={quickStartFor(selected)} target="_blank" rel="noreferrer">Link öffnen</a><a href={archiveFor(selected)} target="_blank" rel="noreferrer">Archiv</a><a href={folderFor(selected)} target="_blank" rel="noreferrer">Ordner</a></div>
          <a className="primary-action" href={quickStartFor(selected)} target="_blank" rel="noreferrer">Schnellstart öffnen <span aria-hidden="true">↗</span></a>
          <p className="detail-note">Weitere Rechner, OneDrive und Google Drive können in derselben Struktur ergänzt werden.</p>
        </aside>
      </section>
      </div>
      {mainView === "dashboard" && <section className="dashboard" aria-label="Dokumentationsdashboard">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Dokumentationsstand</p><h1>Projektakte auf einen Blick.</h1><p>Die Einordnung trennt vollständig geprüfte Projektakten von Einträgen, bei denen Quellen, Zugang oder technische Details noch ergänzt werden.</p></div>
          <div className="documentation-summary"><span><strong>{fullyDocumented.length}</strong> fertig dokumentiert</span><span><strong>{partlyDocumented.length}</strong> teilweise dokumentiert</span></div>
        </div>
        <div className="documentation-table-wrap">
          <table className="documentation-table">
            <caption>Übersicht aller Apps nach Dokumentationsstand</caption>
            <thead><tr><th>App</th><th>Dokumentation</th><th>Prüfgrundlage</th><th>Lokaler Port</th><th>Aktueller Status</th></tr></thead>
            <tbody>{documentationRows.map((tool) => <tr key={tool.id}><td><button type="button" onClick={() => { setSelectedId(tool.id); setMainView("catalog"); }}>{tool.title}</button><span>{tool.source} · {tool.category}</span></td><td><span className={`documentation-state ${documentationStateFor(tool) === "Fertig dokumentiert" ? "complete" : "partial"}`}>{documentationStateFor(tool)}</span></td><td>{detailsFor(tool).evidence}</td><td>{localPortFor(tool)}</td><td>{statusFor(tool)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>}
      {mainView === "control" && <section className="control-center" aria-label="Control Center">
        <div className="dashboard-heading"><div><p className="eyebrow">Aus der bisherigen AI-Artefakte Übersicht integriert</p><h1>Control Center</h1><p>Inventar, Auswertung, Geräte, Bewertung, Ideen und Fernsteuerungs-Bereitschaft sind jetzt Teil des Master-Katalogs.</p></div><div className="documentation-summary"><span><strong>{allTools.length}</strong> Apps im Inventar</span><span><strong>{networkDevices.filter((device) => device.state === "online").length}/{networkDevices.length}</strong> Geräte erreichbar</span></div></div>
        <nav className="control-tabs" aria-label="Control Center Funktionen">{(["analytics", "sources", "devices", "matrix", "scores", "ideas", "remote"] as ControlTab[]).map((tab) => <button key={tab} type="button" className={controlTab === tab ? "active" : ""} onClick={() => setControlTab(tab)}>{{ analytics: "Analytics", sources: "Quellen", devices: "Geräte", matrix: "Matrix", scores: "Scorecards", ideas: "Ideen", remote: "Remote Launcher" }[tab]}</button>)}</nav>
        {controlTab === "analytics" && <div className="control-panel"><div className="analytics-cards"><article><span>Fertig dokumentiert</span><strong>{fullyDocumented.length}</strong><small>technische Akte geprüft</small></article><article><span>Teilweise dokumentiert</span><strong>{partlyDocumented.length}</strong><small>Quellen oder Zugang ergänzen</small></article><article><span>Aktive Apps</span><strong>{allTools.filter((tool) => tool.status === "Aktiv").length}</strong><small>im Inventar als aktiv geführt</small></article><article><span>Lokale Ports</span><strong>{allTools.filter((tool) => localHrefFor(tool)).length}</strong><small>dokumentierte Web-Startpunkte</small></article></div><div className="control-actions"><button type="button" onClick={() => exportCatalog("json")}>JSON exportieren</button><button type="button" onClick={() => exportCatalog("csv")}>CSV exportieren</button><button type="button" onClick={() => exportCatalog("markdown")}>Markdown exportieren</button><button type="button" onClick={() => window.print()}>Drucken</button></div></div>}
        {controlTab === "sources" && <div className="source-summary-grid">{(["GitHub", "Lokaler Rechner", "Google Drive", "Cloud"] as Source[]).map((item) => <article key={item}><span>{item}</span><strong>{allTools.filter((tool) => tool.source === item).length}</strong><p>{allTools.filter((tool) => tool.source === item && documentationStateFor(tool) === "Fertig dokumentiert").length} vollständig dokumentiert</p></article>)}</div>}
        {controlTab === "devices" && <div className="control-panel"><div className="control-panel-head"><div><h2>Gerätestatus im Netzwerk</h2><p>{networkNotice}</p></div><button type="button" onClick={() => setNetworkNotice("Erneute Prüfung ist erst möglich, wenn die drei Geräte im aktuellen WLAN erreichbar sind oder ein Status-Agent eingerichtet wurde.")}>Status aktualisieren</button></div><div className="device-grid">{networkDevices.map((device) => <article key={device.id}><span className={`device-dot ${device.state}`}></span><div><strong>{device.name}</strong><p>{device.system} · {device.address}</p><small>{device.detail}</small></div><b className={device.state}>{device.state === "online" ? "Online" : "Nicht erreichbar"}</b></article>)}</div><p className="network-help">Für echte Live-Daten der anderen Rechner braucht jeder Rechner einen kleinen Status-Agenten oder eine HTTPS-fähige Freigabe. Die frühere Konfiguration zeigt noch Adressen aus dem Netz 192.168.1.x, der aktuelle Rechner arbeitet im Netz 192.168.2.x.</p></div>}
        {controlTab === "matrix" && <div className="documentation-table-wrap"><table className="documentation-table"><caption>Projekt × Quelle × lokaler Zugang</caption><thead><tr><th>App</th><th>Quelle</th><th>Dokumentation</th><th>Lokaler Zugang</th><th>Status</th></tr></thead><tbody>{allTools.map((tool) => <tr key={tool.id}><td><button type="button" onClick={() => { setSelectedId(tool.id); setMainView("catalog"); }}>{tool.title}</button></td><td>{tool.source}</td><td>{documentationStateFor(tool)}</td><td>{localPortFor(tool)}</td><td>{tool.status}</td></tr>)}</tbody></table></div>}
        {controlTab === "scores" && <div className="score-grid">{[...allTools].sort((a, b) => documentationScoreFor(b) - documentationScoreFor(a)).map((tool) => <article key={tool.id}><div><strong>{tool.title}</strong><span>{documentationStateFor(tool)}</span></div><b>{documentationScoreFor(tool)}%</b><div className="score-track"><i style={{ width: `${documentationScoreFor(tool)}%` }}></i></div><small>{detailsFor(tool).evidence}</small></article>)}</div>}
        {controlTab === "ideas" && <div className="ideas-grid">{featureIdeas.map((idea) => <article key={idea.id}><h2>{idea.title}</h2><p>{idea.detail}</p><button type="button" onClick={() => voteForIdea(idea.id)}>Priorisieren <span>{idea.votes + (ideaVotes[idea.id] ?? 0)}</span></button></article>)}</div>}
        {controlTab === "remote" && <div className="control-panel remote-panel"><h2>Remote Launcher</h2><p>Die frühere Übersicht konnte Apps auf anderen Geräten über einen lokalen Dienst starten. Aktuell ist keiner der drei hinterlegten Rechner im erreichbaren Netzsegment.</p><div className="device-grid">{networkDevices.filter((device) => device.id !== "local").map((device) => <article key={device.id}><span className="device-dot unavailable"></span><div><strong>{device.name}</strong><p>{device.address}</p><small>Startdienst nicht erreichbar</small></div><button type="button" disabled>Starten</button></article>)}</div><p className="network-help">Sobald ein Status- und Startdienst auf dem jeweiligen Rechner erreichbar ist, kann dieser Bereich die Prüfung und den Startvorgang übernehmen.</p></div>}
      </section>}
      {opened && <div className="app-window-layer" role="presentation">
        <section className="app-window" role="dialog" aria-modal="true" aria-label={`${opened.title} Arbeitsfenster`} style={{ transform: `translate(calc(-50% + ${windowPosition.x}px), calc(-50% + ${windowPosition.y}px))` }}>
          <header className="window-header" onPointerDown={startDrag} onPointerMove={moveWindow} onPointerUp={() => { drag.current = null; }}>
            <div className="window-title"><span className="source-marks"><ProviderIcon tool={opened} detail /><ClaudeSurfaceBadge tool={opened} /></span><div><strong>{opened.title}</strong><small>Arbeitsfenster - verschieben am Kopf, Groesse unten rechts anpassen</small></div></div>
            <div className="window-actions"><button type="button" className="test-action" onClick={() => testApp(opened)}>App testen</button><a href={quickStartFor(opened)} target="_blank" rel="noreferrer">App oeffnen</a><button type="button" onClick={() => setOpenedId(null)} aria-label="Fenster schliessen">Schliessen</button></div>
          </header>
          <nav className="window-tabs" aria-label="App-Informationen">
            <button className={windowTab === "profile" ? "active" : ""} onClick={() => setWindowTab("profile")}>Herkunft & Tool</button>
            <button className={windowTab === "systems" ? "active" : ""} onClick={() => setWindowTab("systems")}>Architektur & Daten</button>
            <button className={windowTab === "screens" ? "active" : ""} onClick={() => setWindowTab("screens")}>Echte Screens ({screensFor(opened).length})</button>
          </nav>
          <div className="window-content">
            {windowTab === "profile" && <div className="window-profile"><div><p className="eyebrow">Entwickelt mit</p><h2>{detailsFor(opened).builder}</h2><p>{opened.detail}</p>{opened.trafficLight && <p className={`traffic-light ${opened.trafficLight}`} title={opened.trafficNote}><i></i>{trafficLabelFor(opened)} · {opened.trafficNote}</p>}{testResults[opened.id] && <p className={`test-result ${testResults[opened.id].phase}`}>{testResults[opened.id].message}</p>}</div><dl className="window-data"><div><dt>Quelle</dt><dd>{opened.source}</dd></div>{isClaudeWorkspace(opened) && <><div><dt>Claude-Oberfläche</dt><dd>{claudeSurfaceFor(opened)}</dd></div><div><dt>Erstellmodell</dt><dd>{claudeCreationModelFor(opened)}</dd></div></>}<div><dt>Direkt-URL</dt><dd><a className="data-link" href={quickStartFor(opened)} target="_blank" rel="noreferrer">{quickStartFor(opened)}</a></dd></div><div><dt>Startpunkt</dt><dd>{opened.location}</dd></div><div><dt>Lokaler Port</dt><dd>{localPortFor(opened)}</dd></div><div><dt>Zugang</dt><dd>{accessProfileFor(opened)}</dd></div><div><dt>Modellbezug der App</dt><dd>{detailsFor(opened).models}</dd></div><div><dt>Verbindungen</dt><dd>{detailsFor(opened).connections}</dd></div><div><dt>Pruefgrundlage</dt><dd>{detailsFor(opened).evidence}</dd></div><div><dt>Verwandte Apps</dt><dd>{opened.overlap ?? "Noch abgleichen"}</dd></div></dl></div>}
            {windowTab === "systems" && <div className="systems-grid"><article><span>Frontend</span><strong>{detailsFor(opened).frontend}</strong></article><article><span>Middleware</span><strong>{detailsFor(opened).middleware}</strong></article><article><span>Backend</span><strong>{detailsFor(opened).backend}</strong></article><article><span>Datenbank</span><strong>{detailsFor(opened).database}</strong></article><article><span>Connections</span><strong>{detailsFor(opened).connections}</strong></article><article><span>Modelle</span><strong>{detailsFor(opened).models}</strong></article><article><span>Pruefgrundlage</span><strong>{detailsFor(opened).evidence}</strong></article></div>}
            {windowTab === "screens" && <div><p className="screens-intro">Hier erscheinen ausschliesslich echte Ansichten der jeweiligen Anwendung. Es werden keine Platzhalter der Master-App als Produktbilder ausgegeben.</p>{screensFor(opened).length > 0 ? <div className="screens-grid">{screensFor(opened).map((screen) => <figure key={screen.src}><img src={screen.src} alt={`Bildschirmansicht ${screen.title}`} /><figcaption>{screen.title}<span>{screen.source}</span></figcaption></figure>)}</div> : <p className="empty-screens">Noch kein echter Screen hinterlegt. Die Anwendung ist derzeit nur als Quellcode, Dokument oder geschuetzter Zugang vorhanden.</p>}</div>}
          </div>
        </section>
      </div>}
    </main>
  );
}
