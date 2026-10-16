# Risk Analysis — Natillera 2.0 (corte de la hackathon)

> Cargado desde `known_risks` de la semilla USMD (REB-001), más lo que agregó la Fase 1.

| ID | Riesgo | Qué toca | Cómo se trata |
|---|---|---|---|
| R-01 | Open Payments podría no permitir el cobro recurrente con una sola autorización del participante (SUP-001) | EPIC-002, EPIC-003 | Prueba temprana en la primera hora del viernes (ENT-005 de IMD) |
| R-02 | La Test Wallet podría no manejar la moneda en que se define la natillera (SUP-004) | EPIC-001 | Verificar al crear la primera billetera de prueba |
| R-03 | Ninguna financiera vigilada ha aceptado todavía custodiar la cuenta del grupo (SUP-005) | EPIC-001 | En la hackathon la financiera es simulada; se dice así en el pitch |
| R-04 | Todo tiene que caber en 9 horas, y el corte creció con EPIC-006 y, en la Fase 2, con la mora diaria y el recordatorio (US-017); en la Fase 4 suma 10 historias de completitud (24 en total) | Todas | Checkpoint del viernes a las 15:00: si van atrasados, se recortan primero EPIC-006 y US-017, antes que el cobro real |
| R-05 | Usar el motor propio podría chocar con la regla de escribir todo el código durante el evento (VH-01) | Arquitectura | Mitigado: la hackathon se hace sin el motor («Independiente, motor después») |
