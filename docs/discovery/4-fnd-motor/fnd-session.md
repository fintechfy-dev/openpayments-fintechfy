# FND Session State (v2)

---
session_id: FND-20261015-natillera-2
ecosystem_name: "Natillera 2.0 — ahorro en grupo sin riesgo de custodia"
created_at: "2026-10-15T13:02:47-05:00"
last_updated: "2026-10-15T13:02:47-05:00"
current_phase: 6
state: promoted
# Simulacro: el equipo prueba aquí el FND con IA antes de repetirlo en vivo en la hackathon de
# Open Payments Medellín (16-17 oct 2026). Pedido del usuario: «este es un simulacro para entender
# que el framework AI si funciona ... por eso debes hacerlo muy bien hecho».
---

## Fase 0 — AVL: Actor-Value-Loop
status: complete

### Origen externo (mapa de impacto IMD acordado)
origen_externo:
  framework: IMD
  repo: "E:/git/bdd20-product-discovery"
  mapa: "impact-mapping-discovery/sessions/IMD-20261014-natillera-2/mapa.yaml"
  lint: verificado_exit_0          # python tools/imd_lint.py sessions/IMD-20261014-natillera-2 → exit 0 (2026-10-15), MAPA BIEN FORMADO
  acuerdo_alcanzado: true          # Proponente (decisor) + integrante del equipo; nadie disintió
  decision_resuelta: true          # corte de la hackathon: AD1, PA1, FI3
  meta_hito: "Que el jurado de la hackathon de Open Payments Medellín lleve nuestra propuesta a la ronda final y la premie por su aporte a la inclusión financiera."
  nota: "se referencia, no se copia. El mapa es de ADOPCIÓN (qué conducta cambia para que el jurado premie); el AVL de esta sesión mapea FLUJO DE VALOR. Sus actores entran como candidatos, nunca 1:1."
  insumos_hermanos:
    - "user-story-mapping-discovery/sessions/USMD-20261014-natillera-2 (recorrido de 6 actividades, rebanada REB-001)"
    - "bdd-2.0/sessions/natillera-2 (24 historias del corte, 141 criterios, 78 escenarios Gherkin) — en el repo hermano; insumo de CSM y CEM, no fuente de verdad del motor"
  decision_que_cambia: "En BDD el equipo decidió construir la hackathon sin el motor («Independiente, motor después»). Esta sesión FND es el simulacro del producto SOBRE el motor; en la hackathon real repetirán el FND en vivo."

### Actors
- id: ACT-001
  name: "Participante"
  role: "ahorrador"
  value_given: "cuotas periódicas, pagos de actividades, mora si se atrasa"
  value_received: "su ahorro en diciembre + parte del acumulado y de la mora, premios, acceso a crédito"
  financial_instrument: "ahorro programado por participante; obligación por actividad; crédito"
  origen: "candidato del mapa IMD (ACT-002 Participante) + PDF; confirmado AVL Q1"
- id: ACT-002
  name: "Administrador (tesorero)"
  role: "organizador que también ahorra"
  value_given: "reglas, invitaciones, actividades, elección de ganadores"
  value_received: "natillera que opera sin cuaderno y sin custodiar dinero ajeno"
  financial_instrument: "cuenta colectiva (la configura; no la mueve)"
  origen: "candidato del mapa IMD (ACT-003) + PDF; confirmado AVL Q1"
- id: ACT-003
  name: "Financiera"
  role: "custodio y prestamista"
  value_given: "custodia, cuenta del grupo, crédito"
  value_received: "ahorradores constantes, intereses del crédito, recuperación de impagos en la liquidación"
  financial_instrument: "cuenta colectiva de ahorro; crédito"
  origen: "candidato del mapa IMD (ACT-004, no identificada; simulada) + PDF; confirmado AVL Q1"
# Excluidos del AVL: jurado (actor de ADOPCIÓN en IMD, no del flujo de valor) y proveedor de billetera / Open Payments (riel de pago, no da ni recibe valor en el loop).

### Value Loop
main_loop: "Participante →(cuota)→ Cuenta Natillera (custodia Financiera) →(liquidación en diciembre)→ Participante — cierra"
secondary_loops:
  - "Actividades: aporte de participantes → premio al ganador o acumulado → liquidación"
  - "Mora: participante moroso → mora → reparto entre todos en la liquidación"
  - "Crédito: Financiera → préstamo → pagos aparte, o descuento en la liquidación si no paga"
  - "Custodia: la financiera NO cobra ni paga por custodiar (AVL Q2: «No gana por custodiar»). Rendimientos del participante = actividades + mora."
  - "Cierre: la cuenta de la natillera termina en 0 — «la financiera queda en ceros todo se reparte» (AVL Q3). [supuesto a verificar en CEM: lo descontado por préstamo impago salda ESE crédito; no hay remanente para la financiera]"

### AVL Map Card
```
AVL MAP — Natillera 2.0
Actores:   Participante · Administrador (también ahorra) · Financiera
Loop:      Participante →cuota→ Cuenta Natillera (custodia Financiera) →liquidación→ Participante  ✔ cierra
Secundarios: actividades (aporte → premio o acumulado) · mora (→ reparto entre todos)
             · crédito (préstamo → pagos aparte, o descuento que salda el crédito en la liquidación)
Financiera: no cobra ni paga por custodiar; la cuenta termina en 0 → gana con el crédito y los clientes
Instrumentos: cuenta colectiva · ahorro programado por participante · obligación por actividad · crédito
```
Fuente de Q2/Q3: el documento maestro (`C:/Users/WILLI/Downloads/Natillera 2.pdf`, mismo archivo de 2026-10-14 09:06, 157463 bytes) NO define interés ni comisión por custodia; decidió el usuario.

---

## Fase 1 — CLIF: Contract Catalog
status: complete

