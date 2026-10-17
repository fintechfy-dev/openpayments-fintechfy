import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { leerCredenciales, sinCredenciales } from "./credenciales.js";
import { archivoDocs, paginaDocs } from "./docs.js";
import { ErrorHttp } from "./errores.js";
import { llaveIdempotencia } from "./idempotencia.js";
import { crearOpenApi } from "./openapi.js";

// Staging da por fallida una llamada sin respuesta en 30 s. Se responde antes, a los ~20 s de
// consultar, con un 503: el pago sigue por detrás y el reintento recibe el resultado.
const LIMITE_RESPUESTA_MS = 20_000;
const CUERPO_MAXIMO = 64 * 1024;

export function crearServidor({ config, almacen, permisos, operaciones, pagos, avisos, idempotencia, clientes, limiteRespuestaMs = LIMITE_RESPUESTA_MS }) {
  // Las llaves de Open Payments llegan en cada llamada (ver credenciales.js). Se leen solo cuando la
  // operación de verdad le habla a Open Payments: una respuesta repetida por idempotencia no las necesita.
  const cuentaDe = (req, cuerpo) => async () => {
    const credenciales = leerCredenciales(req.headers, cuerpo);
    return { op: await clientes.para(credenciales), huella: credenciales.huella };
  };

  const contrato = crearOpenApi({ urlPublica: config.urlPublica });

  const rutas = [
    // El contrato y Swagger UI: públicos, no llevan secretos.
    ["GET", /^\/api\/openapi\.json$/, async () => ({ cuerpo: contrato })],
    ["GET", /^\/docs$/, async () => ({ redirigir: "/docs/" })],
    ["GET", /^\/docs\/$/, async () => ({ pagina: paginaDocs() })],
    ["GET", /^\/docs\/([A-Za-z0-9.-]+)$/, async (req, [nombre]) => {
      const archivo = archivoDocs(nombre);
      if (!archivo) throw new ErrorHttp(404, "Ruta desconocida");
      return { archivo };
    }],

    ["GET", /^\/api\/salud$/, async () => ({
      cuerpo: { ok: true, almacen: almacen.nombre, walletGrupo: config.walletGrupo, walletFinanciera: config.walletFinanciera, simuladas: [...config.simuladas] },
    })],

    // Lo que llama staging: los cobros y los pagos.
    ["POST", /^\/api\/open-payments\/([a-z-]+)$/, async (req, [operacion]) => {
      exigirLlave(req, config.llaveStaging);
      const crudo = await leerJson(req);
      const cuerpo = sinCredenciales(crudo);
      const llave = llaveIdempotencia(`/api/open-payments/${operacion}`, cuerpo);
      const promesa = idempotencia.ejecutar(llave, () => operaciones.ejecutar(operacion, cuerpo, cuentaDe(req, crudo)));
      return { cuerpo: await conLimite(promesa, limiteRespuestaMs) };
    }],

    // Lo que llama el bot: los permisos de cada participante.
    ["POST", /^\/api\/permisos$/, async (req) => {
      exigirLlave(req, config.llaveClientes);
      const crudo = await leerJson(req);
      const cuenta = await cuentaDe(req, crudo)();
      return { estado: 201, cuerpo: await permisos.pedir(sinCredenciales(crudo) ?? {}, cuenta) };
    }],
    ["GET", /^\/api\/permisos\/(p[0-9a-f]{16})$/, async (req, [id]) => {
      exigirLlave(req, config.llaveClientes);
      return { cuerpo: await permisos.estado(id, cuentaDe(req, null)) };
    }],
    ["POST", /^\/api\/permisos\/(p[0-9a-f]{16})\/cancelar$/, async (req, [id]) => {
      exigirLlave(req, config.llaveClientes);
      return { cuerpo: await permisos.cancelar(id, cuentaDe(req, null)) };
    }],
    // Pública: la abre el navegador del participante al volver de su billetera.
    ["GET", /^\/api\/permisos\/(p[0-9a-f]{16})\/retorno$/, async (req, [id], url) => {
      const { estado, vuelta } = await permisos.retorno(id, url.searchParams);
      return vuelta ? { redirigir: vuelta } : { pagina: paginaDeVuelta(estado) };
    }],

    // Lo que leen el bot y la web: los avisos de pago y el registro de las cuatro etapas.
    ["GET", /^\/api\/avisos$/, async (req, _, url) => {
      exigirLlave(req, config.llaveClientes);
      return { cuerpo: await avisos.desde(url.searchParams.get("desde")) };
    }],
    ["GET", /^\/api\/registro$/, async (req) => {
      exigirLlave(req, config.llaveClientes);
      return { cuerpo: await pagos.registro() };
    }],
  ];

  const servidor = createServer(async (req, res) => {
    const inicio = Date.now();
    const url = new URL(req.url, "http://local");
    let estado = 500;
    try {
      const ruta = rutas.find(([metodo, patron]) => metodo === req.method && patron.test(url.pathname));
      if (!ruta) throw new ErrorHttp(404, "Ruta desconocida");
      const parametros = url.pathname.match(ruta[1]).slice(1);
      const resultado = await ruta[2](req, parametros, url);
      if (resultado.archivo) {
        estado = 200;
        res.writeHead(200, { "Content-Type": resultado.archivo.tipo, "Cache-Control": "public, max-age=3600" }).end(resultado.archivo.contenido);
      } else if (resultado.pagina) {
        estado = 200;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(resultado.pagina);
      } else if (resultado.redirigir) {
        estado = 302;
        res.writeHead(302, { Location: resultado.redirigir, "Cache-Control": "no-store" }).end();
      } else {
        estado = resultado.estado ?? 200;
        responder(res, estado, resultado.cuerpo);
      }
    } catch (error) {
      const http = error instanceof ErrorHttp ? error : new ErrorHttp(500, "Error interno");
      if (!(error instanceof ErrorHttp)) console.error(error);
      estado = http.estado;
      responder(res, estado, { error: http.motivo }, estado === 503 ? { "Retry-After": "2" } : {});
    } finally {
      // Sin la query: la vuelta del permiso trae interact_ref y hash.
      console.log(`${req.method} ${url.pathname} ${estado} ${Date.now() - inicio}ms`);
    }
  });
  // Para la prueba de paridad entre el contrato y lo que de verdad se atiende.
  servidor.rutas = rutas.map(([metodo, patron]) => ({ metodo, patron }));
  return servidor;
}

