// Capturas de cada ruta en 360, 768, 1024 (donde las tablas dejan de apilarse) y 1280 px, tema claro y oscuro, con Chrome sin ventana.
// Mide además si la página tiene scroll horizontal (el error responsive más común).
//
// Uso: npm run capturas -- [--base http://localhost:3000] [--rutas /natilleras,/pagos]
// Requiere Node 22+ (WebSocket nativo), la web corriendo (npm run dev o npm run start) y Google Chrome o Chromium.
// Deja las imágenes y reporte.json en web/.capturas/ (ignorada por git).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const base = (args.base ?? "http://localhost:3000").replace(/\/+$/, "");
const rutas = (args.rutas ?? "/natilleras,/natilleras/los-primos,/creditos,/pagos,/bitacora").split(",");
const anchos = [360, 768, 1024, 1280];
const temas = ["light", "dark"];
const salida = join(dirname(fileURLToPath(import.meta.url)), "..", ".capturas");

const candidatos = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = candidatos.find((c) => existsSync(c));
if (!chrome) {
  console.error("No encontré Chrome. Instálalo o indica la ruta con CHROME_PATH.");
  process.exit(1);
}

try {
  await fetch(base, { signal: AbortSignal.timeout(5000) });
} catch {
  console.error(`La web no responde en ${base}. Arráncala con npm run dev o npm run start.`);
  process.exit(1);
}

const perfil = mkdtempSync(join(tmpdir(), "natillera-capturas-"));
const proceso = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${perfil}`], { stdio: "ignore" });

async function puertoDevTools() {
  const archivo = join(perfil, "DevToolsActivePort");
  for (let i = 0; i < 100; i++) {
    if (existsSync(archivo)) {
      const [puerto, ruta] = readFileSync(archivo, "utf8").trim().split("\n");
      if (puerto && ruta) return `ws://127.0.0.1:${puerto}${ruta}`;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Chrome no abrió el puerto de DevTools");
}

// Cliente mínimo del protocolo de DevTools sobre el WebSocket nativo de Node.
const ws = new WebSocket(await puertoDevTools());
await new Promise((r, e) => ((ws.onopen = r), (ws.onerror = e)));
let siguiente = 0;
const pendientes = new Map();
const oyentes = new Set();
// Si Chrome se cae, todas las llamadas pendientes fallan en vez de esperar para siempre.
ws.onclose = () => {
  for (const { mal } of pendientes.values()) mal(new Error("Chrome cerró la conexión de DevTools"));
  pendientes.clear();
};
ws.onmessage = ({ data }) => {
  const m = JSON.parse(String(data));
  if (m.id && pendientes.has(m.id)) {
    const { ok, mal } = pendientes.get(m.id);
    pendientes.delete(m.id);
    if (m.error) mal(new Error(m.error.message));
    else ok(m.result);
  } else for (const o of oyentes) o(m);
};
const conTiempo = (promesa, ms, que) =>
  Promise.race([promesa, new Promise((_, mal) => setTimeout(() => mal(new Error(`${que}: sin respuesta en ${ms / 1000} s`)), ms))]);
const cdp = (method, params = {}, sessionId) =>
  conTiempo(
    new Promise((ok, mal) => {
      const id = ++siguiente;
      pendientes.set(id, { ok, mal });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    }),
    30_000,
    method,
  );
const esperarCarga = (sessionId) =>
  conTiempo(
    new Promise((ok) => {
      const o = (m) => m.sessionId === sessionId && m.method === "Page.loadEventFired" && (oyentes.delete(o), ok());
      oyentes.add(o);
    }),
    30_000,
    "Cargar la página",
  );

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });
const reporte = [];

try {
  const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  await cdp("Page.enable", {}, sessionId);

  for (const ruta of rutas) {
    for (const ancho of anchos) {
      for (const tema of temas) {
        await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: 900, deviceScaleFactor: 1, mobile: ancho < 768 }, sessionId);
        await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: tema }] }, sessionId);
        const carga = esperarCarga(sessionId);
        await cdp("Page.navigate", { url: base + ruta }, sessionId);
        await carga;
        await new Promise((r) => setTimeout(r, 400)); // fuentes e imágenes
        const { result } = await cdp(
          "Runtime.evaluate",
          {
            returnByValue: true,
            expression: `({ scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              alto: document.documentElement.scrollHeight, titulo: document.title,
              h1: document.querySelectorAll("h1").length })`,
          },
          sessionId,
        );
        // Página completa: sin clip, Chrome solo captura los 900 px visibles.
        const { cssContentSize } = await cdp("Page.getLayoutMetrics", {}, sessionId);
        const clip = { x: 0, y: 0, width: ancho, height: Math.ceil(cssContentSize.height), scale: 1 };
        const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip }, sessionId);
        const nombre = `${ruta.replace(/^\//, "").replace(/\//g, "_") || "inicio"}-${ancho}-${tema === "light" ? "claro" : "oscuro"}.png`;
        writeFileSync(join(salida, nombre), Buffer.from(data, "base64"));
        reporte.push({ ruta, ancho, tema, captura: `.capturas/${nombre}`, scrollHorizontalPx: result.value.scroll, h1: result.value.h1, titulo: result.value.titulo });
      }
    }
  }
} finally {
  ws.close();
  const salio = new Promise((r) => proceso.once("exit", r));
  proceso.kill();
  await Promise.race([salio, new Promise((r) => setTimeout(r, 3000))]);
  try {
    rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // Chrome puede seguir soltando archivos; es una carpeta temporal del sistema.
  }
}

writeFileSync(join(salida, "reporte.json"), JSON.stringify(reporte, null, 2));
const conScroll = reporte.filter((r) => r.scrollHorizontalPx > 0);
const sinH1 = reporte.filter((r) => r.h1 !== 1);
console.log(`${reporte.length} capturas en web/.capturas/`);
console.log(conScroll.length ? `Scroll horizontal en:\n${conScroll.map((r) => `  ${r.ruta} ${r.ancho}px ${r.tema}: ${r.scrollHorizontalPx}px`).join("\n")}` : "Sin scroll horizontal en ninguna captura.");
if (sinH1.length) console.log(`Páginas sin exactamente un <h1>: ${[...new Set(sinH1.map((r) => r.ruta))].join(", ")}`);
process.exitCode = conScroll.length ? 1 : 0;