### Contracts
<!-- CLIF = (C*0.35 + L*0.20 + I*0.30 + F*0.15) * 20 · rúbrica anclada del SKILL -->
- id: CONT-001
  name: "Natillera (cuenta colectiva)"
  slug: natillera-cuenta
  type: Wallet          # A agrega transacciones de B → Wallet/Aggregator
  actor: ACT-003
  clif: { C: 5, L: 5, I: 5, F: 3, score: 94 }
  mvp: true
  notes: "Reglas, arranque por cupo, total por DELTAS (no jerarquía: gap del ledger), disparo de liquidación. Hub del ecosistema."
- id: CONT-002
  name: "Participación (ahorro programado por participante)"
  slug: natillera-participacion
  type: Custom
  actor: ACT-001
  clif: { C: 5, L: 5, I: 5, F: 5, score: 100 }
  mvp: true
  notes: "La «cuenta de pago periódico» del documento: validación, cobro por periodo, mora diaria, parte en la liquidación."
- id: CONT-003
  name: "Crédito desde el ahorro"
  slug: natillera-credito-ahorro
  type: Credit
  actor: ACT-003
  clif: { C: 3, L: 5, I: 3, F: 5, score: 74 }
  mvp: true
  notes: "Lo otorga la financiera tras Y pagos, hasta N×cuota, tasa comercial, pagos aparte; descuento en la liquidación si no paga. En la hackathon era extra; aquí entra (producto sobre el motor)."
- id: CONT-004
  name: "Obligación de actividad (cuenta por pagar por participante)"
  slug: natillera-obligacion-actividad
  type: Custom
  actor: ACT-001
  clif: { C: 3, L: 3, I: 3, F: 5, score: 66 }
  mvp: true
  notes: "El documento: «En el motor financiero le creará a cada participante una cuenta por pagar». Con su castigo de mora diario."
- id: CONT-005
  name: "Actividad especial (rifa, bazar, compartir)"
  slug: natillera-actividad
  type: Custom
  actor: ACT-002
  clif: { C: 3, L: 3, I: 3, F: 1, score: 54 }
  mvp: true
  notes: "Valor por participante, premio (0 = sin premio), ganador confirmado o acumulado."

### MVP Scope
mvp_contracts: [CONT-001, CONT-002, CONT-003, CONT-004, CONT-005]   # «Los 5 (Recomendado)»
deferred: []

---

## Fase 2 — CSM: State Machines
status: complete

Las máquinas viven en `ecosystem-topology.json` (`states`, `transitions`, `events_emitted` por contrato); aquí solo la prosa.

### Aprobaciones
- CONT-001 Natillera: «Aprobada». El usuario pidió ver las otras cuatro antes de seguir («no veo las maquinas de estado de los otros contratos»).
- CONT-002 Participación, CONT-003 Crédito, CONT-004 Obligación, CONT-005 Actividad: «Aprobada» cada una.
- Hallazgo de conservación (antes del Gate 2.5): la natillera llegaba a terminal con reembolsos sin pagar. Se agregaron REEMBOLSANDO (Natillera) y EN_REEMBOLSO (Participación) — «Sí, agregar ambos».
- RegistrarValidado quedó sin guarda: con la guarda de cupo dejaba de contar validados al llegar al cupo.

### Triage de eventos terminales
Cada evento `terminal: true` lleva su `triage`: «llamada» (lo consume una llamada del propio template a la API Open Payments del tenant), «aviso» (Telegram, aviso firmado del template) o «informativo / auditoría».

### Gate 2.5 — TDD estados
status: complete (RED honesto: los templates aún no existen; la evidencia la escribió `FndValidator test-evidence` en `tdd.last_run`)

Archivos (`dotnet-backend/tests/ProcessingEngine.API.Tests/Integration/EcoNatillera2/`):
- `Natillera2TestBase.cs` — factory escopada a `templates/` de esta sesión (patrón Pagui × Credicosmos: en memoria, sin Postgres) y recetas para llevar cada contrato a cada estado. Los triggers de una persona o del backend del tenant (ConfirmarAutorizacion, RechazarAutorizacion, PagarDeuda, AutorizarPago, IndicarGanador, CerrarSinPremioOSinGanador, PagoRecibido) van por HTTP y por eso deben ser públicos; el resto por la vía del scheduler.
- `NatilleraCuentaTriggerTests.cs` ← CONT-001
- `NatilleraParticipacionTriggerTests.cs` ← CONT-002
- `NatilleraCreditoAhorroTriggerTests.cs` ← CONT-003
- `NatilleraObligacionActividadTriggerTests.cs` ← CONT-004
- `NatilleraActividadTriggerTests.cs` ← CONT-005
- Evidencia TRX fuera del repo: `E:/tmp/natillera2-fnd/gate25-natillera2.trx`.

Interfaz que fijan las pruebas (la Fase 4 y la 5 deben honrarla; cambiarla exige nota de decisión aquí): nombres de triggers y parámetros de las recetas, y los conceptos de las guardas que las pruebas LEEN (SaldoTotal, SaldoVencido, DeudaCuotas, MoraAcumulada, ValorObligacion, CastigoAcumulado). Las máquinas de estado se llaman EstadoNatillera, EstadoParticipacion, EstadoCredito, EstadoObligacion y EstadoActividad, con el índice = posición en `states`. Escenario de referencia: cuota 100.000 mensual del 2026-11-01 al 2026-12-20 (fecha final movida del 1 al 20 de diciembre para que un préstamo pueda llegar en mora a la liquidación).

