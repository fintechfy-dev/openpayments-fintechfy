import { describe, expect, it } from "vitest";
import { destinoSeguro, puedeVerNatillera, quedanVisibles } from "./acceso";
import { firmarSesion, leerSesion, type DatosSesion } from "./firma";
import { LimitadorIntentos, MAX_INTENTOS, VENTANA_MS } from "./intentos";
import { codigoCorrecto, crearReto, generarCodigo, leerReto, limpiarCodigo, mensajeCodigo, VIGENCIA_CODIGO_MS } from "./otp";
import { buscarUsuario, chatValido, limpiarUsuario } from "./usuarios";

const SECRETO = "s".repeat(32);
const AHORA = 1_800_000_000_000;
const financiera: DatosSesion = { usuario: "financiera", nombre: "Financiera Aliada", rol: "financiera", exp: AHORA + 1000 };
const admin: DatosSesion = { usuario: "andres", nombre: "Andrés Restrepo", rol: "administrador", exp: AHORA + 1000 };

describe("firma de la sesión", () => {
  it("lee lo que firmó", () => {
    expect(leerSesion(firmarSesion(financiera, SECRETO), SECRETO, AHORA)).toEqual(financiera);
    const conChat = { ...admin, telegramId: "555" };
    expect(leerSesion(firmarSesion(conChat, SECRETO), SECRETO, AHORA)).toEqual(conChat);
    // Bien firmada pero con un telegramId que no es texto: no es una sesión válida.
    const raro = { ...admin, telegramId: 555 } as unknown as DatosSesion;
    expect(leerSesion(firmarSesion(raro, SECRETO), SECRETO, AHORA)).toBeNull();
  });

  it("rechaza una cookie alterada (por ejemplo, alguien que se sube a financiera)", () => {
    const token = firmarSesion(admin, SECRETO);
    const [, firma] = token.split(".");
    const cuerpoFalso = Buffer.from(JSON.stringify({ ...admin, rol: "financiera" })).toString("base64url");
    expect(leerSesion(`${cuerpoFalso}.${firma}`, SECRETO, AHORA)).toBeNull();
  });

  it("rechaza otra firma, una sesión vencida, basura y un secreto corto", () => {
    const token = firmarSesion(financiera, SECRETO);
    expect(leerSesion(token, "x".repeat(32), AHORA)).toBeNull();
    expect(leerSesion(token, SECRETO, financiera.exp)).toBeNull();
    expect(leerSesion("no-es-un-token", SECRETO, AHORA)).toBeNull();
    expect(leerSesion(`${token}.extra`, SECRETO, AHORA)).toBeNull();
    expect(leerSesion(undefined, SECRETO, AHORA)).toBeNull();
    expect(leerSesion(firmarSesion(financiera, "corto"), "corto", AHORA)).toBeNull();
  });
});

