# Lifecycle Report — Natillera 2.0 (corte de la hackathon)

> Sesión `natillera-2` · Fase 4 · 2026-10-14. Diez áreas revisadas contra las 14 historias del corte.

## Resultado

Se encontraron 10 huecos y se agregaron 10 historias de completitud, todas al corte por decisión del equipo («Críticas e importantes»). Siete son críticas: configuración y modo demo, secretos fuera del repositorio público, retorno de la autorización, token vigente para cada cobro, registro de pagos para el jurado, guion de demo y entregables del repositorio. Tres son importantes: vigilancia del programador de cobros, estado persistente sin doble cobro y bitácora del administrador. El área de usuarios queda cubierta por las historias existentes.

Quedan como mejora para después del evento: cancelar una natillera antes de arrancar y el resumen final para el administrador.

## Riesgo por área (1-10; 10 = riesgo máximo)

Estimación del facilitador, no medición. Dimensiones: técnico, negocio, dependencias, complejidad e incertidumbre.

| Área | Téc. | Neg. | Dep. | Comp. | Incert. | Riesgo |
|---|---|---|---|---|---|---|
| configuracion | 6 | 8 | 4 | 3 | 5 | 5.2 |
| usuarios | 2 | 3 | 2 | 2 | 3 | 2.4 |
| seguridad | 8 | 8 | 5 | 4 | 3 | 5.6 |
| auditoria | 3 | 6 | 3 | 3 | 3 | 3.6 |
| monitoreo | 6 | 7 | 5 | 4 | 4 | 5.2 |
| integraciones | 9 | 9 | 9 | 7 | 8 | 8.4 |
| mantenimiento | 3 | 9 | 2 | 2 | 2 | 3.6 |
| reportes | 5 | 9 | 6 | 4 | 4 | 5.6 |
| backup | 6 | 6 | 4 | 5 | 4 | 5.0 |
| testing | 5 | 9 | 6 | 3 | 4 | 5.4 |

El área de mayor riesgo es integraciones (Open Payments), por SUP-001 y la renovación de tokens. Se ataca primero, en la prueba temprana del viernes.

## Efecto en el tiempo

El corte pasó de 14 a 24 historias. La sospecha del equipo en Impact Mapping fue: «no alcanzo el tiempo y no revisamos bien el alcance». El checkpoint del viernes a las 15:00 decide qué se recorta primero: actividades (EPIC-006), mora diaria (US-017), bitácora (US-012-AUD) y monitoreo (US-007-MON), en ese orden [propuesta del facilitador].