Hallazgos del gate (defectos de la máquina que las pruebas negativas destaparon; corregidos en la topología, cada uno con su prueba):
- H1 · Natillera, RegistrarParteCalculada: la rama de cierre usaba `>=`; un reporte duplicado re-emitía SobranteCalculado y repartía el sobrante dos veces. Ahora `==`. Lo mismo en RegistrarPagoLiquidacion y RegistrarReembolso.
- H2 · Natillera, RegistrarReembolso: contaba ParticipantesConAporte, pero el reembolso le llega a TODAS las participaciones validadas, también a la que nunca pagó, y esa también reporta. Con el conteo viejo la natillera nunca cerraba. Ahora cuenta ParticipantesValidados (y la liquidación también, en vez de ParticipantesActivos).
- H3 · Participación, Reembolsar: quien nunca pagó pedía un reembolso de 0 al riel de pago. Ahora VALIDADA va directo a REEMBOLSADA, y MORA se parte por TotalAportado (> 0 → EN_REEMBOLSO; == 0 → REEMBOLSADA).
- H4 · Participación, AplicarSobrante: el moroso cuya deuda se come su parte pedía un pago de 0. Ahora, si ParteNeta + SobranteAsignado == 0, va directo a LIQUIDADA.
- H5 · Natillera: el descuento del préstamo SALE de la cuenta (va al crédito de la financiera) y no había transición que lo restara del saldo; con un prestatario en mora la natillera se quedaba en LIQUIDANDO para siempre. Nueva transición LIQUIDANDO ──RegistrarDescuentoPrestamo──> LIQUIDANDO (guarda MontoDescuento <= SaldoNatillera, emite DescuentoPrestamoRegistrado). Su fuente se decide en la Fase 3.
- H6 · Participación, CobrarCuota: la guarda usaba CuotasCobradas (solo cobros exitosos); al moroso se le cobraba un periodo que no existe. Ahora PeriodosSolicitados < NumeroCuotas: el periodo fallido ya es deuda y se paga con PagarDeuda.
- H7 · Actividad, RegistrarRecaudo en PREMIO_PARCIAL: un recaudo de 0 le ordenaba al ganador un pago de 0. Ahora exige MontoRecaudo > 0.

Pendientes para la auditoría 6.5 (no se resuelven aquí):
- Carrera de dinero en tránsito: un cobro de primera cuota que se confirma DESPUÉS de que la natillera pasó a REEMBOLSANDO deja dinero en la cuenta sin registrar.
- PagoRecibido con monto mayor que SaldoTotal se acepta (`>=`): ¿qué pasa con el excedente?
- Participaciones que se quedan en PENDIENTE_VALIDACION para siempre si la natillera arranca sin ellas (fuga de vivacidad, sin dinero).
- Idempotencia: el mismo ParticipacionId reportando dos veces su parte o su pago.

---

## Fase 3 — EBT: Event-Bridge-Topology
status: complete (pendiente de aprobación del usuario antes del commit)

Los 26 bridges viven en `ecosystem-topology.json` (`bridges`, con `resolution` declarativa); el diagrama es proyección
(`topology-diagram.md`, `FndValidator diagram`). Aquí solo las decisiones.

### Decisiones de bridges
- Todos son reglas declarativas: nadie crea contratos de integración. La llave de negocio de cada destino es inmutable: NatilleraId, ParticipacionId y ActividadId.
- Difusiones (`many`) acotadas siempre por una llave: lo que la natillera le dice a "sus" participaciones va por NatilleraId; lo que una participación le dice a "sus" obligaciones o "su" crédito va por ParticipacionId.
- Condicionales con `condition_impl` compilada en el emisor (`natillera-participacion.CalcularParte`, las dos funciones):
  - BRG-012 DescuentoPrestamoAplicado (DeudaPrestamoEnMora > 0).
  - BRG-013 DescuentoActividadesAplicado (DeudaActividades > 0).
- Creación: BRG-014 hace nacer la obligación con identidad (participación, actividad).
- Rechazos por estado ESPERADOS (no son defectos):
  - una participación sin permiso que recibe el primer cobro (BRG-002);
  - un crédito PAGADO anterior que recibe un descuento (BRG-012);
  - una obligación PAGADA que recibe el descuento de actividades (BRG-013);
  - CreditoPagado que llega a una participación que ya liquidó (BRG-025).
- Ciclos: los cinco contratos forman una sola componente fuerte (nueve ciclos elementales). Es un ciclo de CONTRATOS, no de EVENTOS: el grafo función→evento→función es acíclico (el script aborta si no) y toda cadena muere en un evento terminal o en una llamada al riel. Va en `allowed_cycles` con `fsv_proof: null`. **No penaliza el score pero BLOQUEA la promoción (gate FSV, DQS007).**
- Profundidad máxima 4 (la liquidación completa); el motor corta a los 10 saltos.

Ajustes de máquina que exigió el EBT (E1–E7, todos con prueba):
- E1 · El calendario es de la natillera. El primer cobro sale de NatilleraIniciada; los siguientes, de la nueva transición ACTIVA ──AbrirPeriodo──> ACTIVA (emite PeriodoAbierto). Con CobrarCuota programado en cada participación, se cobraba aunque la natillera nunca arrancara.
- E2 · El dinero de las actividades entra con su propio trigger, RegistrarIngresoActividad (en INICIADA y ACTIVA), que NO cuenta para el cupo. Con RegistrarAporte, una rifa en INICIADA activaba la natillera sin el cupo de personas.
- E3 · H5 revisado. El descuento del préstamo viaja DENTRO de ParteCalculada (parámetro MontoDescuentoPrestamo) y se quitó RegistrarDescuentoPrestamo. Como evento aparte podía llegar después de la última parte, y el sobrante se calculaba sobre un saldo que ya no existía.
- E4 · Las deudas de actividades se descuentan en la liquidación con un evento propio y condicional, DescuentoActividadesAplicado, como el del préstamo.
- E5 · El crédito se ata a la PARTICIPACIÓN (ParticipacionId, llave única), no a participante + natillera. Al descontar en la liquidación ya no se reporta deuda a una participación que liquidó.
- E6 · La obligación nace por regla de creación (trigger CrearObligacion); ya no lleva ObligacionId propio. ObligacionPagada lleva el valor (va al recaudo de la actividad) y lo cobrado (valor + castigo, va al pozo).
- E7 · Decisión del usuario «Se cierra como está». Al liquidar, una actividad sin ganador va al acumulado (RECAUDANDO → ACUMULADA). Una con premio parcial queda en lo pagado (PREMIO_PARCIAL → PREMIO_PAGADO, aviso PremioCerradoEnLiquidacion). No mueve dinero ese día, así que no compite con el cálculo de las partes.

