// El enlace y el mensaje de invitación (US-003). Sin dependencias: los usan el bot (/invitar) y el panel
// del administrador en la Mini App (miniapp/admin/).

export const enlaceDeInvitacion = (usuarioBot, codigo) => `https://t.me/${usuarioBot}?start=${codigo}`;

// Las dos primeras líneas del mensaje para el grupo; la tercera lleva el enlace.
export function invitacionSinEnlace(nombreNatillera) {
  return [
    `Únete a nuestra natillera «${nombreNatillera}» para ahorrar juntos para diciembre.`,
    'La plata la guarda Financiera Aliada, no una persona.',
  ].join('\n');
}

export function textoInvitacion(nombreNatillera, enlace) {
  return `${invitacionSinEnlace(nombreNatillera)}\nEntra aquí y mira las reglas: ${enlace}`;
}