// Sin vuelta (por ejemplo los permisos del grupo y de la financiera, que aprueba Willy), el navegador
// se queda aquí. El texto no dice «aprobado»: el permiso se termina cuando alguien lo consulta con las llaves.
function paginaDeVuelta(estado) {
  const texto = estado === "rechazado" || estado === "cancelado"
    ? "No se aprobó el permiso. Puedes cerrar esta ventana."
    : "Listo, recibimos tu respuesta. Puedes cerrar esta ventana y volver al chat.";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Natillera 2.0</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><p>${texto}</p></body></html>`;
}

function responder(res, estado, cuerpo, encabezados = {}) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...encabezados });
  res.end(JSON.stringify(cuerpo));
}

function exigirLlave(req, esperada) {
  const dada = Buffer.from(req.headers["x-api-key"] ?? "");
  const correcta = Buffer.from(esperada);
  if (dada.length !== correcta.length || !timingSafeEqual(dada, correcta)) throw new ErrorHttp(401, "Falta X-Api-Key o no es la correcta");
}

async function leerJson(req) {
  const partes = [];
  let tamano = 0;
  for await (const parte of req) {
    tamano += parte.length;
    if (tamano > CUERPO_MAXIMO) throw new ErrorHttp(413, "Cuerpo demasiado grande");
    partes.push(parte);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8") || "null");
  } catch {
    throw new ErrorHttp(400, "El cuerpo no es JSON");
  }
}

function conLimite(promesa, ms) {
  let reloj;
  const limite = new Promise((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new ErrorHttp(503, "El pago sigue en curso; staging lo reintenta")), ms);
  });
  // Si el límite gana, el pago sigue y su fallo no debe quedar como rechazo sin atender.
  promesa.catch(() => {});
  return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
}