Supuestos que la Fase 4 debe confirmar o corregir:
- [supuesto] DeudaPrestamoReportada informa el saldo TOTAL del crédito (AVL Q3: lo descontado salda ESE crédito), con tope en la parte.
- [supuesto] A lo sumo un crédito vivo por participación (regla de otorgamiento de la financiera).
- [supuesto] Redondeo al centavo: la parte igual se trunca y el sobrante reparte el resto; el residuo lo absorbe la participación del último reporte. El oráculo de la cascada de liquidación da 200.000 · 200.000 · 100.000.
- [supuesto] FechaPago de una actividad anterior a la FechaFinal de la natillera; si no, una obligación PENDIENTE al liquidar se cierra sin descontarse.

### Gate 3.5 — TDD bridges
status: complete (RED honesto; evidencia de `FndValidator test-evidence` en `tdd.last_run`)
- `Natillera2BridgeTests.cs`: un test por bridge (BRG-001..026) y un negativo por bridge condicional (BRG-012, BRG-013). Cada test crea el origen y el destino con la misma llave, dispara la transición emisora y entrega el evento al bus. El DynamicEventRouter real resuelve la regla y dispara el destino.
- `Natillera2CascadeTests.cs`: un test por cadena de `topology.cascade_chains`. Donde la cadena cruza el riel de pago, la prueba responde como el riel (CuotaCobrada, PagoLiquidacionConfirmado, ReembolsoConfirmado). La liquidación completa trae su oráculo a mano en el comentario.
- Desvío declarado del texto de `fnd-tdd-spec-writer`, que pide TrueCascadeApiFactory (Postgres + Redpanda) y prohíbe "rutear a mano". Se siguió el exemplar vivo más reciente (Pagui × Credicosmos): factory en memoria; la prueba solo entrega al bus el evento ya emitido y el router decide destino y parámetros. La prueba no elige a quién llega.
- Evidencia TRX fuera del repo: `E:/tmp/natillera2-fnd/gate35-natillera2.trx`. Todas las fallas comparten la misma causa (no existe `templates/`).

---

## Fase 4 — CEM: Concept-Expression Maps
status: complete (pendiente del OK del usuario para el commit)

Fuente única: `generator/natillera.py` (modo `cem`). Escribe dos salidas:
- `cem/expresiones.json`: las 19 fórmulas con nombre, que son LITERALES las que irán en los templates.
- `concepts[]` de cada contrato en la topología (clase, tipo del catálogo, bridge fuente si es DERIVED): 115 conceptos.

Ninguna expresión de jerarquía (gap del ledger): el total de la natillera va por deltas.

### Decisiones del usuario
- Centavos sobrantes al repartir → «El último en reportar (Recomendado)»: UNA participación absorbe el residuo y la cuenta cierra exacta (patrón split del open-payments-lab).
- Préstamos → «No, uno a la vez (Recomendado)». Lo valida la financiera al otorgar: el motor no ve los contratos entre sí. BRG-012 queda `many` acotado por la participación; un crédito PAGADO anterior lo rechaza por estado.

### Supuestos de la Fase 3, resueltos con el documento maestro (sin preguntar)
- E-16 «deuda con la financiera (hasta 0)»: se descuenta el saldo TOTAL del crédito en mora, con tope en lo que queda de la parte.
- E-11 «fin máximo al cierre de la natillera»: la FechaPago de una actividad va antes de la FechaFinal. Lo valida el bot al crear, junto con E-06 (rangos de fechas y de cuota): son validaciones de borde.
- E-16 «el mayor entre estimado y real ÷ participantes, menos deudas» equivale a nuestras dos rondas: parte = saldo real ÷ n, menos deudas, más un sobrante igual para todos. Verificado con el ejemplo: 200.000 · 200.000 · 100.000 por los dos caminos. La mora cobrada (V-06) se reparte, por decisión del usuario («todo se reparte»).

### Reglas del motor descubiertas al mapear (ajustes C1–C6 a las máquinas, todos con prueba)
- C1 · **La cadena de un template no puede volver a empezar** (ValidadorDeFlujo: trigger → evento → llamada → respuesta/fallo → trigger). Los reintentos que dibujamos en la Fase 2 (DesembolsoFallido, PagoLiquidacionFallido y ReembolsoFallido volvían a pedir el pago) se rechazarían al guardar. Ahora el fallo avisa y marca una bandera, y el reintento es un trigger programado aparte: ReintentarDesembolso, ReintentarPagoLiquidacion y ReintentarReembolso.
- C2 · **Toda llamada declara su trigger de fallo, y ese trigger solo recibe el motivo** (ConsultaEntregador.EntregarFalloAsync). Faltaban tres:
  - CobroDeudaFallido en MORA;
  - CobroFallido en ALERTA;
  - el pago del premio. Vive ahora en la natillera: RegistrarSalidaPremio reserva el dinero en PremiosEnTransito, PagoPremioConfirmado lo libera, PagoPremioFallido avisa al administrador y ReintentarPagoPremio reintenta.
