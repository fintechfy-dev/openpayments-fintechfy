# PanelJurado

Panel web (escritorio) para que el jurado vea cada pago y sus 4 etapas en tiempo real, incluidos los fallidos con su motivo.

- Encabezado: logo, etiqueta "Panel del jurado" y estado de la natillera.
- Indicadores: pagos procesados, completados, fallidos y dinero en custodia (datos reales de la demo).
- Tabla: una fila por pago; las 4 etapas como marcas (check = hecha, alerta = falló, reloj = pendiente, azul = en curso) con el orden fijo Solicitud · Autorización · Ejecución · Finalización. Al hacer clic en una fila, abre la `LineaTiempoPago` con horas exactas.
- Motivos de falla en lenguaje claro: "Fondos insuficientes", "Autorización vencida", "Billetera no encontrada", "Límite de la autorización alcanzado".
