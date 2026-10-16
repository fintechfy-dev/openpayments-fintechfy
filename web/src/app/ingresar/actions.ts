"use server";

import { redirect } from "next/navigation";
import { borrarReto, chatDe, codigoPorTerminal, crearSesion, guardarReto, leerRetoActual, secretoSesion, sesionConfigurada } from "@/lib/sesion";
import { destinoSeguro } from "@/lib/sesion/acceso";
import { LimitadorIntentos, VENTANA_MS } from "@/lib/sesion/intentos";
import { codigoCorrecto, generarCodigo, limpiarCodigo, mensajeCodigo } from "@/lib/sesion/otp";
import { enviarPorTelegram } from "@/lib/sesion/telegram";
import { buscarUsuario, chatValido, limpiarUsuario } from "@/lib/sesion/usuarios";

export interface EstadoIngreso {
  paso: "usuario" | "codigo";
  usuario?: string;
  aviso?: string;
  error?: string;
}

// En memoria: alcanzan para la demo (un solo servidor). Frenan a quien pide códigos sin parar
// o prueba códigos al azar.
const envios = new LimitadorIntentos(3, VENTANA_MS);
const fallos = new LimitadorIntentos(5, VENTANA_MS);
// Cada código sirve una sola vez, aunque alguien guarde la cookie del reto.
const retosUsados = new Set<string>();

const SIN_CONFIGURAR = "El inicio de sesión no está configurado todavía. Falta SESION_SECRETO en web/.env.local.";
// La misma respuesta exista o no el usuario: así no se puede averiguar quién tiene cuenta.
const CODIGO_ENVIADO = "Si el usuario está registrado, te enviamos un código de 6 dígitos por Telegram. Vence en 5 minutos.";

async function pedirCodigo(usuario: string): Promise<EstadoIngreso> {
  if (!usuario) return { paso: "usuario", error: "Escribe tu usuario." };
  if (envios.bloqueado(usuario)) {
    return { paso: "usuario", usuario, error: "Ya pediste varios códigos. Espera 10 minutos y pide uno nuevo." };
  }
  envios.registrarFallo(usuario);

  const encontrado = buscarUsuario(usuario);
  const chat = encontrado ? chatDe(encontrado) : undefined;
  if (encontrado && (codigoPorTerminal() || chatValido(chat))) {
    const codigo = generarCodigo();
    if (codigoPorTerminal()) {
      // Solo en desarrollo y sin token del bot: para poder probar sin Telegram.
      console.info(`[ingreso] Código de ${usuario}: ${codigo} (desarrollo: falta TELEGRAM_BOT_TOKEN, no se envió por Telegram)`);
    } else {
      const envio = await enviarPorTelegram(chat!, mensajeCodigo(codigo));
      if (!envio.ok) {
        console.error(`[ingreso] No se pudo enviar el código a ${usuario}: ${envio.motivo}`);
        return { paso: "usuario", usuario, error: "No pudimos enviarte el código por Telegram. Intenta de nuevo en un momento." };
      }
    }
    await guardarReto(usuario, codigo);
  } else if (encontrado) {
    console.warn(`[ingreso] ${usuario} no tiene ${encontrado.variableChat} configurado en web/.env.local`);
  }
  return { paso: "codigo", usuario, aviso: CODIGO_ENVIADO };
}

async function verificarCodigo(usuario: string, codigo: string, destino: string): Promise<EstadoIngreso> {
  if (fallos.bloqueado(usuario)) {
    return { paso: "usuario", usuario, error: "Hubo varios intentos fallidos. Espera 10 minutos y pide un código nuevo." };
  }
  if (!codigo) return { paso: "codigo", usuario, error: "Escribe el código de 6 dígitos que te llegó por Telegram." };

  const reto = await leerRetoActual();
  const encontrado = buscarUsuario(usuario);
  const valido = reto && encontrado && reto.usuario === usuario && !retosUsados.has(reto.nonce) && codigoCorrecto(reto, codigo, secretoSesion());

  if (!valido) {
    fallos.registrarFallo(usuario);
    if (fallos.bloqueado(usuario)) {
      await borrarReto();
      return { paso: "usuario", usuario, error: "Hubo varios intentos fallidos. Espera 10 minutos y pide un código nuevo." };
    }
    const motivo = !reto || retosUsados.has(reto.nonce) ? "El código venció o ya se usó. Pide uno nuevo." : "Ese código no es correcto. Revísalo e intenta de nuevo.";
    return { paso: "codigo", usuario, error: motivo };
  }

  retosUsados.add(reto.nonce);
  fallos.limpiar(usuario);
  await borrarReto();
  await crearSesion(encontrado);
  redirect(destino);
}

export async function ingresar(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  if (!sesionConfigurada()) return { paso: "usuario", error: SIN_CONFIGURAR };

  const intencion = datos.get("intencion");
  const usuario = limpiarUsuario(datos.get("usuario"));

  if (intencion === "cambiar") {
    await borrarReto();
    return { paso: "usuario" };
  }
  if (intencion === "verificar") {
    return verificarCodigo(usuario, limpiarCodigo(datos.get("codigo")), destinoSeguro(datos.get("siguiente")));
  }
  return pedirCodigo(usuario);
}