- C3 · **Las fechas solo se comparan con > y <**: GreaterThanOrEqual y LessThanOrEqual usan AsDecimal, que lanza con fechas. **DaysBetween recibe nombres de concepto.** Por eso:
  - los plazos se guardan como fechas: FechaLimiteCupo y FechaProximoCobro;
  - el "hoy" se guarda en FechaActual antes de contar días;
  - Iniciar ahora también espera FechaInicio (es diario);
  - el castigo de una obligación no corre antes de su FechaPago;
  - el vencimiento del crédito es «FechaActual > FechaProximoVencimiento AND CuotaPendiente > 0».
- C4 · Con PagosParaPrestamo = 1, el aviso de préstamo nunca salía: la primera cuota es VALIDADA → ACTIVA y el aviso solo estaba en ACTIVA → ACTIVA. Ahora sale también con la primera cuota y al salir de mora, una sola vez (bandera AvisoPrestamoEnviado).
- C5 · Nunca se ordena un premio de 0: RegistrarSalidaPremio exige MontoPremio > 0, y el premio parcial exige algo recaudado.
- C6 · Las condiciones de BRG-012 y BRG-013 se compilan sobre las fórmulas reales: MontoDescuentoPrestamo > 0 y DescuentoActividades > 0.

### Modelo de dinero que fija el CEM
- Natillera (cuenta). La cuenta suma cuotas, deudas pagadas con su mora e ingresos de actividades. Resta premios (reservados hasta que el riel confirma), descuentos de préstamo, pagos de liquidación y reembolsos. Cierra solo con la cuenta en 0.
- Participación:
  - TotalAportado es TODO lo que la persona metió: cuotas, deuda y mora. Es lo que se le reembolsa si no hay cupo; así la cuenta queda en 0 aunque haya pagado mora.
  - Descuentos en la liquidación, en el orden de E-16: actividades, luego cuotas + mora, luego préstamo. Cada uno con tope en lo que queda.
- Crédito. Cuota francesa al centavo. Interés de los días transcurridos (no de las llamadas: si el scheduler falla un día, no se pierde interés). Los pagos van primero a interés.
- Mora y castigo: porcentaje diario × días transcurridos, al centavo.
- Repartos: al centavo HACIA ABAJO, para que lo repartido nunca supere lo que hay.

### Gate 4.5 — TDD expresiones
status: complete (verde)
- `Natillera2ExpressionTests.cs` en API.Tests, no en Domain.Tests: así la evidencia del ecosistema es UN TRX con el filtro de la topología, como Pagui. Lee `cem/expresiones.json`, parsea cada fórmula con el ExpressionParser real y la evalúa sobre un estado armado a mano. El esperado está calculado A MANO en el comentario de cada fila. Una prueba de cobertura exige que toda fórmula del CEM tenga prueba.
- Las suites del Gate 2.5 se actualizaron por C1–C5 con sus gemelos negativos.
- Evidencia: `E:/tmp/natillera2-fnd/gate45-natillera2.trx`, escrita por `test-evidence`. Las fórmulas pasan; estados, puentes y cascadas siguen RED hasta la Fase 5.

---

## Fase 5 — TGP: Template Generation
status: complete (pendiente del OK del usuario para el commit)

`python generator/natillera.py tgp` genera `templates/`: 5 productos y 26 reglas declarativas (`integracion-natillera-*`, una por bridge, sin firmantes ni contratos de integración). También genera `apis/open-payments.api.json`, la API del tenant que usan las llamadas: operaciones cobrar, pagar y desembolsar, con mock. Las rutas están en `implementation.templates_generated` y en `template_path` de cada contrato.

templates_generated: 31 (ver ecosystem-topology.json → implementation.templates_generated)
validation_outputs: |
  FndValidator validate-template → OK en los 31 (parser real + FND010–FND015 de las reglas).
  dotnet test --filter "FullyQualifiedName~Natillera2" → evidencia escrita por test-evidence (E:/tmp/natillera2-fnd/tgp4-natillera2.trx).

### Lo que el motor real enseñó al compilar (reglas nuevas, con prueba)
- La función de creación debe COPIAR cada parámetro a su concepto (paso Crear, como Pagui). El motor no asigna solos los conceptos `initialization: Parameter`. Las guardas de la creación leen parámetros, no conceptos. Sin esto, todo nacía en 0.
- C7 · **El motor corre TODAS las funciones de un trigger, en el orden del template, cada una sobre el estado que dejó la anterior.** Una rama que cambia el estado despertaba a la siguiente: la tercera cuota activaba la natillera y luego se sumaba otra vez como aporte de ACTIVA; la primera cuota cobrada corría también como cuota de ACTIVA. El generador fija el orden por trigger (`ORDEN`), poniendo primero la rama que CIERRA o la que exige el estado de llegada de otra. Afecta a: RegistrarAporte, RegistrarParteCalculada, RegistrarPagoLiquidacion, RegistrarReembolso, CuotaCobrada, CuotaFallida, PagoRecibido, DescuentoLiquidacion, CobroFallido y RegistrarRecaudo.
- C8 · **`Subtract` nunca baja de 0 en Currency ni en Integer** (ConceptValue.Subtract: `Math.Max(0, …)`). Tres consecuencias:
  - (a) El conteo de cuotas restaba meses («marzo − noviembre» = 0): una natillera de noviembre a marzo contaba 12 meses. Ahora resta el mes absoluto (año·12 + mes). El Gate 4.5 suma dos casos que cruzan el año.
  - (b) «saldo − pago == 0» aceptaba un pago MAYOR que el saldo. El cierre exige ahora pago == saldo, y los pagos intermedios, pago <= saldo; hay prueba negativa del sobrepago.
  - (c) La deuda saldada de una actividad viajaba como delta negativo y llegaba como 0. Ahora viaja en positivo hacia un trigger propio, RestarDeudaActividades (BRG-020 cambia de destino), que además garantiza que la deuda nunca quede negativa.
