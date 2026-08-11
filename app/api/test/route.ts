type TestOutcome = "available" | "login_required" | "unavailable" | "local_only";

function isPrivateTarget(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const parts = host.match(/^172\.(\d+)\./);
  return parts ? Number(parts[1]) >= 16 && Number(parts[1]) <= 31 : false;
}

function outcomeFor(status: number): TestOutcome {
  if (status === 401 || status === 403) return "login_required";
  if (status >= 200 && status < 400) return "available";
  return "unavailable";
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return Response.json({ error: "Die Zieladresse fehlt." }, { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return Response.json({ error: "Die Zieladresse ist ungültig." }, { status: 400 });
  }

  if (url.protocol === "file:") {
    return Response.json({ outcome: "local_only", message: "Lokaler Ordner: Der Browser öffnet den Pfad, ein Server-Test ist nicht möglich." });
  }

  if (url.protocol !== "https:" || isPrivateTarget(url.hostname)) {
    return Response.json({ error: "Nur öffentliche HTTPS-Adressen können automatisch geprüft werden." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const startedAt = Date.now();

  try {
    let response = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal, headers: { "User-Agent": "AI-Mastertool-Linktest/1.0" } });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { "User-Agent": "AI-Mastertool-Linktest/1.0" } });
    }

    return Response.json({ outcome: outcomeFor(response.status), status: response.status, durationMs: Date.now() - startedAt, url: url.toString() });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Zeitüberschreitung nach 8 Sekunden" : "Zielserver nicht erreichbar";
    return Response.json({ outcome: "unavailable", message, durationMs: Date.now() - startedAt }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