describe("código de acceso (OTP)", () => {
  it("genera 6 dígitos, con ceros a la izquierda cuando toca", () => {
    for (let i = 0; i < 200; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });

  it("acepta el código correcto y rechaza cualquier otro", () => {
    const { token } = crearReto("financiera", "004817", SECRETO, AHORA);
    const reto = leerReto(token, SECRETO, AHORA)!;
    expect(codigoCorrecto(reto, "004817", SECRETO)).toBe(true);
    expect(codigoCorrecto(reto, "004818", SECRETO)).toBe(false);
    expect(codigoCorrecto(reto, "4817", SECRETO)).toBe(false);
    expect(codigoCorrecto(reto, "", SECRETO)).toBe(false);
  });

  it("la cookie no contiene el código y no se puede alterar ni reutilizar vencida", () => {
    const { token } = crearReto("andres", "123456", SECRETO, AHORA);
    expect(Buffer.from(token.split(".")[0]!, "base64url").toString()).not.toContain("123456");
    expect(leerReto(token, SECRETO, AHORA + VIGENCIA_CODIGO_MS)).toBeNull();
    expect(leerReto(token, "x".repeat(32), AHORA)).toBeNull();
    const [, firma] = token.split(".");
    const otro = Buffer.from(JSON.stringify({ usuario: "financiera", nonce: "n", huella: "h", exp: AHORA + 1000 })).toString("base64url");
    expect(leerReto(`${otro}.${firma}`, SECRETO, AHORA)).toBeNull();
  });

  it("el mismo código en dos retos deja huellas distintas", () => {
    const a = crearReto("andres", "111111", SECRETO, AHORA).reto;
    const b = crearReto("andres", "111111", SECRETO, AHORA).reto;
    expect(a.huella).not.toBe(b.huella);
  });

  it("limpia lo que escribe la persona y arma el mensaje del bot", () => {
    expect(limpiarCodigo(" 482 913 ")).toBe("482913");
    expect(limpiarCodigo("482-913")).toBe("482913");
    expect(limpiarCodigo(null)).toBe("");
    const texto = mensajeCodigo("482913");
    expect(texto).toContain("482913");
    expect(texto.split("\n").length).toBeLessThanOrEqual(3);
    expect(texto).not.toMatch(/token|otp|grant/i);
  });
});

describe("usuarios de demo", () => {
  it("encuentra el usuario sin importar mayúsculas ni espacios", () => {
    expect(buscarUsuario(limpiarUsuario(" Financiera "))?.rol).toBe("financiera");
    expect(buscarUsuario(limpiarUsuario("andres"))?.rol).toBe("administrador");
    expect(buscarUsuario(limpiarUsuario("nadie"))).toBeNull();
  });

  it("solo acepta chat ids numéricos", () => {
    expect(chatValido("123456789")).toBe(true);
    expect(chatValido("-1001234")).toBe(true);
    expect(chatValido("@usuario")).toBe(false);
    expect(chatValido(undefined)).toBe(false);
  });
});

describe("límite de intentos", () => {
  it("bloquea después de 5 fallos y libera al pasar la ventana", () => {
    const l = new LimitadorIntentos();
    for (let i = 0; i < MAX_INTENTOS; i++) l.registrarFallo("andres", AHORA);
    expect(l.bloqueado("andres", AHORA)).toBe(true);
    expect(l.bloqueado("financiera", AHORA)).toBe(false);
    expect(l.bloqueado("andres", AHORA + VENTANA_MS)).toBe(false);
  });
});

describe("acceso", () => {
  it("la financiera ve todo; el administrador solo sus natilleras", () => {
    expect(puedeVerNatillera(financiera, { administrador: "Gloria Patiño" })).toBe(true);
    expect(puedeVerNatillera(admin, { administrador: "Andrés Restrepo" })).toBe(true);
    expect(puedeVerNatillera(admin, { administrador: "Gloria Patiño" })).toBe(false);
  });

  it("con el id de Telegram del administrador, compara el id y no el nombre", () => {
    const conChat: DatosSesion = { ...admin, telegramId: "555" };
    expect(puedeVerNatillera(conChat, { administrador: "Andrés", administradorTelegramId: "555" })).toBe(true);
    // Un nombre copiado no basta.
    expect(puedeVerNatillera(conChat, { administrador: "Andrés Restrepo", administradorTelegramId: "999" })).toBe(false);
    // Sin chat configurado en la sesión, no ve natilleras que sí traen id.
    expect(puedeVerNatillera(admin, { administrador: "Andrés Restrepo", administradorTelegramId: "555" })).toBe(false);
    expect(puedeVerNatillera(financiera, { administrador: "x", administradorTelegramId: "999" })).toBe(true);
  });

  it("sin id compara el nombre normalizado (tilde compuesta o descompuesta, espacios)", () => {
    expect(puedeVerNatillera(admin, { administrador: " Andre\u0301s Restrepo " })).toBe(true);
  });


  it("solo vuelve a rutas internas después de iniciar sesión", () => {
    expect(destinoSeguro("/pagos")).toBe("/pagos");
    expect(destinoSeguro("/natilleras/los-primos?x=1")).toBe("/natilleras/los-primos?x=1");
    expect(destinoSeguro("//malo.com")).toBe("/natilleras");
    expect(destinoSeguro("/\\malo.com")).toBe("/natilleras");
    expect(destinoSeguro("https://malo.com")).toBe("/natilleras");
    expect(destinoSeguro("/ingresar")).toBe("/natilleras");
    expect(destinoSeguro(undefined)).toBe("/natilleras");
  });
});

describe("quedanVisibles", () => {
  const pagos = [{ natilleraId: "nat-1" }, { natilleraId: "nat-2" }, { natilleraId: "" }];
  it("la financiera ve todo, también lo que no se ubicó en ninguna natillera", () => {
    expect(quedanVisibles(financiera, pagos, new Set())).toEqual(pagos);
  });
  it("un administrador solo ve lo de sus natilleras, y nunca lo que no tiene natillera", () => {
    expect(quedanVisibles(admin, pagos, new Set(["nat-1"]))).toEqual([{ natilleraId: "nat-1" }]);
  });
});