- Reloj de negocio (B-67): un contrato no ejecuta con una fecha anterior a la última que procesó. Las pruebas avanzan el reloj del escenario cuando el router entrega un evento, y la cascada de actividades sigue el calendario real (vence en noviembre, antes de la cuota de diciembre).

### Decisiones de interfaz (regla anti-gaming: qué cambió, por qué, quién)
- CuotaFallida, CobroDeudaFallido, PagoLiquidacionFallido, ReembolsoFallido, DesembolsoFallido, CobroFallido y PagoPremioFallido declaran SOLO `Motivo`: es lo único que el riel les entrega. El helper `Fallo()` de las pruebas dejó de mandar `Periodo` (Claude, Fase 4–5, por ConsultaEntregador).
- RegistrarSalidaPremio y ReintentarPagoPremio exigen ganador y billetera: la llamada «pago-premio» los necesita. Las pruebas usan `SalidaPremio()` (Claude, C2).
- BRG-020 apunta a RestarDeudaActividades con `MontoSaldado` en vez de a ActualizarDeudaActividades con un delta negativo (Claude, C8).
- CreditoAlDia y CreditoPagado llevan `deudaPrestamoEnMora: 0` en el payload: la regla no fabrica constantes (FND014) (Claude, Fase 5).
- Ninguna prueba se debilitó para pasar; las tres correcciones de C8 agregaron pruebas.

### Visibilidad de triggers
- Públicos (los dispara una persona o el backend del tenant): ConfirmarAutorizacion, RechazarAutorizacion, PagarDeuda, AutorizarPago, IndicarGanador, CerrarSinPremioOSinGanador, PagoRecibido y ReintentarPagoPremio.
- `private`: los programados (cron diario 06:00, hora del tenant) y los destinos de puentes.
- `system`: las respuestas de llamadas (confirmaciones y fallos de pago). Nadie puede fabricar por API un «pago confirmado».

---

## Fase 6 — DQS-F: Quality Score
status: complete — el score lo escribe `FndValidator score` en `dqs-f-report.json` y en `dqs_f{}` de la topología (fresco: `verify-freshness` OK)

score_output: |
  Ver dqs-f-report.json (no se copian números a mano). Dimensiones mvp y full sin hallazgos; TDD desde tdd.last_run.

### Issues del validador
Ninguno. El último aviso, DQS007 (ciclo sin fsv_proof), se cerró con la prueba Lean: ver Fase 6.5 / gate FSV.
`lint-session` OK sin advertencias (ecosystem-spec.md escrito).

---

## Fase 6.5 — Auditoría Adversarial
status: complete

checklist:
  - [x] ¿Qué reclamo del MVP scope es falso o inflado? (ataque a Completeness)
  - [x] ¿Qué bridge condicional NO tiene su condición compilada en el emisor? (ataque a condition_impl)
  - [x] ¿Qué evento marcado terminal:true en realidad necesita subscriber? (ataque a la whitelist)
  - [x] ¿Qué guard le falta a una transición para impedir un estado inválido? (→ test negativo RED)
  - [x] ¿Qué pasa con dinero en tránsito si un contrato llega a estado terminal? (conservación)
  - [x] ¿Qué assertion débil (not-null, >0) debe volverse de valor exacto?
  - [x] (con mapa IMD) ¿Qué contrato o bridge del MVP no sirve a ningún impacto `ahora` del mapa? (sobre-ingeniería — integridad referencial invertida)
  - [x] (con mapa IMD) ¿Qué diseño satisface la métrica de la meta degenerada sin lograr el impacto?
hallazgos_y_remediacion: |
  1. MVP inflado / IMD inverso. Natillera, participación y actividades sirven a impactos «ahora»: IMP-003 (débito
     automático y ver el aporte), IMP-007 (un sistema que cobra, registra y reparte) e IMP-012 (cuenta del grupo con
     aportes en cuotas y actividades, y su mora). El CRÉDITO (CONT-003 y BRG-012/023/024/025) solo sirve a impactos
     «ahora_no» (IMP-010/011). Se mantiene por decisión del equipo («Los 5»: este es el producto sobre el motor, no
     solo la hackathon). En la demo se muestra como extra. Sin remediación de código.
  2. condition_impl. BRG-012 y BRG-013 están compilados en el EmitirEvento de las dos funciones de CalcularParte;
     verificados en el template y por los tests _DoesNotFire_. ElegibleParaPrestamo es condicional pero terminal
     (aviso): no es bridge. Sin hallazgo.
  3. Terminales que necesitarían subscriber. Ninguno lleva dinero sin dueño: los avisos van al bot, y las llamadas
     tienen respuesta y fallo. ObligacionDescontada queda terminal a propósito: su dinero ya está en el pozo y la
     actividad «se cierra como está».
  4. Guardas faltantes (con prueba negativa):
     (a) SOBREPAGO del crédito. Con C8 el exceso se perdía en silencio. Ahora el pago se acepta (el riel ya movió el
         dinero), lo de más queda en SaldoAFavor y viaja en CreditoPagado para que la financiera lo devuelva.
     (b) Pago o reembolso final mayor que el saldo. Lo cubre C8: cierre exacto pago == saldo, y los pagos intermedios
         pago <= saldo.
  5. Dinero en tránsito. La respuesta de un cobro que llega cuando la participación ya está EN_REEMBOLSO se RECHAZA
     sin alterar lo que se devuelve; hay una prueba que fija ese comportamiento. Si ocurriera, ese dinero quedaría en
     la cuenta sin dueño en el motor. RIESGO ACEPTADO: el integrador entrega respuesta o fallo en segundos
     (reintentos 2/10/60 s y fallo garantizado) y el reembolso ocurre a los 5 días o más del primer cobro.
     Mitigación de operación: alertar sobre respuestas de llamada rechazadas. Para un ecosistema money-ready: la
     natillera repite ReembolsoIniciado a diario mientras REEMBOLSANDO, y Reembolsar espera si hay un cobro en vuelo
     (diseño anotado, no implementado). Lo mismo aplica a un premio cuyo pago falla: queda en PremiosEnTransito
     hasta que el administrador lo reintenta.
  6. Aserciones débiles → exactas, calculadas a mano: castigo de 2 días = 400 (BRG-019); deuda reportada = 200.000
     (BRG-023); saldo del préstamo al 20/12 = 51.600 y parte neta = 48.400 (cascada del préstamo, la misma fila del
     Gate 4.5).
  7. Meta degenerada (IMD: «el jurado lleva la propuesta a la final y la premia»). El diseño que satisface el número
     sin el impacto es una demo con la API en modo mock: se ve real y no mueve dinero. Mitigación: la API del tenant
     en modo real contra el testnet de Interledger (ENT-005, prueba temprana del viernes). Lo dice ecosystem-spec.md.
  8. Demo y tiempo (ENT-002, «periodicidad acelerada»). Los programados son privados y por día. Para la demo se
     disparan con la fecha deseada por la vía interna o con elevación de administrador; no hace falta cambiar los
     templates.

