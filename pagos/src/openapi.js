import { REGLAS } from "./operaciones.js";
import { TIPOS_PERMISO } from "./permisos.js";

// El contrato de la API en OpenAPI 3.0, para Swagger UI (/docs) y para quien la implementa del otro lado.
// Las 6 rutas de staging salen de REGLAS, la misma tabla que valida cada cuerpo: un campo que se agrega
// allí aparece aquí sin tocar este archivo. Lo demás se escribe a mano y una prueba lo compara con las
// rutas que de verdad atiende el servidor.

const EJEMPLOS = {
  grantId: "p1a2b3c4d5e6f7a8b",
  walletOrigen: "https://ilp.interledger-test.dev/ana",
  walletDestino: "https://ilp.interledger-test.dev/beto",
  monto: 50000,
  referencia: "part-ana-001",
  periodo: 1,
  origen: "nat-001",
  natilleraId: "nat-001",
};

const ESQUEMAS_CAMPO = {
  texto: { type: "string", minLength: 1 },
  wallet: { type: "string", description: "Dirección https de la billetera o payment pointer ($ilp...)" },
  monto: { type: "number", minimum: 0, exclusiveMinimum: true, description: "En pesos (la moneda de la billetera del grupo, hasta 2 decimales). Una billetera en otra moneda se convierte con la cotización de Open Payments" },
  entero: { type: "integer", minimum: 0 },
};

const ERRORES = {
  400: "Cuerpo inválido o faltan las llaves de Open Payments",
  401: "Falta X-Api-Key o no es la correcta",
  402: "Sin fondos o tope del permiso superado (no se reintenta: el participante recarga)",
  403: "El permiso no existe, no está aprobado o no se pudo renovar su token",
  404: "Operación o permiso desconocido",
  422: "Datos que no cuadran: otra billetera, otra llave, una billetera que no existe o dos monedas sin tasa entre ellas",
  502: "Open Payments falló (staging reintenta)",
  503: "El pago sigue en curso (staging reintenta y recibe el resultado)",
};

const LLAVES_OP = { OpWalletAddress: [], OpKeyId: [], OpPrivateKey: [] };

