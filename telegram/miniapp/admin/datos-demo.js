// Datos de ejemplo del panel del administrador, con la forma de src/natillera/panel.js. Se muestran
// solo si la página se abre sin los datos del bot (fuera de Telegram, para revisar el diseño), con un
// aviso que dice que son de ejemplo.

export const DATOS_DEMO = {
  v: 1,
  generado: '2026-10-16T23:00:00.000Z',
  natilleras: [
    {
      id: 'demo-amigos',
      nombre: 'Los Amigos (ejemplo)',
      creada: '2026-10-16',
      estado: 'creada',
      cuota: 50000,
      cuotas: 2,
      inicio: '2026-11-01',
      final: '2026-12-31',
      proximo: null,
      cupo: 5,
      listas: 3,
      pagaron: 0,
      periodo: 0,
      saldo: 0,
      mora: 1,
      enlace: 'https://t.me/natillera_ejemplo_bot?start=ejemplo',
      personas: [
        { nombre: 'Andrés Restrepo', estado: 'autorizo', pagadas: 0, aportado: 0, tu: true },
        { nombre: 'Marta Restrepo', estado: 'autorizo', pagadas: 0, aportado: 0 },
        { nombre: 'Don Jairo Gómez', estado: 'autorizo', pagadas: 0, aportado: 0 },
        { nombre: 'Luisa Ríos', estado: 'falta_autorizar', pagadas: 0, aportado: 0 },
      ],
    },
    {
      id: 'demo-primos',
      nombre: 'Los Primos (ejemplo)',
      creada: '2026-01-10',
      estado: 'activa',
      cuota: 50000,
      cuotas: 12,
      inicio: '2026-01-15',
      final: '2026-12-15',
      proximo: '2026-11-15',
      cupo: 3,
      listas: 4,
      pagaron: 4,
      periodo: 10,
      saldo: 1950000,
      mora: 0.1,
      enlace: null,
      personas: [
        { nombre: 'Andrés Restrepo', estado: 'activa', pagadas: 10, aportado: 500000, tu: true },
        { nombre: 'Marta Restrepo', estado: 'activa', pagadas: 10, aportado: 500000 },
        { nombre: 'Camilo Restrepo', estado: 'pendiente', pagadas: 9, aportado: 450000 },
        { nombre: 'Don Jairo Gómez', estado: 'activa', pagadas: 10, aportado: 500000 },
      ],
    },
  ],
};