### Gate FSV (ciclo de contratos)
`fsv/FSV/Ecosystems/Natillera2/Topology.lean`, generado por `fsv/generate-topologies.js` (se agregó la sesión y el
filtro `FSV_SOLO` para no reescribir las pruebas de los demás) y verificado con `lake build` sin `sorry`. Prueba que
el grafo de EVENTOS es acíclico (`event_graph_acyclic`), que toda cascada termina en 4 saltos o menos
(`event_chain_length`) y el cableado completo; las claims NT-1..3 están en `fsv/claims-map.json`. Registrado como
`fsv_proof` en `topology.allowed_cycles`.

---

## Checklist de Promoción
- [x] Todos los templates pasan `FndValidator validate-template` (Fase 5: OK en los 31)
- [x] `FndValidator score` fresco (`verify-freshness` OK) — score dual en dqs-f-report.json
- [x] Tests del ecosistema verdes vía `test-evidence --trx` (tdd.last_run escrito por la herramienta)
- [x] Ciclos en allowed_cycles con fsv_proof (gate FSV): `fsv/FSV/Ecosystems/Natillera2/Topology.lean`, lake build sin sorry
- [x] `FndValidator promote-check` OK: `generator/natillera.py promover` deja `dotnet-backend/product-templates/natillera/` byte a byte igual a `templates/`; `Natillera2InstalacionTests` falla si deriva
- [x] promotion-record.json escrito por `promote-check --write` (punteros + sha256)
- [x] Ficha de vitrina: `marketplace.json` (la vitrina solo ofrece ecosistemas promovidos; la instalación la hace el operador desde la Torre)
- [ ] Merge a develop (PR, con autorización explícita del usuario) y despliegue al ambiente donde vive el tenant
- [x] Instalación probada en un tenant LOCAL (`natillera-demo`) con ciclo completo en verde — ver «Carga local en un tenant»
- [ ] Tenant de verdad: API `open-payments` en modo real (URL del BFF + credencial) y destino `bot-natillera`

Verificación del catálogo compartido tras la promoción: pruebas de Marketplace, EcosystemInstall y CascadeRouting del
motor, y las de Marketplace del Control Plane, en verde (los nombres `natillera-*` no chocan con el catálogo).

---

## Carga local en un tenant (2026-10-15, decisión del usuario: «Probar la carga en local primero»)
Montaje local documentado (control-tower/README.md), todo desde esta rama: Control Plane API :5210 (perfil http) y
motor multi-tenant :5110 (perfil «http (multi-tenant)»), sobre el Postgres y el Redpanda locales de docker. Nada sale
de la máquina.
- Tenant `natillera-demo` aprovisionado por la Control Plane API (POST /api/tenants): base `mt_natillera_demo_eea83979`,
  esquema, kit de verificación y topic `processing-engine.natillera-demo.events`. Se puede desaprovisionar.
- La vitrina local muestra «Natillera 2.0»: promovido, válido, 5 contratos, 26 reglas, 31 templates, sin faltantes.
  La topología pasó a `status: promoted` (la tienda solo instala ecosistemas promovidos).
- Instalación por la misma vía que la Torre (POST /api/tenants/natillera-demo/ecosystems/FND-20261015-natillera-2/install):
  los 31 templates en el tenant y la API `open-payments` en modo Mock, sin credencial.
- Ciclo completo por la API real del motor (Redpanda + DynamicEventRouter + integrador), con el script de humo
  `smoke_tenant.py` del scratchpad. Los programados se forzaron con la fecha del escenario (elevación de admin del canal
  control plane): 3 validados → Iniciar (1 nov) → la natillera queda ACTIVA con $300.000 → AbrirPeriodo (1 dic):
  $600.000 → IniciarLiquidacion (20 dic): dos rondas, pagos por el riel y la natillera CERRADA en $0; cada
  participación LIQUIDADA con $200.000. Log del motor sin `fail`/`crit`.