export function crearOpenApi({ urlPublica }) {
  const respuestasError = (codigos) =>
    Object.fromEntries(codigos.map((c) => [c, { $ref: `#/components/responses/Error${c}` }]));

  const paths = {
    "/api/salud": {
      get: {
        tags: ["Estado"],
        summary: "Estado de la API y lo que le falta configurar",
        security: [],
        responses: {
          200: { description: "Configurada", content: json({ $ref: "#/components/schemas/Salud" }) },
          503: { description: "Falta configuración: dice qué", content: json({ $ref: "#/components/schemas/Error" }) },
        },
      },
    },
  };

  for (const [operacion, regla] of Object.entries(REGLAS)) {
    paths[`/api/open-payments/${operacion}`] = {
      post: {
        tags: ["Staging: cobros y pagos"],
        operationId: camel(operacion),
        summary: regla.resumen,
        description:
          "Idempotente por ruta y cuerpo durante 5 minutos (las llaves de Open Payments no cuentan). Mientras el pago sigue, el reintento recibe 503. Responde el monto exacto que llegó.",
        security: [{ ApiKeyStaging: [], ...LLAVES_OP }],
        requestBody: { required: true, content: json(cuerpoDe(regla)) },
        responses: {
          200: { description: "Pago completado", content: json(respuestaDe(regla)) },
          ...respuestasError([400, 401, 402, 403, 404, 422, 502, 503]),
        },
      },
    };
  }

  const permisoId = { name: "permisoId", in: "path", required: true, schema: { type: "string", pattern: "^p[0-9a-f]{16}$" }, example: EJEMPLOS.grantId };
  Object.assign(paths, {
    "/api/permisos": {
      post: {
        tags: ["Bot: permisos"],
        operationId: "pedirPermiso",
        summary: "Pide un permiso de pago saliente; el dueño de la billetera lo aprueba en urlAprobacion",
        security: [{ ApiKeyClientes: [], ...LLAVES_OP }],
        requestBody: { required: true, content: json({ $ref: "#/components/schemas/PedidoPermiso" }) },
        responses: {
          201: { description: "Permiso pedido, pendiente de aprobación", content: json({ $ref: "#/components/schemas/PermisoPedido" }) },
          ...respuestasError([400, 401, 422, 502]),
        },
      },
    },
    "/api/permisos/{permisoId}": {
      get: {
        tags: ["Bot: permisos"],
        operationId: "estadoPermiso",
        summary: "Estado del permiso. Si el participante ya volvió, lo termina con las llaves de esta llamada",
        description: "La primera consulta después de la vuelta necesita las llaves X-OP-*; las siguientes no.",
        parameters: [permisoId],
        security: [{ ApiKeyClientes: [], ...LLAVES_OP }, { ApiKeyClientes: [] }],
        responses: {
          200: { description: "Estado", content: json({ $ref: "#/components/schemas/EstadoPermiso" }) },
          ...respuestasError([400, 401, 404, 422]),
        },
      },
    },
    "/api/permisos/{permisoId}/cancelar": {
      post: {
        tags: ["Bot: permisos"],
        operationId: "cancelarPermiso",
        summary: "Cancela el permiso (por ejemplo, cuando alguien se retira)",
        parameters: [permisoId],
        security: [{ ApiKeyClientes: [], ...LLAVES_OP }, { ApiKeyClientes: [] }],
        responses: {
          200: { description: "Cancelado", content: json({ type: "object", properties: { estado: { type: "string", enum: ["cancelado"] } } }) },
          ...respuestasError([400, 401, 404, 422]),
        },
      },
    },
    "/api/permisos/{permisoId}/retorno": {
      get: {
        tags: ["Bot: permisos"],
        operationId: "retornoPermiso",
        summary: "Pública: la abre el navegador del participante al volver de su billetera",
        description: "Verifica el hash y redirige a la vuelta que mandó el bot. No termina el permiso: eso pasa cuando el bot consulta el estado con las llaves.",
        parameters: [
          permisoId,
          { name: "interact_ref", in: "query", schema: { type: "string" } },
          { name: "hash", in: "query", schema: { type: "string" } },
          { name: "result", in: "query", schema: { type: "string", enum: ["grant_rejected", "grant_invalid"] } },
        ],
        security: [],
        responses: {
          302: { description: "Redirige a la vuelta del permiso (por ejemplo, el chat del bot)" },
          200: { description: "Sin vuelta: una página que dice que ya puede cerrar la ventana", content: { "text/html": { schema: { type: "string" } } } },
          ...respuestasError([404]),
        },
      },
    },
    "/api/avisos": {
      get: {
        tags: ["Bot y web: lectura"],
        operationId: "avisos",
        summary: "Avisos de pago (PagoCompletado y PagoFallido) desde un cursor",
        parameters: [{ name: "desde", in: "query", description: "El último id ya procesado", schema: { type: "string" } }],
        security: [{ ApiKeyClientes: [] }],
        responses: {
          200: { description: "Hasta 100 avisos, en orden", content: json({ type: "array", items: { $ref: "#/components/schemas/Aviso" } }) },
          ...respuestasError([401]),
        },
      },
    },
    "/api/registro": {
      get: {
        tags: ["Bot y web: lectura"],
        operationId: "registro",
        summary: "Los pagos con sus cuatro etapas, para el jurado",
        security: [{ ApiKeyClientes: [] }],
        responses: {
          200: { description: "Los últimos 200 pagos, del más reciente al más viejo", content: json({ type: "array", items: { $ref: "#/components/schemas/Pago" } }) },
          ...respuestasError([401]),
        },
      },
    },
  });

  return {
    openapi: "3.0.3",
    info: {
      title: "Natillera 2.0 · API de pagos",
      version: "0.1.0",
      description:
        "Lo único del sistema que habla con Open Payments. Staging la llama para cobrar y pagar; el bot, para pedir permisos.\n\n" +
        "**Llaves de Open Payments en cada llamada:** `X-OP-Wallet-Address`, `X-OP-Key-Id` y `X-OP-Private-Key` (el archivo `private.key` en base64). No se guardan. " +
        "El token de un permiso queda atado a la llave que lo pidió: el bot y staging mandan la misma.\n\n" +
        "Staging solo ve `http-<código>` de un error, por eso cada código dice algo por sí solo. Guía completa: `pagos/API.md`.",
    },
    servers: [{ url: urlPublica || "/" }],
    tags: [
      { name: "Staging: cobros y pagos" },
      { name: "Bot: permisos" },
      { name: "Bot y web: lectura" },
      { name: "Estado" },
    ],
    paths,
    components: {
      securitySchemes: {
        ApiKeyStaging: { type: "apiKey", in: "header", name: "X-Api-Key", description: "API_KEY_STAGING: la llave con la que llama staging" },
        ApiKeyClientes: { type: "apiKey", in: "header", name: "X-Api-Key", description: "API_KEY_CLIENTES: la llave del bot y de la web" },
        OpWalletAddress: { type: "apiKey", in: "header", name: "X-OP-Wallet-Address", description: "Billetera cliente de la app (la que tiene las Developer Keys)" },
        OpKeyId: { type: "apiKey", in: "header", name: "X-OP-Key-Id", description: "Key ID de las Developer Keys" },
        OpPrivateKey: { type: "apiKey", in: "header", name: "X-OP-Private-Key", description: "private.key en base64. No se guarda en ningún lado" },
      },
      responses: Object.fromEntries(
        Object.entries(ERRORES).map(([codigo, descripcion]) => [`Error${codigo}`, { description: descripcion, content: json({ $ref: "#/components/schemas/Error" }) }]),
      ),
      schemas: {
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } },
        Salud: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            almacen: { type: "string", enum: ["tablas", "memoria"] },
            walletGrupo: { type: "string" },
            walletFinanciera: { type: "string" },
            simuladas: { type: "array", items: { type: "string" } },
          },
        },
        PedidoPermiso: {
          type: "object",
          required: ["tipo", "monto"],
          properties: {
            tipo: { type: "string", enum: TIPOS_PERMISO, description: "grupo y financiera no llevan wallet: usan las de la configuración" },
            wallet: { ...ESQUEMAS_CAMPO.wallet, example: EJEMPLOS.walletOrigen },
            monto: { ...ESQUEMAS_CAMPO.monto, description: "Tope total del permiso, en pesos", example: 600000 },
            referencia: { type: "string", example: EJEMPLOS.referencia },
            vuelta: {
              type: "string",
              description: "https a donde vuelve el navegador después de aprobar; {permisoId} se reemplaza por el id",
              example: "https://t.me/natillera_bot?start=permiso_{permisoId}",
            },
          },
        },
        PermisoPedido: {
          type: "object",
          properties: { permisoId: { type: "string", example: EJEMPLOS.grantId }, urlAprobacion: { type: "string", format: "uri" } },
        },
        EstadoPermiso: {
          type: "object",
          properties: {
            estado: { type: "string", enum: ["pendiente", "aprobado", "rechazado", "cancelado"] },
            grantId: { type: "string", nullable: true, description: "El permisoId cuando está aprobado: es el GrantId que va a staging" },
            motivo: { type: "string", nullable: true },
          },
        },
        Aviso: {
          type: "object",
          properties: {
            id: { type: "string", description: "Cursor: crece siempre" },
            evento: { type: "string", enum: ["PagoCompletado", "PagoFallido"] },
            contractId: { type: "string", nullable: true },
            templateName: { type: "string", nullable: true },
            datos: {
              type: "object",
              properties: {
                tipo: { type: "string", enum: ["cuota", "deuda", "actividad", "premio", "liquidacion", "desembolso", "venta", "comision"] },
                referencia: { type: "string" },
                monto: { type: "number" },
                periodo: { type: "integer" },
                motivo: { type: "string" },
                simulado: { type: "boolean" },
              },
            },
            recibido: { type: "string", format: "date-time" },
          },
        },
        Pago: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            operacion: { type: "string", enum: Object.keys(REGLAS) },
            tipo: { type: "string" },
            referencia: { type: "string" },
            monto: { type: "number" },
            periodo: { type: "integer", nullable: true },
            origen: { type: "string" },
            destino: { type: "string" },
            simulado: { type: "boolean" },
            estado: { type: "string", enum: ["en-curso", "completado", "fallido"] },
            creado: { type: "string", format: "date-time" },
            etapas: {
              type: "object",
              description: "Las cuatro etapas que mira el jurado",
              properties: {
                solicitud: { type: "object", nullable: true },
                autorizacion: { type: "object", nullable: true },
                ejecucion: { type: "object", nullable: true, description: "cobroId, cotizacionId, pagoSalienteId, debitado y recibido" },
                finalizacion: { type: "object", nullable: true },
              },
            },
          },
        },
      },
    },
  };
}

function cuerpoDe(regla) {
  const propiedades = {};
  for (const [campo, tipo] of [...Object.entries(regla.campos), ...Object.entries(regla.opcionales ?? {})]) {
    propiedades[campo] = { ...ESQUEMAS_CAMPO[tipo], example: EJEMPLOS[campo] };
  }
  return { type: "object", required: Object.keys(regla.campos), properties: propiedades };
}

// La respuesta se calcula con la misma función que usa la API sobre un cuerpo de ejemplo.
function respuestaDe(regla) {
  const ejemplo = Object.fromEntries(Object.keys({ ...regla.campos, ...regla.opcionales }).map((c) => [c, EJEMPLOS[c]]));
  const respuesta = regla.respuesta(ejemplo);
  const propiedades = Object.fromEntries(
    Object.keys(respuesta).map((c) => [c, { ...ESQUEMAS_CAMPO[regla.campos[c] ?? "texto"], example: respuesta[c] }]),
  );
  return { type: "object", required: Object.keys(respuesta), properties: propiedades };
}

const json = (schema) => ({ "application/json": { schema } });
const camel = (texto) => texto.replace(/-([a-z])/g, (_, letra) => letra.toUpperCase());