- Lo que la carga real enseñó (no aparece en las pruebas en memoria, que no avisan):
  - Mock que repite el monto. Con montos fijos, un pago de liquidación no confirmaría la parte exacta. El mock usa
    `{{monto}}` dentro de un cuerpo de TEXTO con JSON (RespondedorMock), así el número vuelve como número. El cobro de
    cuota es su propia operación (`cobrar-cuota`, con periodo): un cobro sin periodo dejaría el JSON inválido.
  - C9 · `Divide` SIEMPRE devuelve Decimal, aunque divida dinero; `Multiply` conserva Currency si el operando
    izquierdo es dinero. La parte y el sobrante viajaban como Decimal, y el motor avisaba «parámetros que no cuadran»
    en CalcularParte, RegistrarParteCalculada y AplicarSobrante. Ahora `Trunc2` termina en `$0,01 × …` y el interés del
    crédito en `$1 × …`. El Gate 4.5 suma `FormulasDeDinero_DevuelvenCurrency`. Tras actualizar el ecosistema en el
    tenant (flujo update de la Torre), el ciclo repetido ya no deja avisos.
- Para el tenant de verdad falta:
  - la URL del BFF de Open Payments y su credencial en la API `open-payments`, en modo real contra el testnet;
  - el destino `bot-natillera` de los avisos;
  - el merge a develop y el despliegue.

---

## Session Notes

### phase_log
- 2026-10-15 13:02 — Sesión creada en el worktree `.claude/worktrees/fnd-natillera-2` (rama `feature/fnd-natillera-2` desde origin/develop cc3d8e8b).
- 2026-10-15 — TDD activado («Sí, TDD (Recomendado)»).
- 2026-10-15 — AVL Q1: lienzo de 3 actores confirmado («Sí, es correcto»).
- 2026-10-15 — AVL Q2: «No gana por custodiar». AVL Q3: «la financiera queda en ceros todo se reparte». Fase 0 completa (3/5 preguntas).
- 2026-10-15 — CLIF: 5 contratos puntuados (94, 100, 74, 66, 54); alcance MVP «Los 5 (Recomendado)». Fase 1 completa.
- 2026-10-15 13:02 — Hallazgo de grounding: la «cuenta en árbol» del documento NO puede usar expresiones de jerarquía (`ChildrenSum`, `ParentConcept`…): `docs/motor-gap-ledger.md` las declara sin contexto que las alimente (evalúan 0 en silencio) y prohibidas en templates. Se usará agregación por deltas (`Acumular`/`Liquidar` desde bridges), como pagui-linea-rotativa.
- 2026-10-15 — CSM: las cinco máquinas aprobadas; REEMBOLSANDO y EN_REEMBOLSO agregadas («Sí, agregar ambos»). Fase 2 completa.
- 2026-10-15 — Gate 2.5: cinco suites de transiciones + base escopada a `templates/`; siete defectos de máquina (H1–H7) hallados por las pruebas negativas y corregidos en la topología; corrida RED registrada con `FndValidator test-evidence`. Lint OK (solo LNT002: faltan ecosystem-spec.md y templates/, esperado antes de la Fase 5).
- 2026-10-15 — Commit 02d42607 (Fases 0–2 + Gate 2.5) con OK del usuario («Sí, commit y Fase 3»).
- 2026-10-15 — EBT: rifa abierta al liquidar → «Se cierra como está (Recomendado)». 26 bridges declarativos, ajustes E1–E7, ciclo de contratos justificado (FSV pendiente). Gate 3.5: bridges + cascadas en RED, evidencia registrada. Score dry-run: base 100 en las cinco dimensiones; TDD 0 % (RED).
- 2026-10-15 — Commit 44bc3b0f (Fase 3 + Gate 3.5) con «Aprobado, commit y Fase 4».
- 2026-10-15 — CEM: «El último en reportar» (centavos) y «No, uno a la vez» (préstamos). Reglas del motor halladas → C1–C6. Gate 4.5 verde en las fórmulas; el resto RED hasta la Fase 5. Score dry-run: base 100, TDD parcial.
- 2026-10-15 — Commit e86180e8 (Fase 4) con «Sí, commit y Fase 5». TGP: 31 templates, validate-template OK en los 31; el motor real enseñó C7 (orden de funciones) y C8 (Subtract no baja de 0); suite Natillera2 en verde (evidencia por test-evidence). Score dry-run 100 Production-ready; pendientes: ecosystem-spec.md y fsv_proof del ciclo (bloquea promoción).
- 2026-10-15 — Commit 79237830 (Fase 5) con «Sí, commit y Fase 6». Auditoría 6.5: 8 hallazgos (saldo a favor del crédito, aserciones exactas, riesgo de cobro tardío aceptado y fijado con prueba, crédito «ahora_no» por decisión). Gate FSV: prueba Lean verificada. ecosystem-spec.md escrito. DQS-F real escrito por FndValidator score (fresco).
- 2026-10-15 — Commit 8edf110b (Fases 6 y 6.5) con «Sí, commit y promoción». Promoción local: 31 templates en product-templates/natillera/ byte a byte, promotion-record.json, marketplace.json, Natillera2InstalacionTests; catálogo compartido verde. Pendiente: PR a develop y carga en el tenant (acciones hacia afuera, con OK del usuario).
- 2026-10-15 — Commit 115e8423 (promoción). Carga local «Probar la carga en local primero»: tenant natillera-demo aprovisionado e instalado; ciclo completo en verde en el motor real; mock que repite el monto y C9 (Divide → Decimal) corregidos con prueba; ecosistema actualizado en el tenant por el flujo update.

---

## Resume Instructions
last_question_asked: "CEM: ¿un participante puede tener dos préstamos vivos a la vez?"
last_answer_received: "No, uno a la vez (Recomendado)"
next_action: "Pedir OK para commitear la carga local (C9, mock que repite el monto); luego, con autorización explícita: push + PR a develop. Para el tenant de verdad: URL/credencial del BFF de Open Payments y destino de avisos."
context_for_resume: "TDD activado. Dinero = llamadas del template a la API Open Payments del tenant (respuesta → trigger / triggerFallo). Jerarquía prohibida (gap del ledger): agregación por deltas. Redondeo propuesto para CEM: la última parte absorbe el residuo (patrón split del open-payments-lab)."
