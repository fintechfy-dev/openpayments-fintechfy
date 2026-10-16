"""Generador del ecosistema Natillera 2.0 (FND-20261015-natillera-2).

Una sola fuente de verdad para la Fase 4 (CEM) y la Fase 5 (TGP):
  python natillera.py cem   → cem/expresiones.json (las fórmulas con nombre que prueba el Gate 4.5)
                              + concepts[] de cada contrato en ecosystem-topology.json
  python natillera.py tgp   → templates/*.json (5 productos + 26 reglas) + apis/open-payments.api.json

Las expresiones con nombre (FORMULAS) son EXACTAMENTE las que van dentro de los templates: el Gate 4.5 las parsea
con el ExpressionParser real y las compara con un oráculo calculado a mano.

Reglas del motor que este archivo respeta (descubiertas en la Fase 4, ver fnd-session.md):
  - Las fechas solo se comparan con GreaterThan / LessThan (GreaterThanOrEqual y LessThanOrEqual usan AsDecimal).
  - DaysBetween recibe NOMBRES de concepto: la fecha del día se guarda primero en FechaActual.
  - Un trigger de fallo de llamada solo recibe el motivo: lo que un reintento necesita vive en el contrato.
  - La cadena trigger → evento → llamada (respuesta o fallo) → trigger no puede volver a empezar: un fallo avisa,
    y el reintento es un trigger aparte.
"""
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SESION = os.path.dirname(AQUI)
ECOSISTEMA = "Natillera 2.0 (FND-20261015-natillera-2)"
VERSION = "1.0.0"
DESTINO_AVISOS = "bot-natillera"
API = "open-payments"


# ═══════════════════════════════ expresiones ═══════════════════════════════
def C(n): return {"type": "Concept", "concept": n}
def P(n): return {"type": "Parameter", "parameter": n}
def K(v, t): return {"type": "Constant", "value": v, "valueType": t}
def cur(v): return K(v, "currency")
def ent(v): return K(v, "integer")
def txt(v): return K(v, "text")
def dec(v): return K(v, "decimal")
def _b(t, l, r): return {"type": t, "left": l, "right": r}
def Add(l, r): return _b("Add", l, r)
def Sub(l, r): return _b("Subtract", l, r)
def Mul(l, r): return _b("Multiply", l, r)
def Div(l, r): return _b("Divide", l, r)
def Min(l, r): return _b("Min", l, r)
def Max(l, r): return _b("Max", l, r)
def Gt(l, r): return _b("GreaterThan", l, r)
def Gte(l, r): return _b("GreaterThanOrEqual", l, r)
def Lt(l, r): return _b("LessThan", l, r)
def Lte(l, r): return _b("LessThanOrEqual", l, r)
def Eq(l, r): return _b("Equals", l, r)
def TEq(l, r): return _b("TextEquals", l, r)
def Not(x): return {"type": "Not", "operand": x}
def If(c, t, f): return {"type": "Conditional", "condition": c, "trueValue": t, "falseValue": f}
def Floor(x): return {"type": "Floor", "operand": x}
def Round(x, d=2): return {"type": "Round", "operand": x, "decimals": d}
def Sum(*xs): return {"type": "Sum", "expressions": list(xs)}
def AddDays(dc, e): return {"type": "AddDays", "dateConcept": dc, "daysExpression": e}
def AddMonths(dc, e): return {"type": "AddMonths", "dateConcept": dc, "monthsExpression": e}
def DaysBetween(a, b): return {"type": "DaysBetween", "startDateConcept": a, "endDateConcept": b}
def Year(dc): return {"type": "Year", "dateConcept": dc}
def Month(dc): return {"type": "Month", "dateConcept": dc}
def Day(dc): return {"type": "Day", "dateConcept": dc}
def French(c, r, n): return {"type": "FrenchAmortization", "capitalConcept": c, "rateConcept": r, "termConcept": n}
def POrD(n, d, t): return {"type": "ParameterOrDefault", "parameter": n, "default": d, "valueType": t}


def And(*xs):
    out = xs[0]
    for x in xs[1:]:
        out = _b("And", out, x)
    return out


def Dinero(x):
    """C9: Divide SIEMPRE devuelve Decimal (ConceptValue.Divide); Multiply conserva Currency si el operando IZQUIERDO es
    dinero. Sin esto, una parte viajaba como Decimal y el trigger destino (Currency) avisaba «no cuadran»."""
    return Mul(cur(1), x)


def Trunc2(x):
    """Al centavo HACIA ABAJO: lo repartido nunca supera lo que hay (el residuo es siempre ≥ 0). Devuelve Currency."""
    return Mul(cur(0.01), Floor(Mul(x, dec(100))))


HOY = P("CurrentDate")
def FechaMayor(a, b): return Gt(a, b)                 # a > b (fechas)
def FechaMayorOIgual(a, b): return Not(Lt(a, b))      # a >= b (fechas)


# ═══════════════════════════════ fórmulas con nombre (CEM) ═══════════════════════════════
# Cada una se usa literal en su template y la prueba el Gate 4.5 (Natillera2ExpressionTests).
# C8: Subtract NUNCA baja de 0 en Integer/Currency (ConceptValue.Subtract: Math.Max(0, …)). «MesF − MesI» de nov a mar
# daría 0 en vez de −8: se resta el mes ABSOLUTO (año·12 + mes), que nunca deja un intermedio negativo.
MESES_ENTRE = Sub(Sub(Add(Mul(Year("FechaFinal"), ent(12)), Month("FechaFinal")),
                      Add(Mul(Year("FechaInicio"), ent(12)), Month("FechaInicio"))),
                  If(Lt(Day("FechaFinal"), Day("FechaInicio")), ent(1), ent(0)))
SALDO_TRAS_DESCUENTO_PRESTAMO = Sub(C("SaldoNatillera"), P("MontoDescuentoPrestamo"))
SOBRANTE_TOTAL = Sub(C("SaldoNatillera"), C("SumaPartesNetas"))
DESC_ACT = Min(C("DeudaActividades"), P("PartePorParticipante"))
DESC_CUOTAS = Min(Add(C("DeudaCuotas"), C("MoraAcumulada")), Sub(P("PartePorParticipante"), C("DescuentoActividades")))
DESC_PRESTAMO = Min(C("DeudaPrestamoEnMora"),
                    Sub(Sub(P("PartePorParticipante"), C("DescuentoActividades")), C("DescuentoCuotas")))
SOBRANTE_ASIGNADO = Add(P("SobrantePorParticipante"),
                        If(TEq(C("ParticipacionId"), P("ParticipacionResiduo")), P("Residuo"), cur(0)))

FORMULAS = {
    # natillera-cuenta
    "natillera.NumeroCuotas": Add(Floor(Div(MESES_ENTRE, C("PeriodicidadMeses"))), ent(1)),
    "natillera.FechaLimiteCupo": AddDays("FechaInicio", C("DiasEsperaCupo")),
    "natillera.FechaProximoCobro": AddMonths("FechaInicio", Mul(C("PeriodoActual"), C("PeriodicidadMeses"))),
    "natillera.PartePorParticipante": Trunc2(Div(C("SaldoNatillera"), C("ParticipantesValidados"))),
    "natillera.SobranteTotal": SOBRANTE_TOTAL,
    "natillera.SobrantePorParticipante": Trunc2(Div(C("SobranteTotal"), C("ParticipantesValidados"))),
    "natillera.Residuo": Sub(C("SobranteTotal"), Mul(C("SobrantePorParticipante"), C("ParticipantesValidados"))),
    # natillera-participacion
    "participacion.MoraDelDia": Round(Mul(Mul(C("DeudaCuotas"), C("PorcentajeMoraDiaria")), C("DiasDeMora"))),
    "participacion.DescuentoActividades": DESC_ACT,
    "participacion.DescuentoCuotas": DESC_CUOTAS,
    "participacion.MontoDescuentoPrestamo": DESC_PRESTAMO,
    "participacion.ParteNeta": Sub(Sub(Sub(P("PartePorParticipante"), C("DescuentoActividades")), C("DescuentoCuotas")),
                                   C("MontoDescuentoPrestamo")),
    "participacion.SobranteAsignado": SOBRANTE_ASIGNADO,
    "participacion.MontoMaximoPrestamo": Mul(C("ValorCuota"), C("MultiploPrestamo")),
    # natillera-credito-ahorro
    "credito.CuotaMensual": Round(French("Capital", "TasaMensual", "PlazoMeses")),
    "credito.InteresDelPeriodo": Dinero(Round(Mul(Div(Mul(C("SaldoCapital"), C("TasaMensual")), dec(30)), C("DiasCausados")))),
    "credito.AbonoInteres": Min(P("MontoPago"), C("InteresCausado")),
    # natillera-obligacion-actividad
    "obligacion.CastigoDelDia": Round(Mul(Mul(C("ValorObligacion"), C("CastigoMoraDiario")), C("DiasDeCastigo"))),
    # natillera-actividad
    "actividad.RestoPremio": Min(P("MontoRecaudo"), Sub(C("Premio"), C("PremioPagado"))),
}


# ═══════════════════════════════ pasos y piezas de template ═══════════════════════════════
def Liq(c, e): return {"type": "Liquidar", "concept": c, "expression": e}
def Acu(c, e): return {"type": "Acumular", "concept": c, "expression": e}
def Inc(c, n=1): return {"type": "Incrementar", "concept": c, "expression": ent(n)}
def Estado(maq, idx): return Liq(maq, ent(idx))
def Si(cond, then, otro=None):
    s = {"type": "Condicional", "condition": cond, "then": then}
    if otro is not None:
        s["else"] = otro
    return s


def Emit(ev, payload, cond=None):
    s = {"type": "EmitirEvento", "eventType": ev, "payload": dict({"currentDate": HOY}, **payload)}
    if cond is not None:
        s["condition"] = cond
    return s


def Cd(name, dt, desc, init="Zero", cat="Custom"):
    return {"name": name, "dataType": dt, "description": desc, "category": cat, "initialization": init}


def In(name, dt, desc, cat="Custom"):
    return Cd(name, dt, desc, "Parameter", cat)


def Par(name, dt, req=True):
    return {"name": name, "dataType": dt, "isRequired": req}


def Tr(name, tipo, params=(), vis=None, cron=None):
    t = {"name": name, "type": tipo}
    if vis:
        t["visibility"] = vis
    if cron:
        t["schedule"] = {"cron": cron}
    if params:
        t["parameters"] = list(params)
    return t


def Fn(name, trigger, desc, steps, estados=None, pre=None):
    f = {"name": name, "description": desc, "trigger": trigger}
    if estados:
        f["requiredStates"] = estados
    if pre:
        f["preconditions"] = pre if isinstance(pre, list) else [pre]
    f["steps"] = steps
    return f


def Llamada(id_, nombre, evento, operacion, cuerpo, variables, trig, fallo):
    return {"id": id_, "nombre": nombre, "evento": evento, "api": {"id": API, "operacion": operacion},
            "peticion": {"cuerpo": {k: ({"payload": v} if not v.startswith("=") else {"constante": v[1:]})
                                    for k, v in cuerpo.items()}},
            "extraccion": {"version": 1, "variables": [{"nombre": n, "tipo": t, "ruta": r} for n, t, r in variables]},
            "respuesta": {"trigger": trig, "triggerFallo": fallo, "parametroMotivo": "Motivo"}}


def Aviso(evento): return {"evento": evento, "destino": DESTINO_AVISOS}


MOTIVO = Par("Motivo", "Text")
DIARIO = "0 6 * * *"   # 06:00 hora del tenant (America/Bogota)


def maquina(concepto, estados, transiciones):
    return {concepto: {"concept": concepto, "states": {s: i for i, s in enumerate(estados)}, "initialState": estados[0],
                       "transitions": [{"from": f, "to": t, "label": l} for f, t, l in transiciones]}}


# ═══════════════════════════════ CONT-001 natillera-cuenta ═══════════════════════════════
def natillera_cuenta():
    M = "EstadoNatillera"
    E = ["CREADA", "INICIADA", "ACTIVA", "LIQUIDANDO", "REEMBOLSANDO", "CERRADA", "CERRADA_SIN_CUPO"]
    ix = {s: i for i, s in enumerate(E)}
    nat = {"natilleraId": C("NatilleraId")}
    pend = lambda *s: {M: list(s)}
    conceptos = [
        In("NatilleraId", "Text", "Llave de negocio de la natillera (inmutable): la usan todas las reglas que le hablan"),
        In("NombreNatillera", "Text", "Nombre único que ve el grupo (E-06)"),
        In("ValorCuota", "Currency", "Cuota de cada periodo (E-06; mínimos y máximos del sistema los valida el bot)", "Payment"),
        In("FechaInicio", "Date", "Primer cobro (E-06: máximo a un mes; lo valida el bot)", "Time"),
        In("FechaFinal", "Date", "Liquidación (E-06: máximo a un año; lo valida el bot)", "Time"),
        In("PeriodicidadMeses", "Integer", "Meses entre cobros (1 = mensual)", "Time"),
        In("CupoMinimo", "Integer", "Participantes que deben pagar la primera cuota para que arranque (N, V-01)"),
        In("PorcentajeMoraDiaria", "Percentage", "Mora diaria sobre la deuda de cuotas (E-06)", "Rate"),
        In("DiasEsperaCupo", "Integer", "Días que se espera el cupo después del primer cobro (X, V-01)", "Time"),
        In("PagosParaPrestamo", "Integer", "Pagos previos para habilitar el préstamo (Y, V-01)"),
        In("MultiploPrestamo", "Integer", "Tope del préstamo en cuotas (N × cuota, E-15)"),
        Cd("Moneda", "Text", "Moneda digital de la natillera (E-06); por omisión COP, la del testnet de Open Payments", "Explicit"),
        Cd("NumeroCuotas", "Integer", "Cuotas entre FechaInicio y FechaFinal según la periodicidad (BDD: rango + periodicidad)", "Explicit", "Calculated"),
        Cd(M, "Integer", "Máquina de la natillera: " + " · ".join(f"{i}={s}" for i, s in enumerate(E)), "Zero", "Status"),
        Cd("ParticipantesValidados", "Integer", "Participaciones con billetera autorizada (BRG-001)"),
        Cd("PagosPrimeraCuota", "Integer", "Primeras cuotas pagadas mientras la natillera está INICIADA (cupo)"),
        Cd("PeriodoActual", "Integer", "Último periodo de cobro abierto (1 al iniciar)"),
        Cd("FechaProximoCobro", "Date", "Fecha del siguiente periodo de cobro", "Explicit", "Time"),
        Cd("FechaLimiteCupo", "Date", "FechaInicio + DiasEsperaCupo: pasada esta fecha sin cupo, se reembolsa", "Explicit", "Time"),
        Cd("SaldoNatillera", "Currency", "Dinero del grupo en la cuenta de la natillera (custodia de la financiera)", "Zero", "Capital"),
        Cd("PremiosEnTransito", "Currency", "Premios ordenados cuyo pago aún no confirma el riel", "Zero", "Payment"),
        Cd("PartePorParticipante", "Currency", "Ronda 1: saldo / validados, al centavo hacia abajo", "Zero", "Calculated"),
        Cd("PartesReportadas", "Integer", "Participaciones que ya calcularon su parte"),
        Cd("SumaPartesNetas", "Currency", "Suma de las partes netas reportadas", "Zero", "Calculated"),
        Cd("UltimaParticipacionReportada", "Text", "Quien absorbe el residuo de centavos («El último en reportar»)", "Explicit"),
        Cd("SobranteTotal", "Currency", "Ronda 2: lo que quedó tras las partes netas (deudas descontadas a los morosos)", "Zero", "Calculated"),
        Cd("SobrantePorParticipante", "Currency", "Sobrante / validados, al centavo hacia abajo", "Zero", "Calculated"),
        Cd("Residuo", "Currency", "Centavos que no alcanzan para todos: van a UltimaParticipacionReportada", "Zero", "Calculated"),
        Cd("PagosLiquidacion", "Integer", "Pagos de liquidación confirmados"),
        Cd("ReembolsosConfirmados", "Integer", "Reembolsos confirmados (incluye los de 0 de quien nunca pagó)"),
        Cd("FechaCierre", "Date", "Fecha en que la cuenta quedó en 0", "Explicit", "Time"),
    ]
    triggers = [
        Tr("CrearNatillera", "creation"),
        Tr("RegistrarValidado", "external", [Par("ParticipacionId", "Text")], "private"),
        Tr("Iniciar", "scheduled", vis="private", cron=DIARIO),
        Tr("RegistrarAporte", "external", [Par("ParticipacionId", "Text"), Par("MontoAporte", "Currency")], "private"),
        Tr("RegistrarIngresoActividad", "external", [Par("ActividadId", "Text"), Par("MontoIngreso", "Currency")], "private"),
        Tr("VerificarCupo", "scheduled", vis="private", cron=DIARIO),
        Tr("AbrirPeriodo", "scheduled", vis="private", cron=DIARIO),
        Tr("RegistrarSalidaPremio", "external", [Par("ActividadId", "Text"), Par("MontoPremio", "Currency"),
                                                 Par("GanadorParticipacionId", "Text"), Par("WalletGanador", "Text")], "private"),
        Tr("PagoPremioConfirmado", "external", [Par("MontoPagado", "Currency")], "system"),
        Tr("PagoPremioFallido", "external", [MOTIVO], "system"),
        Tr("ReintentarPagoPremio", "external", [Par("ActividadId", "Text"), Par("MontoPremio", "Currency"),
                                                Par("GanadorParticipacionId", "Text"), Par("WalletGanador", "Text")]),
        Tr("IniciarLiquidacion", "scheduled", vis="private", cron=DIARIO),
        Tr("RegistrarParteCalculada", "external", [Par("ParticipacionId", "Text"), Par("ParteNeta", "Currency"),
                                                   Par("MontoDescuentoPrestamo", "Currency")], "private"),
        Tr("RegistrarPagoLiquidacion", "external", [Par("ParticipacionId", "Text"), Par("MontoPagado", "Currency")], "private"),
        Tr("RegistrarReembolso", "external", [Par("ParticipacionId", "Text"), Par("MontoReembolso", "Currency")], "private"),
    ]
    aporte = [Acu("SaldoNatillera", P("MontoAporte"))]
    salida = {"actividadId": P("ActividadId"), "ganadorParticipacionId": P("GanadorParticipacionId"),
              "walletGanador": P("WalletGanador"), "monto": P("MontoPremio")}
    parte_comun = [Inc("PartesReportadas"), Acu("SumaPartesNetas", P("ParteNeta")),
                   Liq("SaldoNatillera", SALDO_TRAS_DESCUENTO_PRESTAMO),
                   Liq("UltimaParticipacionReportada", P("ParticipacionId"))]
    funciones = [
        Fn("CrearNatillera", "CrearNatillera", "Nace CREADA con sus reglas; calcula cuántas cuotas caben en el rango.", [
            Liq("Moneda", POrD("Moneda", "COP", "text")),
            Liq("NumeroCuotas", FORMULAS["natillera.NumeroCuotas"]),
            Emit("NatilleraCreada", dict(nat, cuota=C("ValorCuota"), numeroCuotas=C("NumeroCuotas"), cupoMinimo=C("CupoMinimo"))),
        ], pre=[Gt(P("ValorCuota"), cur(0)), Gt(P("CupoMinimo"), ent(0)), FechaMayor(P("FechaFinal"), P("FechaInicio"))]),
        Fn("RegistrarValidado", "RegistrarValidado", "BRG-001: una participación autorizó su billetera.", [
            Inc("ParticipantesValidados"),
            Emit("ParticipanteValidadoRegistrado", dict(nat, participantesValidados=C("ParticipantesValidados"))),
        ], pend("CREADA")),
        Fn("Iniciar", "Iniciar", "Llega FechaInicio con el cupo de validados: abre el periodo 1 (BRG-002 pide la primera cuota).", [
            Estado(M, ix["INICIADA"]), Liq("PeriodoActual", ent(1)),
            Liq("FechaLimiteCupo", FORMULAS["natillera.FechaLimiteCupo"]),
            Liq("FechaProximoCobro", FORMULAS["natillera.FechaProximoCobro"]),
            Emit("NatilleraIniciada", dict(nat, periodo=C("PeriodoActual"), fechaPrimerCobro=C("FechaInicio"))),
        ], pend("CREADA"), [Gte(C("ParticipantesValidados"), C("CupoMinimo")), FechaMayorOIgual(HOY, C("FechaInicio"))]),
        Fn("RegistrarAporteSinCupo", "RegistrarAporte", "Primera cuota pagada; el cupo aún no se completa.", aporte + [
            Inc("PagosPrimeraCuota"),
            Emit("AporteRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoAporte"), saldoNatillera=C("SaldoNatillera"))),
        ], pend("INICIADA"), Lt(Add(C("PagosPrimeraCuota"), ent(1)), C("CupoMinimo"))),
        Fn("RegistrarAporteCompletaCupo", "RegistrarAporte", "La primera cuota que completa el cupo: la natillera queda ACTIVA.", aporte + [
            Inc("PagosPrimeraCuota"), Estado(M, ix["ACTIVA"]),
            Emit("AporteRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoAporte"), saldoNatillera=C("SaldoNatillera"))),
            Emit("NatilleraActivada", nat),
        ], pend("INICIADA"), Gte(Add(C("PagosPrimeraCuota"), ent(1)), C("CupoMinimo"))),
        Fn("RegistrarAporte", "RegistrarAporte", "Cuota, deuda o mora pagada con la natillera ACTIVA.", aporte + [
            Emit("AporteRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoAporte"), saldoNatillera=C("SaldoNatillera"))),
        ], pend("ACTIVA"), Gt(P("MontoAporte"), cur(0))),
        Fn("RegistrarIngresoActividad", "RegistrarIngresoActividad", "BRG-017: dinero de una actividad; entra a la cuenta, NO cuenta para el cupo (E2).", [
            Acu("SaldoNatillera", P("MontoIngreso")),
            Emit("IngresoActividadRegistrado", dict(nat, actividadId=P("ActividadId"), monto=P("MontoIngreso"), saldoNatillera=C("SaldoNatillera"))),
        ], pend("INICIADA", "ACTIVA"), Gt(P("MontoIngreso"), cur(0))),
        Fn("VerificarCupo", "VerificarCupo", "Pasó la espera sin cupo: se devuelve todo (BRG-006).", [
            Estado(M, ix["REEMBOLSANDO"]), Emit("ReembolsoIniciado", nat),
        ], pend("INICIADA"), [FechaMayor(HOY, C("FechaLimiteCupo")), Lt(C("PagosPrimeraCuota"), C("CupoMinimo"))]),
        Fn("AbrirPeriodo", "AbrirPeriodo", "El calendario es de la natillera (E1): abre el siguiente periodo y BRG-003 pide la cuota.", [
            Inc("PeriodoActual"), Liq("FechaProximoCobro", FORMULAS["natillera.FechaProximoCobro"]),
            Emit("PeriodoAbierto", dict(nat, periodo=C("PeriodoActual"))),
        ], pend("ACTIVA"), [Lt(C("PeriodoActual"), C("NumeroCuotas")), FechaMayorOIgual(HOY, C("FechaProximoCobro"))]),
        Fn("RegistrarSalidaPremio", "RegistrarSalidaPremio", "BRG-021/022: el premio sale de la cuenta; la llamada «pago-premio» le paga al ganador.", [
            Liq("SaldoNatillera", Sub(C("SaldoNatillera"), P("MontoPremio"))), Acu("PremiosEnTransito", P("MontoPremio")),
            Emit("SalidaPremioRegistrada", dict(nat, saldoNatillera=C("SaldoNatillera"), **salida)),
        ], pend("ACTIVA"), [Gt(P("MontoPremio"), cur(0)), Lte(P("MontoPremio"), C("SaldoNatillera"))]),
        Fn("PagoPremioConfirmado", "PagoPremioConfirmado", "El riel confirmó el pago al ganador.", [
            Liq("PremiosEnTransito", Max(Sub(C("PremiosEnTransito"), P("MontoPagado")), cur(0))),
            Emit("PremioPagadoAlGanador", dict(nat, monto=P("MontoPagado"))),
        ], pend("ACTIVA")),
        Fn("PagoPremioFallido", "PagoPremioFallido", "El riel no pudo pagar: se avisa al administrador; el dinero queda en tránsito.", [
            Emit("PagoPremioFallo", dict(nat, motivo=P("Motivo"), premiosEnTransito=C("PremiosEnTransito"))),
        ], pend("ACTIVA")),
        Fn("ReintentarPagoPremio", "ReintentarPagoPremio", "El administrador reintenta un premio en tránsito.", [
            Emit("PagoPremioReintentado", dict(nat, **salida)),
        ], pend("ACTIVA"), [Gt(P("MontoPremio"), cur(0)), Lte(P("MontoPremio"), C("PremiosEnTransito"))]),
        Fn("IniciarLiquidacion", "IniciarLiquidacion", "Llega FechaFinal: ronda 1 (BRG-008) y cierre de actividades (BRG-026).", [
            Estado(M, ix["LIQUIDANDO"]), Liq("PartePorParticipante", FORMULAS["natillera.PartePorParticipante"]),
            Emit("LiquidacionIniciada", dict(nat, partePorParticipante=C("PartePorParticipante"))),
        ], pend("ACTIVA"), FechaMayorOIgual(HOY, C("FechaFinal"))),
        Fn("RegistrarParteCalculada", "RegistrarParteCalculada", "BRG-009: una parte más; el descuento del préstamo sale de la cuenta (E3).", parte_comun + [
            Emit("ParteCalculadaRegistrada", dict(nat, partesReportadas=C("PartesReportadas"))),
        ], pend("LIQUIDANDO"), Lt(Add(C("PartesReportadas"), ent(1)), C("ParticipantesValidados"))),
        Fn("RegistrarUltimaParte", "RegistrarParteCalculada", "La última parte: ronda 2, el sobrante para todos y el residuo para uno (BRG-010).", parte_comun + [
            Liq("SobranteTotal", FORMULAS["natillera.SobranteTotal"]),
            Liq("SobrantePorParticipante", FORMULAS["natillera.SobrantePorParticipante"]),
            Liq("Residuo", FORMULAS["natillera.Residuo"]),
            Emit("ParteCalculadaRegistrada", dict(nat, partesReportadas=C("PartesReportadas"))),
            Emit("SobranteCalculado", dict(nat, sobrantePorParticipante=C("SobrantePorParticipante"), residuo=C("Residuo"),
                                           participacionResiduo=C("UltimaParticipacionReportada"))),
        ], pend("LIQUIDANDO"), Eq(Add(C("PartesReportadas"), ent(1)), C("ParticipantesValidados"))),
        Fn("RegistrarPagoLiquidacion", "RegistrarPagoLiquidacion", "BRG-011: un pago de liquidación confirmado.", [
            Inc("PagosLiquidacion"), Liq("SaldoNatillera", Sub(C("SaldoNatillera"), P("MontoPagado"))),
            Emit("PagoLiquidacionRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoPagado"))),
        ], pend("LIQUIDANDO"), [Lt(Add(C("PagosLiquidacion"), ent(1)), C("ParticipantesValidados")),
                                Lte(P("MontoPagado"), C("SaldoNatillera"))]),
        Fn("CerrarNatillera", "RegistrarPagoLiquidacion", "El último pago deja la cuenta en 0: «la financiera queda en ceros».", [
            Inc("PagosLiquidacion"), Liq("SaldoNatillera", Sub(C("SaldoNatillera"), P("MontoPagado"))),
            Estado(M, ix["CERRADA"]), Liq("FechaCierre", HOY),
            Emit("PagoLiquidacionRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoPagado"))),
            Emit("NatilleraCerrada", dict(nat, fechaCierre=HOY)),
        ], pend("LIQUIDANDO"), [Eq(Add(C("PagosLiquidacion"), ent(1)), C("ParticipantesValidados")),
                                Eq(P("MontoPagado"), C("SaldoNatillera"))]),
        Fn("RegistrarReembolso", "RegistrarReembolso", "BRG-007: un reembolso confirmado (o uno de 0 de quien nunca pagó).", [
            Inc("ReembolsosConfirmados"), Liq("SaldoNatillera", Sub(C("SaldoNatillera"), P("MontoReembolso"))),
            Emit("ReembolsoRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoReembolso"), saldoNatillera=C("SaldoNatillera"))),
        ], pend("REEMBOLSANDO"), [Lt(Add(C("ReembolsosConfirmados"), ent(1)), C("ParticipantesValidados")),
                                  Lte(P("MontoReembolso"), C("SaldoNatillera"))]),
        Fn("CerrarSinCupo", "RegistrarReembolso", "El último reembolso deja la cuenta en 0.", [
            Inc("ReembolsosConfirmados"), Liq("SaldoNatillera", Sub(C("SaldoNatillera"), P("MontoReembolso"))),
            Estado(M, ix["CERRADA_SIN_CUPO"]), Liq("FechaCierre", HOY),
            Emit("ReembolsoRegistrado", dict(nat, participacionId=P("ParticipacionId"), monto=P("MontoReembolso"), saldoNatillera=C("SaldoNatillera"))),
            Emit("NatilleraCerradaSinCupo", dict(nat, fechaCierre=HOY)),
        ], pend("REEMBOLSANDO"), [Eq(Add(C("ReembolsosConfirmados"), ent(1)), C("ParticipantesValidados")),
                                  Eq(P("MontoReembolso"), C("SaldoNatillera"))]),
    ]
    sm = maquina(M, E, [
        ("CREADA", "INICIADA", "[Iniciar] FechaInicio con el cupo de validados"),
        ("INICIADA", "ACTIVA", "[RegistrarAporte] La primera cuota que completa el cupo"),
        ("INICIADA", "REEMBOLSANDO", "[VerificarCupo] Pasó la espera sin cupo"),
        ("ACTIVA", "LIQUIDANDO", "[IniciarLiquidacion] Llegó FechaFinal"),
        ("LIQUIDANDO", "CERRADA", "[RegistrarPagoLiquidacion] El último pago deja la cuenta en 0"),
        ("REEMBOLSANDO", "CERRADA_SIN_CUPO", "[RegistrarReembolso] El último reembolso deja la cuenta en 0"),
    ])
    llamadas = [
        Llamada("pago-premio", "Pago del premio al ganador", "SalidaPremioRegistrada", "pagar",
                {"walletDestino": "walletGanador", "monto": "monto", "referencia": "actividadId", "origen": "natilleraId"},
                [("MontoPagado", "currency", "monto")], "PagoPremioConfirmado", "PagoPremioFallido"),
        Llamada("reintento-pago-premio", "Reintento del pago del premio", "PagoPremioReintentado", "pagar",
                {"walletDestino": "walletGanador", "monto": "monto", "referencia": "actividadId", "origen": "natilleraId"},
                [("MontoPagado", "currency", "monto")], "PagoPremioConfirmado", "PagoPremioFallido"),
    ]
    avisos = [Aviso(e) for e in ("NatilleraActivada", "NatilleraCerradaSinCupo", "NatilleraCerrada",
                                 "PremioPagadoAlGanador", "PagoPremioFallo")]
    return {"name": "natillera-cuenta", "description": "CONT-001 · La cuenta colectiva de la natillera (custodia de la financiera). "
            "Cuenta validados, arranca por cupo, lleva el calendario de cobros, suma por deltas y liquida en dos rondas hasta quedar en 0. "
            + ECOSISTEMA, "version": VERSION, "conceptDefinitions": conceptos, "stateMachines": sm, "triggers": triggers,
            "functions": funciones, "llamadas": llamadas, "avisos": avisos}


# ═══════════════════════════════ CONT-002 natillera-participacion ═══════════════════════════════
def natillera_participacion():
    M = "EstadoParticipacion"
    E = ["PENDIENTE_VALIDACION", "VALIDADA", "ACTIVA", "MORA", "EN_LIQUIDACION", "EN_REEMBOLSO", "LIQUIDADA", "REEMBOLSADA"]
    ix = {s: i for i, s in enumerate(E)}
    st = lambda *s: {M: list(s)}
    ids = {"natilleraId": C("NatilleraId"), "participacionId": C("ParticipacionId")}
    conceptos = [
        In("ParticipacionId", "Text", "Llave de negocio de la participación (inmutable)"),
        In("NatilleraId", "Text", "La natillera a la que pertenece (llave de las difusiones)"),
        In("ParticipanteId", "Text", "La persona (Telegram)"),
        In("WalletParticipante", "Text", "Dirección de billetera Open Payments del participante"),
        In("ValorCuota", "Currency", "Cuota por periodo", "Payment"),
        In("NumeroCuotas", "Integer", "Cuotas de la natillera"),
        In("PorcentajeMoraDiaria", "Percentage", "Mora diaria sobre la deuda de cuotas", "Rate"),
        In("PagosParaPrestamo", "Integer", "Y pagos para habilitar el préstamo"),
        In("MultiploPrestamo", "Integer", "N × cuota de tope de préstamo"),
        In("FechaInicio", "Date", "Primer cobro de la natillera", "Time"),
        Cd(M, "Integer", "Máquina de la participación: " + " · ".join(f"{i}={s}" for i, s in enumerate(E)), "Zero", "Status"),
        Cd("GrantId", "Text", "Grant recurrente de Open Payments aprobado por el participante (el token lo guarda el tenant)", "Explicit"),
        Cd("FechaActual", "Date", "Fecha del último trigger (DaysBetween necesita conceptos)", "Explicit", "Time"),
        Cd("PeriodosSolicitados", "Integer", "Periodos cuyo cobro ya se pidió (H6)"),
        Cd("PeriodoEnCobro", "Integer", "Periodo del último cobro pedido"),
        Cd("CuotasPagadas", "Integer", "Cuotas pagadas (a tiempo o con deuda)"),
        Cd("CuotasAdeudadas", "Integer", "Cuotas que fallaron y siguen en deuda"),
        Cd("TotalAportado", "Currency", "Todo lo que este participante metió a la natillera (cuotas, deuda y mora): lo que se reembolsa", "Zero", "Payment"),
        Cd("DeudaCuotas", "Currency", "Cuotas falladas sin pagar", "Zero", "Payment"),
        Cd("MoraAcumulada", "Currency", "Mora diaria causada sobre DeudaCuotas", "Zero", "Interest"),
        Cd("FechaUltimaMora", "Date", "Hasta cuándo se causó la mora", "Explicit", "Time"),
        Cd("DiasDeMora", "Integer", "Días a causar en este trigger"),
        Cd("AvisoPrestamoEnviado", "Integer", "1 = ya se le avisó que puede pedir préstamo"),
        Cd("DeudaActividades", "Currency", "Obligaciones de actividades vencidas + castigo (BRG-018/019/020)", "Zero", "Payment"),
        Cd("DeudaPrestamoEnMora", "Currency", "Lo que la financiera reporta por descontar (BRG-023/024/025)", "Zero", "Payment"),
        Cd("DescuentoActividades", "Currency", "Ronda 1: descuento por actividades, tope en la parte", "Zero", "Calculated"),
        Cd("DescuentoCuotas", "Currency", "Ronda 1: descuento por cuotas + mora, tope en lo que queda", "Zero", "Calculated"),
        Cd("MontoDescuentoPrestamo", "Currency", "Ronda 1: descuento por préstamo en mora, tope en lo que queda (E-16)", "Zero", "Calculated"),
        Cd("ParteNeta", "Currency", "Ronda 1: parte igual menos descuentos", "Zero", "Calculated"),
        Cd("SobranteAsignado", "Currency", "Ronda 2: sobrante + residuo si esta participación lo absorbe", "Zero", "Calculated"),
        Cd("ParteFinal", "Currency", "Lo que el riel le paga en la liquidación", "Zero", "Calculated"),
        Cd("PagoFallidoPendiente", "Integer", "1 = el último pago (liquidación o reembolso) falló y espera reintento"),
    ]
    triggers = [
        Tr("CrearParticipacion", "creation"),
        Tr("ConfirmarAutorizacion", "external", [Par("PermisoAprobado", "Integer"), Par("BilleteraVerificada", "Integer"), Par("GrantId", "Text")]),
        Tr("RechazarAutorizacion", "external", [MOTIVO]),
        Tr("CobrarCuota", "external", [Par("Periodo", "Integer")], "private"),
        Tr("CuotaCobrada", "external", [Par("Periodo", "Integer"), Par("MontoCobrado", "Currency")], "system"),
        Tr("CuotaFallida", "external", [MOTIVO], "system"),
        Tr("CausarMoraDiaria", "scheduled", vis="private", cron=DIARIO),
        Tr("PagarDeuda", "external"),
        Tr("DeudaCobrada", "external", [Par("MontoCobrado", "Currency")], "system"),
        Tr("CobroDeudaFallido", "external", [MOTIVO], "system"),
        Tr("RegistrarActividad", "external", [Par("ActividadId", "Text"), Par("ValorActividad", "Currency"),
                                              Par("CastigoMoraDiario", "Percentage"), Par("FechaPago", "Date")], "private"),
        Tr("ActualizarDeudaActividades", "external", [Par("DeltaDeudaActividades", "Currency")], "private"),
        Tr("RestarDeudaActividades", "external", [Par("MontoSaldado", "Currency")], "private"),
        Tr("ActualizarDeudaPrestamo", "external", [Par("DeudaPrestamoEnMora", "Currency")], "private"),
        Tr("CalcularParte", "external", [Par("PartePorParticipante", "Currency")], "private"),
        Tr("AplicarSobrante", "external", [Par("SobrantePorParticipante", "Currency"), Par("Residuo", "Currency"),
                                           Par("ParticipacionResiduo", "Text", False)], "private"),
        Tr("PagoLiquidacionConfirmado", "external", [Par("MontoConfirmado", "Currency")], "system"),
        Tr("PagoLiquidacionFallido", "external", [MOTIVO], "system"),
        Tr("ReintentarPagoLiquidacion", "scheduled", vis="private", cron=DIARIO),
        Tr("Reembolsar", "external", vis="private"),
        Tr("ReembolsoConfirmado", "external", [Par("MontoConfirmado", "Currency")], "system"),
        Tr("ReembolsoFallido", "external", [MOTIVO], "system"),
        Tr("ReintentarReembolso", "scheduled", vis="private", cron=DIARIO),
    ]
    hoy = [Liq("FechaActual", HOY)]
    solicitar_cuota = [Inc("PeriodosSolicitados"), Liq("PeriodoEnCobro", P("Periodo")),
                       Emit("CobroCuotaSolicitado", {"participacionId": C("ParticipacionId"), "periodo": P("Periodo"),
                                                     "monto": C("ValorCuota"), "walletParticipante": C("WalletParticipante"),
                                                     "grantId": C("GrantId")})]
    cuota_cobrada = [Inc("CuotasPagadas"), Acu("TotalAportado", P("MontoCobrado")),
                     Emit("CuotaPagada", dict(ids, periodo=C("PeriodoEnCobro"), monto=P("MontoCobrado"),
                                              esPrimeraCuota=If(Eq(C("CuotasPagadas"), ent(1)), ent(1), ent(0))))]
    aviso_prestamo = [
        Emit("ElegibleParaPrestamo", {"participacionId": C("ParticipacionId"), "participanteId": C("ParticipanteId"),
                                      "montoMaximoPrestamo": FORMULAS["participacion.MontoMaximoPrestamo"]},
             And(Gte(C("CuotasPagadas"), C("PagosParaPrestamo")), Eq(C("AvisoPrestamoEnviado"), ent(0)))),
        Si(Gte(C("CuotasPagadas"), C("PagosParaPrestamo")), Liq("AvisoPrestamoEnviado", ent(1))),
    ]
    fallo_cuota = [Acu("DeudaCuotas", C("ValorCuota")), Inc("CuotasAdeudadas")]
    actividad = [Emit("ObligacionActividadRequerida", dict(ids, actividadId=P("ActividadId"), valor=P("ValorActividad"),
                                                           castigoMoraDiario=P("CastigoMoraDiario"), fechaPago=P("FechaPago"),
                                                           walletParticipante=C("WalletParticipante")))]
    deuda_act = [Liq("DeudaActividades", Max(Add(C("DeudaActividades"), P("DeltaDeudaActividades")), cur(0))),
                 Emit("DeudaActividadesActualizada", {"participacionId": C("ParticipacionId"), "deudaActividades": C("DeudaActividades")})]
    deuda_pre = [Liq("DeudaPrestamoEnMora", P("DeudaPrestamoEnMora")),
                 Emit("DeudaPrestamoActualizada", {"participacionId": C("ParticipacionId"), "deudaPrestamoEnMora": C("DeudaPrestamoEnMora")})]
    calcular = [
        Estado(M, ix["EN_LIQUIDACION"]),
        Liq("DescuentoActividades", FORMULAS["participacion.DescuentoActividades"]),
        Liq("DescuentoCuotas", FORMULAS["participacion.DescuentoCuotas"]),
        Liq("MontoDescuentoPrestamo", FORMULAS["participacion.MontoDescuentoPrestamo"]),
        Liq("ParteNeta", FORMULAS["participacion.ParteNeta"]),
        Emit("ParteCalculada", dict(ids, parteNeta=C("ParteNeta"), montoDescuentoPrestamo=C("MontoDescuentoPrestamo"))),
        Emit("DescuentoPrestamoAplicado", {"participacionId": C("ParticipacionId"), "montoDescuento": C("MontoDescuentoPrestamo")},
             Gt(C("MontoDescuentoPrestamo"), cur(0))),
        Emit("DescuentoActividadesAplicado", {"participacionId": C("ParticipacionId"), "montoDescuento": C("DescuentoActividades")},
             Gt(C("DescuentoActividades"), cur(0))),
    ]
    sobrante = [Liq("SobranteAsignado", FORMULAS["participacion.SobranteAsignado"]),
                Liq("ParteFinal", Add(C("ParteNeta"), C("SobranteAsignado")))]
    pedir_pago = Emit("PagoLiquidacionSolicitado", {"participacionId": C("ParticipacionId"), "monto": C("ParteFinal"),
                                                    "walletParticipante": C("WalletParticipante")})
    pedir_reembolso = Emit("ReembolsoSolicitado", {"participacionId": C("ParticipacionId"), "monto": C("TotalAportado"),
                                                   "walletParticipante": C("WalletParticipante")})
    reembolso_cero = [Estado(M, ix["REEMBOLSADA"]), Emit("ParticipacionReembolsada", dict(ids, monto=cur(0)))]
    asignado_mayor_que_cero = Gt(Add(C("ParteNeta"), SOBRANTE_ASIGNADO), cur(0))
    funciones = [
        Fn("CrearParticipacion", "CrearParticipacion", "Nace PENDIENTE_VALIDACION: el administrador invitó por Telegram.", hoy),
        Fn("ConfirmarAutorizacion", "ConfirmarAutorizacion", "El participante aprobó el grant recurrente y su billetera existe (BRG-001).", [
            Estado(M, ix["VALIDADA"]), Liq("GrantId", P("GrantId")), Emit("ParticipanteValidado", ids),
        ], st("PENDIENTE_VALIDACION"), [Eq(P("PermisoAprobado"), ent(1)), Eq(P("BilleteraVerificada"), ent(1))]),
        Fn("RechazarAutorizacion", "RechazarAutorizacion", "No aprobó el permiso: se le avisa y puede volver a intentarlo.", [
            Emit("AutorizacionRechazada", {"participacionId": C("ParticipacionId"), "motivo": P("Motivo")}),
        ], st("PENDIENTE_VALIDACION")),
        Fn("CobrarCuota", "CobrarCuota", "BRG-002/003: pide la cuota del periodo; la llamada «cobro-cuota» la debita con el grant.",
           solicitar_cuota, st("VALIDADA", "ACTIVA", "MORA"), Lt(C("PeriodosSolicitados"), C("NumeroCuotas"))),
        Fn("PrimeraCuotaCobrada", "CuotaCobrada", "El riel cobró la primera cuota: la participación queda ACTIVA.",
           [Estado(M, ix["ACTIVA"])] + cuota_cobrada + aviso_prestamo, st("VALIDADA"), Eq(P("MontoCobrado"), C("ValorCuota"))),
        Fn("CuotaCobrada", "CuotaCobrada", "El riel cobró la cuota del periodo.",
           cuota_cobrada + aviso_prestamo, st("ACTIVA"), Eq(P("MontoCobrado"), C("ValorCuota"))),
        Fn("CuotaCobradaEnMora", "CuotaCobrada", "Cobró la cuota del periodo, pero la deuda vieja sigue: no hay aviso de préstamo.",
           cuota_cobrada, st("MORA"), Eq(P("MontoCobrado"), C("ValorCuota"))),
        Fn("EntrarEnMora", "CuotaFallida", "Sin fondos el día de pago (E-12): pasa a MORA y empieza la mora diaria.", fallo_cuota + hoy + [
            Estado(M, ix["MORA"]), Liq("FechaUltimaMora", HOY),
            Emit("EntradaEnMora", {"participacionId": C("ParticipacionId"), "deudaCuotas": C("DeudaCuotas")}),
        ], st("VALIDADA", "ACTIVA")),
        Fn("SumarDeudaCuota", "CuotaFallida", "Otra cuota fallada estando en MORA.", fallo_cuota + [
            Emit("DeudaCuotaRegistrada", {"participacionId": C("ParticipacionId"), "deudaCuotas": C("DeudaCuotas")}),
        ], st("MORA")),
        Fn("CausarMoraDiaria", "CausarMoraDiaria", "Mora diaria sobre la deuda de cuotas y recordatorio por Telegram (E-12).", hoy + [
            Liq("DiasDeMora", Max(DaysBetween("FechaUltimaMora", "FechaActual"), ent(0))),
            Acu("MoraAcumulada", FORMULAS["participacion.MoraDelDia"]),
            Liq("FechaUltimaMora", C("FechaActual")),
            Emit("RecordatorioMora", {"participacionId": C("ParticipacionId"), "deudaCuotas": C("DeudaCuotas"),
                                      "moraAcumulada": C("MoraAcumulada"), "total": Add(C("DeudaCuotas"), C("MoraAcumulada"))}),
        ], st("MORA"), Gt(C("DeudaCuotas"), cur(0))),
        Fn("PagarDeuda", "PagarDeuda", "«Ya tengo el dinero» por Telegram: la llamada «cobro-deuda» cobra deuda + mora.", [
            Emit("CobroDeudaSolicitado", {"participacionId": C("ParticipacionId"), "monto": Add(C("DeudaCuotas"), C("MoraAcumulada")),
                                          "walletParticipante": C("WalletParticipante"), "grantId": C("GrantId")}),
        ], st("MORA"), Gt(C("DeudaCuotas"), cur(0))),
        Fn("DeudaCobrada", "DeudaCobrada", "Pagó deuda + mora: vuelve a ACTIVA (BRG-005 lo suma al pozo).", [
            Estado(M, ix["ACTIVA"]), Acu("TotalAportado", P("MontoCobrado")),
            Acu("CuotasPagadas", C("CuotasAdeudadas")), Liq("CuotasAdeudadas", ent(0)),
            Liq("DeudaCuotas", cur(0)), Liq("MoraAcumulada", cur(0)),
            Emit("DeudaPagada", dict(ids, monto=P("MontoCobrado"))),
            Emit("SalidaDeMora", {"participacionId": C("ParticipacionId")}),
        ] + aviso_prestamo, st("MORA"), Gte(P("MontoCobrado"), Add(C("DeudaCuotas"), C("MoraAcumulada")))),
        Fn("CobroDeudaFallido", "CobroDeudaFallido", "El cobro de la deuda falló: sigue en MORA y se le avisa (C2).", [
            Emit("CobroDeudaFallo", {"participacionId": C("ParticipacionId"), "motivo": P("Motivo")}),
        ], st("MORA")),
        Fn("RegistrarActividad", "RegistrarActividad", "BRG-015: nace su cuenta por pagar de la actividad (BRG-014).",
           actividad, st("ACTIVA", "MORA")),
        Fn("ActualizarDeudaActividades", "ActualizarDeudaActividades", "BRG-018/019: suma a la deuda de actividades.",
           deuda_act, st("ACTIVA", "MORA")),
        Fn("RestarDeudaActividades", "RestarDeudaActividades", "BRG-020: una obligación saldada sale de la deuda (C8: nunca < 0).", [
            Liq("DeudaActividades", Sub(C("DeudaActividades"), P("MontoSaldado"))),
            Emit("DeudaActividadesActualizada", {"participacionId": C("ParticipacionId"), "deudaActividades": C("DeudaActividades")}),
        ], st("ACTIVA", "MORA")),
        Fn("ActualizarDeudaPrestamo", "ActualizarDeudaPrestamo", "BRG-023/024/025: lo que la financiera reporta por descontar.",
           deuda_pre, st("ACTIVA", "MORA")),
        Fn("CalcularParte", "CalcularParte", "BRG-008, ronda 1 (E-16): parte igual menos actividades, cuotas + mora y préstamo, cada uno con tope.",
           calcular, st("ACTIVA", "MORA")),
        Fn("AplicarSobrante", "AplicarSobrante", "BRG-010, ronda 2: sobrante + residuo; la llamada «pago-liquidacion» le paga.",
           sobrante + [pedir_pago], st("EN_LIQUIDACION"), asignado_mayor_que_cero),
        Fn("LiquidarEnCero", "AplicarSobrante", "Parte final 0 (la deuda se comió la parte): liquida sin llamar al riel (H4).",
           sobrante + [Estado(M, ix["LIQUIDADA"]), Emit("ParticipacionLiquidada", dict(ids, monto=cur(0)))],
           st("EN_LIQUIDACION"), Not(asignado_mayor_que_cero)),
        Fn("PagoLiquidacionConfirmado", "PagoLiquidacionConfirmado", "El riel pagó la parte final (BRG-011).", [
            Estado(M, ix["LIQUIDADA"]), Liq("PagoFallidoPendiente", ent(0)),
            Emit("ParticipacionLiquidada", dict(ids, monto=P("MontoConfirmado"))),
        ], st("EN_LIQUIDACION"), Eq(P("MontoConfirmado"), C("ParteFinal"))),
        Fn("PagoLiquidacionFallido", "PagoLiquidacionFallido", "El riel no pudo pagar: aviso y reintento diario (C1).", [
            Liq("PagoFallidoPendiente", ent(1)),
            Emit("PagoLiquidacionFallo", {"participacionId": C("ParticipacionId"), "motivo": P("Motivo")}),
        ], st("EN_LIQUIDACION")),
        Fn("ReintentarPagoLiquidacion", "ReintentarPagoLiquidacion", "Reintenta el pago de la parte final.", [
            Liq("PagoFallidoPendiente", ent(0)), pedir_pago,
        ], st("EN_LIQUIDACION"), [Eq(C("PagoFallidoPendiente"), ent(1)), Gt(C("ParteFinal"), cur(0))]),
        Fn("ReembolsarSinAporte", "Reembolsar", "BRG-006: nunca pagó, nada que devolver (H3).", reembolso_cero, st("VALIDADA")),
        Fn("Reembolsar", "Reembolsar", "BRG-006: devuelve todo lo aportado; la llamada «reembolso» le paga.", [
            Estado(M, ix["EN_REEMBOLSO"]), pedir_reembolso], st("ACTIVA")),
        Fn("ReembolsarDesdeMora", "Reembolsar", "En MORA pero con algo aportado.", [
            Estado(M, ix["EN_REEMBOLSO"]), pedir_reembolso], st("MORA"), Gt(C("TotalAportado"), cur(0))),
        Fn("ReembolsarDesdeMoraSinAporte", "Reembolsar", "En MORA sin nada aportado (H3).", reembolso_cero, st("MORA"),
           Eq(C("TotalAportado"), cur(0))),
        Fn("ReembolsoConfirmado", "ReembolsoConfirmado", "El riel devolvió lo aportado (BRG-007).", [
            Estado(M, ix["REEMBOLSADA"]), Liq("PagoFallidoPendiente", ent(0)),
            Emit("ParticipacionReembolsada", dict(ids, monto=P("MontoConfirmado"))),
        ], st("EN_REEMBOLSO"), Eq(P("MontoConfirmado"), C("TotalAportado"))),
        Fn("ReembolsoFallido", "ReembolsoFallido", "El riel no pudo devolver: aviso y reintento diario (C1).", [
            Liq("PagoFallidoPendiente", ent(1)),
            Emit("ReembolsoFallo", {"participacionId": C("ParticipacionId"), "motivo": P("Motivo")}),
        ], st("EN_REEMBOLSO")),
        Fn("ReintentarReembolso", "ReintentarReembolso", "Reintenta el reembolso.", [
            Liq("PagoFallidoPendiente", ent(0)), pedir_reembolso,
        ], st("EN_REEMBOLSO"), Eq(C("PagoFallidoPendiente"), ent(1))),
    ]
    sm = maquina(M, E, [
        ("PENDIENTE_VALIDACION", "VALIDADA", "[ConfirmarAutorizacion] Grant aprobado y billetera verificada"),
        ("VALIDADA", "ACTIVA", "[CuotaCobrada] Primera cuota cobrada"),
        ("VALIDADA", "MORA", "[CuotaFallida] Sin fondos el día de pago"),
        ("VALIDADA", "REEMBOLSADA", "[Reembolsar] Sin cupo y nunca pagó"),
        ("ACTIVA", "MORA", "[CuotaFallida] Sin fondos el día de pago"),
        ("ACTIVA", "EN_LIQUIDACION", "[CalcularParte] Ronda 1 de la liquidación"),
        ("ACTIVA", "EN_REEMBOLSO", "[Reembolsar] Sin cupo"),
        ("MORA", "ACTIVA", "[DeudaCobrada] Pagó deuda + mora"),
        ("MORA", "EN_LIQUIDACION", "[CalcularParte] Ronda 1 con descuento de su deuda"),
        ("MORA", "EN_REEMBOLSO", "[Reembolsar] Sin cupo, con algo aportado"),
        ("MORA", "REEMBOLSADA", "[Reembolsar] Sin cupo, sin nada aportado"),
        ("EN_LIQUIDACION", "LIQUIDADA", "[PagoLiquidacionConfirmado | AplicarSobrante] Pagada su parte final (o parte 0)"),
        ("EN_REEMBOLSO", "REEMBOLSADA", "[ReembolsoConfirmado] Le devolvieron lo aportado"),
    ])
    llamadas = [
        Llamada("cobro-cuota", "Cobro de la cuota con el grant recurrente", "CobroCuotaSolicitado", "cobrar-cuota",
                {"grantId": "grantId", "walletOrigen": "walletParticipante", "monto": "monto", "referencia": "participacionId",
                 "periodo": "periodo"},
                [("Periodo", "integer", "periodo"), ("MontoCobrado", "currency", "monto")], "CuotaCobrada", "CuotaFallida"),
        Llamada("cobro-deuda", "Cobro de deuda + mora", "CobroDeudaSolicitado", "cobrar",
                {"grantId": "grantId", "walletOrigen": "walletParticipante", "monto": "monto", "referencia": "participacionId"},
                [("MontoCobrado", "currency", "monto")], "DeudaCobrada", "CobroDeudaFallido"),
        Llamada("pago-liquidacion", "Pago de la parte final en la liquidación", "PagoLiquidacionSolicitado", "pagar",
                {"walletDestino": "walletParticipante", "monto": "monto", "referencia": "participacionId"},
                [("MontoConfirmado", "currency", "monto")], "PagoLiquidacionConfirmado", "PagoLiquidacionFallido"),
        Llamada("reembolso", "Reembolso de lo aportado (sin cupo)", "ReembolsoSolicitado", "pagar",
                {"walletDestino": "walletParticipante", "monto": "monto", "referencia": "participacionId"},
                [("MontoConfirmado", "currency", "monto")], "ReembolsoConfirmado", "ReembolsoFallido"),
    ]
    avisos = [Aviso(e) for e in ("AutorizacionRechazada", "ElegibleParaPrestamo", "EntradaEnMora", "RecordatorioMora",
                                 "SalidaDeMora", "CobroDeudaFallo", "PagoLiquidacionFallo", "ReembolsoFallo",
                                 "ParticipacionLiquidada", "ParticipacionReembolsada")]
    return {"name": "natillera-participacion", "description": "CONT-002 · La participación de una persona en una natillera "
            "(la «cuenta de pago periódico»): permiso, cobro por periodo, mora diaria, parte en la liquidación y reembolso. "
            + ECOSISTEMA, "version": VERSION, "conceptDefinitions": conceptos, "stateMachines": sm, "triggers": triggers,
            "functions": funciones, "llamadas": llamadas, "avisos": avisos}


# ═══════════════════════════════ CONT-003 natillera-credito-ahorro ═══════════════════════════════
def natillera_credito():
    M = "EstadoCredito"
    E = ["DESEMBOLSO_PENDIENTE", "ACTIVO", "MORA", "PAGADO"]
    ix = {s: i for i, s in enumerate(E)}
    st = lambda *s: {M: list(s)}
    clave = {"participacionId": C("ParticipacionId"), "natilleraId": C("NatilleraId")}
    conceptos = [
        In("CreditoId", "Text", "Llave del crédito"),
        In("ParticipacionId", "Text", "La participación que lo pidió (E5: llave de BRG-012/023/024/025)"),
        In("ParticipanteId", "Text", "La persona"),
        In("NatilleraId", "Text", "La natillera"),
        In("WalletParticipante", "Text", "Billetera donde se desembolsa"),
        In("Capital", "Currency", "Monto prestado (hasta N × cuota, lo valida la financiera)", "Capital"),
        In("TasaMensual", "Percentage", "Tasa comercial mensual (E-15)", "Rate"),
        In("PlazoMeses", "Integer", "Cuotas mensuales", "Time"),
        In("FechaInicio", "Date", "Fecha del desembolso pedido", "Time"),
        Cd(M, "Integer", "Máquina del crédito: " + " · ".join(f"{i}={s}" for i, s in enumerate(E)), "Zero", "Status"),
        Cd("CuotaMensual", "Currency", "Cuota francesa al centavo", "Explicit", "Payment"),
        Cd("SaldoCapital", "Currency", "Capital por pagar", "Zero", "Capital"),
        Cd("InteresCausado", "Currency", "Interés causado y no pagado", "Zero", "Interest"),
        Cd("SaldoTotal", "Currency", "Capital + interés: lo que se descuenta en la liquidación (E-16)", "Zero", "Calculated"),
        Cd("CuotaPendiente", "Currency", "Lo que falta de la cuota del periodo", "Zero", "Payment"),
        Cd("SaldoVencido", "Currency", "Cuota vencida sin pagar (en MORA)", "Zero", "Payment"),
        Cd("CuotasPagadas", "Integer", "Cuotas completas pagadas"),
        Cd("FechaProximoVencimiento", "Date", "Vencimiento de la cuota en curso", "Explicit", "Time"),
        Cd("FechaActual", "Date", "Fecha del último trigger", "Explicit", "Time"),
        Cd("FechaUltimaCausacion", "Date", "Hasta cuándo se causó interés", "Explicit", "Time"),
        Cd("DiasCausados", "Integer", "Días a causar en este trigger"),
        Cd("AbonoInteres", "Currency", "Parte del pago que va a interés", "Zero", "Calculated"),
        Cd("SaldoAFavor", "Currency", "Lo pagado de más (6.5): la financiera lo devuelve; el motor no baja de 0", "Zero", "Payment"),
        Cd("DesembolsoFallidoPendiente", "Integer", "1 = el desembolso falló y espera reintento"),
    ]
    triggers = [
        Tr("CrearCredito", "creation"),
        Tr("DesembolsoConfirmado", "external", [Par("MontoConfirmado", "Currency")], "system"),
        Tr("DesembolsoFallido", "external", [MOTIVO], "system"),
        Tr("ReintentarDesembolso", "scheduled", vis="private", cron=DIARIO),
        Tr("CausacionDiaria", "scheduled", vis="private", cron=DIARIO),
        Tr("PagoRecibido", "external", [Par("MontoPago", "Currency"), Par("Referencia", "Text", False)]),
        Tr("VencimientoCuota", "scheduled", vis="private", cron=DIARIO),
        Tr("DescuentoLiquidacion", "external", [Par("MontoDescuento", "Currency")], "private"),
    ]
    saldo_total = Liq("SaldoTotal", Add(C("SaldoCapital"), C("InteresCausado")))
    causar = [Liq("FechaActual", HOY),
              Liq("DiasCausados", Max(DaysBetween("FechaUltimaCausacion", "FechaActual"), ent(0))),
              Acu("InteresCausado", FORMULAS["credito.InteresDelPeriodo"]),
              Liq("FechaUltimaCausacion", C("FechaActual")), saldo_total]

    def aplicar(monto):
        return [Liq("AbonoInteres", Min(monto, C("InteresCausado"))),
                Liq("InteresCausado", Sub(C("InteresCausado"), C("AbonoInteres"))),
                Liq("SaldoCapital", Max(Sub(C("SaldoCapital"), Sub(monto, C("AbonoInteres"))), cur(0))),
                saldo_total,
                Liq("CuotaPendiente", Max(Sub(C("CuotaPendiente"), monto), cur(0))),
                Si(Eq(C("CuotaPendiente"), cur(0)), {"type": "Bloque", "steps": [
                    Inc("CuotasPagadas"),
                    Liq("FechaProximoVencimiento", AddMonths("FechaInicio", Add(C("CuotasPagadas"), ent(1)))),
                    Liq("CuotaPendiente", Min(C("CuotaMensual"), C("SaldoTotal")))]})]

    pago = aplicar(P("MontoPago"))
    desc = aplicar(P("MontoDescuento"))
    aplicado = Emit("PagoPrestamoAplicado", {"creditoId": C("CreditoId"), "montoPago": P("MontoPago"), "saldoTotal": C("SaldoTotal")})
    reportar = Emit("DeudaPrestamoReportada", dict(clave, deudaPrestamoEnMora=C("SaldoTotal")))
    # payload completo (FND014): la regla no fabrica constantes, así que el 0 que limpia la deuda viaja en el evento
    pagado = [Estado(M, ix["PAGADO"]), Emit("CreditoPagado", dict(clave, creditoId=C("CreditoId"), deudaPrestamoEnMora=cur(0),
                                                                   saldoAFavor=C("SaldoAFavor")))]
    a_favor = lambda monto: Liq("SaldoAFavor", Sub(monto, C("SaldoTotal")))   # antes de aplicar: lo que excede el total
    funciones = [
        Fn("CrearCredito", "CrearCredito", "La financiera otorga el préstamo (E-15); la llamada «desembolso» lo paga a la billetera.", [
            Liq("CuotaMensual", FORMULAS["credito.CuotaMensual"]),
            Emit("DesembolsoSolicitado", {"creditoId": C("CreditoId"), "capital": C("Capital"), "walletParticipante": C("WalletParticipante")}),
        ], pre=[Gt(P("Capital"), cur(0)), Gt(P("PlazoMeses"), ent(0))]),
        Fn("DesembolsoConfirmado", "DesembolsoConfirmado", "El dinero llegó a la billetera: empieza el calendario.", [
            Estado(M, ix["ACTIVO"]), Liq("DesembolsoFallidoPendiente", ent(0)),
            Liq("SaldoCapital", C("Capital")), Liq("CuotaPendiente", C("CuotaMensual")),
            Liq("FechaUltimaCausacion", C("FechaInicio")),
            Liq("FechaProximoVencimiento", AddMonths("FechaInicio", ent(1))), saldo_total,
            Emit("PrestamoDesembolsado", {"creditoId": C("CreditoId"), "participanteId": C("ParticipanteId"), "capital": C("Capital")}),
        ], st("DESEMBOLSO_PENDIENTE"), Eq(P("MontoConfirmado"), C("Capital"))),
        Fn("DesembolsoFallido", "DesembolsoFallido", "El riel no pudo desembolsar: aviso y reintento diario (C1).", [
            Liq("DesembolsoFallidoPendiente", ent(1)),
            Emit("DesembolsoFallo", {"creditoId": C("CreditoId"), "motivo": P("Motivo")}),
        ], st("DESEMBOLSO_PENDIENTE")),
        Fn("ReintentarDesembolso", "ReintentarDesembolso", "Reintenta el desembolso.", [
            Liq("DesembolsoFallidoPendiente", ent(0)),
            Emit("DesembolsoSolicitado", {"creditoId": C("CreditoId"), "capital": C("Capital"), "walletParticipante": C("WalletParticipante")}),
        ], st("DESEMBOLSO_PENDIENTE"), Eq(C("DesembolsoFallidoPendiente"), ent(1))),
        Fn("CausacionDiaria", "CausacionDiaria", "Interés de los días transcurridos.", causar + [
            Emit("InteresCausado", {"creditoId": C("CreditoId"), "interesDia": FORMULAS["credito.InteresDelPeriodo"]}),
        ], st("ACTIVO")),
        Fn("CausacionDiariaEnMora", "CausacionDiaria", "Interés en MORA; le reporta a la participación lo que se descontaría.", causar + [
            Emit("InteresCausado", {"creditoId": C("CreditoId"), "interesDia": FORMULAS["credito.InteresDelPeriodo"]}), reportar,
        ], st("MORA")),
        Fn("RecibirAbono", "PagoRecibido", "Pago parcial al día (aparte de la natillera, E-15).", pago + [aplicado],
           st("ACTIVO"), [Gt(P("MontoPago"), cur(0)), Lt(P("MontoPago"), C("SaldoTotal"))]),
        Fn("RecibirPagoTotal", "PagoRecibido", "Pagó todo (lo de más queda a favor, 6.5).", [a_favor(P("MontoPago"))] + pago + [aplicado] + pagado,
           st("ACTIVO"), Gte(P("MontoPago"), C("SaldoTotal"))),
        Fn("VencimientoCuota", "VencimientoCuota", "Pasó el vencimiento con la cuota sin pagar: MORA y se reporta a la participación.", [
            Estado(M, ix["MORA"]), Liq("SaldoVencido", C("CuotaPendiente")),
            Emit("CreditoEnMora", {"creditoId": C("CreditoId"), "saldoVencido": C("SaldoVencido")}), reportar,
        ], st("ACTIVO"), [FechaMayor(HOY, C("FechaProximoVencimiento")), Gt(C("CuotaPendiente"), cur(0))]),
        Fn("RecibirAbonoEnMora", "PagoRecibido", "Abono que no alcanza la cuota vencida.", pago + [
            Liq("SaldoVencido", Max(Sub(C("SaldoVencido"), P("MontoPago")), cur(0))), aplicado, reportar,
        ], st("MORA"), [Gt(P("MontoPago"), cur(0)), Lt(P("MontoPago"), C("SaldoVencido"))]),
        Fn("PonerseAlDia", "PagoRecibido", "Pagó la cuota vencida: vuelve a ACTIVO.", pago + [
            Liq("SaldoVencido", cur(0)), Estado(M, ix["ACTIVO"]), aplicado,
            Emit("CreditoAlDia", dict(clave, deudaPrestamoEnMora=cur(0))),
        ], st("MORA"), [Gte(P("MontoPago"), C("SaldoVencido")), Lt(P("MontoPago"), C("SaldoTotal"))]),
        Fn("RecibirPagoTotalEnMora", "PagoRecibido", "Pagó todo estando en MORA (lo de más queda a favor, 6.5).",
           [a_favor(P("MontoPago"))] + pago + [Liq("SaldoVencido", cur(0)), aplicado] + pagado,
           st("MORA"), Gte(P("MontoPago"), C("SaldoTotal"))),
        Fn("DescuentoLiquidacion", "DescuentoLiquidacion", "BRG-012: lo descontado de la parte abona al crédito (no alcanza el total).", desc + [
            Liq("SaldoVencido", Max(Sub(C("SaldoVencido"), P("MontoDescuento")), cur(0))),
            Emit("DescuentoLiquidacionAplicado", {"creditoId": C("CreditoId"), "montoDescuento": P("MontoDescuento")}),
        ], st("MORA"), [Gt(P("MontoDescuento"), cur(0)), Lt(P("MontoDescuento"), C("SaldoTotal"))]),
        Fn("SaldarEnLiquidacion", "DescuentoLiquidacion", "BRG-012: lo descontado salda el crédito (AVL Q3).", desc + [
            Liq("SaldoVencido", cur(0)),
            Emit("DescuentoLiquidacionAplicado", {"creditoId": C("CreditoId"), "montoDescuento": P("MontoDescuento")}),
        ] + pagado, st("MORA"), Gte(P("MontoDescuento"), C("SaldoTotal"))),
    ]
    sm = maquina(M, E, [
        ("DESEMBOLSO_PENDIENTE", "ACTIVO", "[DesembolsoConfirmado] El dinero llegó"),
        ("ACTIVO", "MORA", "[VencimientoCuota] Venció la cuota sin pagar"),
        ("ACTIVO", "PAGADO", "[PagoRecibido] Pagó todo"),
        ("MORA", "ACTIVO", "[PagoRecibido] Pagó lo vencido"),
        ("MORA", "PAGADO", "[PagoRecibido | DescuentoLiquidacion] Pagado o saldado en la liquidación"),
    ])
    llamadas = [Llamada("desembolso", "Desembolso del préstamo a la billetera", "DesembolsoSolicitado", "desembolsar",
                        {"walletDestino": "walletParticipante", "monto": "capital", "referencia": "creditoId"},
                        [("MontoConfirmado", "currency", "monto")], "DesembolsoConfirmado", "DesembolsoFallido")]
    avisos = [Aviso(e) for e in ("PrestamoDesembolsado", "DesembolsoFallo", "CreditoEnMora")]
    return {"name": "natillera-credito-ahorro", "description": "CONT-003 · Crédito de la financiera a un participante (E-15): "
            "cuota francesa, pagos aparte y descuento en la liquidación si está en mora (E-16). Uno vivo por participación. "
            + ECOSISTEMA, "version": VERSION, "conceptDefinitions": conceptos, "stateMachines": sm, "triggers": triggers,
            "functions": funciones, "llamadas": llamadas, "avisos": avisos}


# ═══════════════════════════════ CONT-004 natillera-obligacion-actividad ═══════════════════════════════
def natillera_obligacion():
    M = "EstadoObligacion"
    E = ["PENDIENTE", "ALERTA", "PAGADA", "DESCONTADA"]
    ix = {s: i for i, s in enumerate(E)}
    st = lambda *s: {M: list(s)}
    conceptos = [
        In("NatilleraId", "Text", "La natillera"),
        In("ParticipacionId", "Text", "Quién debe (identidad con ActividadId, BRG-014)"),
        In("ActividadId", "Text", "De qué actividad"),
        In("ValorObligacion", "Currency", "Valor por participante", "Payment"),
        In("CastigoMoraDiario", "Percentage", "Castigo diario tras FechaPago (E-11)", "Rate"),
        In("FechaPago", "Date", "Hasta cuándo se paga sin castigo", "Time"),
        In("WalletParticipante", "Text", "Billetera de la que se cobra"),
        Cd(M, "Integer", "Máquina de la obligación: " + " · ".join(f"{i}={s}" for i, s in enumerate(E)), "Zero", "Status"),
        Cd("DeudaObligacion", "Currency", "Valor vencido sin pagar", "Zero", "Payment"),
        Cd("CastigoAcumulado", "Currency", "Castigo causado", "Zero", "Interest"),
        Cd("FechaActual", "Date", "Fecha del último trigger", "Explicit", "Time"),
        Cd("FechaUltimoCastigo", "Date", "Hasta cuándo se causó el castigo", "Explicit", "Time"),
        Cd("DiasDeCastigo", "Integer", "Días a causar en este trigger"),
        Cd("CastigoDelDia", "Currency", "Castigo causado en este trigger", "Zero", "Calculated"),
    ]
    triggers = [
        Tr("CrearObligacion", "creation"),
        Tr("AutorizarPago", "external"),
        Tr("CobroConfirmado", "external", [Par("MontoCobrado", "Currency")], "system"),
        Tr("CobroFallido", "external", [MOTIVO], "system"),
        Tr("VencerSinPago", "scheduled", vis="private", cron=DIARIO),
        Tr("CausarCastigoDiario", "scheduled", vis="private", cron=DIARIO),
        Tr("DescontarEnLiquidacion", "external", vis="private"),
    ]
    ids = {"participacionId": C("ParticipacionId"), "actividadId": C("ActividadId")}
    pagada = Emit("ObligacionPagada", dict(ids, natilleraId=C("NatilleraId"), valor=C("ValorObligacion"), montoCobrado=P("MontoCobrado")))
    alerta = [Estado(M, ix["ALERTA"]), Liq("DeudaObligacion", C("ValorObligacion")), Liq("FechaUltimoCastigo", C("FechaPago")),
              Emit("ObligacionEnAlerta", {"participacionId": C("ParticipacionId"), "deudaObligacion": C("ValorObligacion")})]
    descontar = [Estado(M, ix["DESCONTADA"]),
                 Emit("ObligacionDescontada", dict(ids, monto=Add(C("DeudaObligacion"), C("CastigoAcumulado"))))]
    funciones = [
        Fn("CrearObligacion", "CrearObligacion", "BRG-014: la cuenta por pagar del participante en la actividad (E-11).", [Liq("FechaActual", HOY)]),
        Fn("AutorizarPago", "AutorizarPago", "El participante autoriza el cobro por Telegram; la llamada «cobro-obligacion» lo debita.", [
            Emit("CobroObligacionSolicitado", dict(ids, monto=Add(C("ValorObligacion"), C("CastigoAcumulado")),
                                                   walletParticipante=C("WalletParticipante"))),
        ], st("PENDIENTE", "ALERTA")),
        Fn("CobroConfirmado", "CobroConfirmado", "Pagó a tiempo (BRG-016/017).", [Estado(M, ix["PAGADA"]), pagada],
           st("PENDIENTE"), Eq(P("MontoCobrado"), C("ValorObligacion"))),
        Fn("CobroFallido", "CobroFallido", "Sin fondos: queda en ALERTA (BRG-018).", alerta, st("PENDIENTE")),
        Fn("CobroFallidoEnAlerta", "CobroFallido", "Otro intento fallido estando en ALERTA: solo aviso (C2).", [
            Emit("CobroObligacionFallo", dict(ids, motivo=P("Motivo")))], st("ALERTA")),
        Fn("VencerSinPago", "VencerSinPago", "Pasó FechaPago sin pagar (BRG-018).", alerta, st("PENDIENTE"), FechaMayor(HOY, C("FechaPago"))),
        Fn("CausarCastigoDiario", "CausarCastigoDiario", "Castigo de los días vencidos y recordatorio (BRG-019).", [
            Liq("FechaActual", HOY),
            Liq("DiasDeCastigo", Max(DaysBetween("FechaUltimoCastigo", "FechaActual"), ent(0))),
            Liq("CastigoDelDia", FORMULAS["obligacion.CastigoDelDia"]),
            Acu("CastigoAcumulado", C("CastigoDelDia")), Liq("FechaUltimoCastigo", C("FechaActual")),
            Emit("RecordatorioObligacion", dict(ids, deudaObligacion=C("DeudaObligacion"), castigoAcumulado=C("CastigoAcumulado"),
                                                total=Add(C("DeudaObligacion"), C("CastigoAcumulado")))),
            Emit("DeudaObligacionActualizada", {"participacionId": C("ParticipacionId"), "castigoDelDia": C("CastigoDelDia")}),
        ], st("ALERTA"), [Gt(C("DeudaObligacion"), cur(0)), FechaMayor(HOY, C("FechaPago"))]),
        Fn("CobroConfirmadoEnAlerta", "CobroConfirmado", "Pagó valor + castigo (BRG-016/017/020).", [
            Estado(M, ix["PAGADA"]), pagada,
            Emit("DeudaObligacionSaldada", {"participacionId": C("ParticipacionId"),
                                            "deudaSaldada": Add(C("DeudaObligacion"), C("CastigoAcumulado"))}),
        ], st("ALERTA"), Gte(P("MontoCobrado"), Add(C("ValorObligacion"), C("CastigoAcumulado")))),
        Fn("DescontarEnLiquidacion", "DescontarEnLiquidacion", "BRG-013: se cobró de su parte en la liquidación.", descontar, st("PENDIENTE", "ALERTA")),
    ]
    sm = maquina(M, E, [
        ("PENDIENTE", "ALERTA", "[CobroFallido | VencerSinPago] Sin fondos o vencida"),
        ("PENDIENTE", "PAGADA", "[CobroConfirmado] Pagó a tiempo"),
        ("PENDIENTE", "DESCONTADA", "[DescontarEnLiquidacion] Cobrada de su parte"),
        ("ALERTA", "PAGADA", "[CobroConfirmado] Pagó valor + castigo"),
        ("ALERTA", "DESCONTADA", "[DescontarEnLiquidacion] Cobrada de su parte"),
    ])
    llamadas = [Llamada("cobro-obligacion", "Cobro de la obligación de actividad", "CobroObligacionSolicitado", "cobrar",
                        {"walletOrigen": "walletParticipante", "monto": "monto", "referencia": "actividadId"},
                        [("MontoCobrado", "currency", "monto")], "CobroConfirmado", "CobroFallido")]
    avisos = [Aviso(e) for e in ("RecordatorioObligacion", "CobroObligacionFallo")]
    return {"name": "natillera-obligacion-actividad", "description": "CONT-004 · La cuenta por pagar de un participante en una "
            "actividad (rifa, bazar, compartir), con castigo diario (E-11). Nace por regla (BRG-014). " + ECOSISTEMA,
            "version": VERSION, "conceptDefinitions": conceptos, "stateMachines": sm, "triggers": triggers,
            "functions": funciones, "llamadas": llamadas, "avisos": avisos}


# ═══════════════════════════════ CONT-005 natillera-actividad ═══════════════════════════════
def natillera_actividad():
    M = "EstadoActividad"
    E = ["RECAUDANDO", "PREMIO_PARCIAL", "ACUMULADA", "PREMIO_PAGADO"]
    ix = {s: i for i, s in enumerate(E)}
    st = lambda *s: {M: list(s)}
    conceptos = [
        In("ActividadId", "Text", "Llave de la actividad"),
        In("NatilleraId", "Text", "La natillera (E-11: solo con la natillera ACTIVA, lo valida el bot)"),
        In("Descripcion", "Text", "Rifa, bazar, compartir…"),
        In("ValorPorParticipante", "Currency", "Lo que paga cada participante", "Payment"),
        In("Premio", "Currency", "0 = sin premio (bazar, compartir); si hay, menor que valor × participantes (E-11)", "Payment"),
        In("NumeroParticipantes", "Integer", "Participantes de la natillera al crearla"),
        In("CastigoMoraDiario", "Percentage", "Castigo diario de la obligación (E-11)", "Rate"),
        In("FechaActividad", "Date", "Día de la actividad (sorteo, bazar)", "Time"),
        In("FechaPago", "Date", "Hasta cuándo se paga (antes de la fecha final de la natillera, E-11)", "Time"),
        Cd(M, "Integer", "Máquina de la actividad: " + " · ".join(f"{i}={s}" for i, s in enumerate(E)), "Zero", "Status"),
        Cd("Recaudado", "Currency", "Valor de las obligaciones pagadas (sin castigo)", "Zero", "Payment"),
        Cd("PremioPagado", "Currency", "Lo que ya se le ordenó al ganador", "Zero", "Payment"),
        Cd("RestoPremio", "Currency", "Lo que se le ordena al ganador en este recaudo", "Zero", "Calculated"),
        Cd("GanadorParticipacionId", "Text", "Ganador indicado por el administrador", "Explicit"),
        Cd("WalletGanador", "Text", "Billetera del ganador", "Explicit"),
    ]
    triggers = [
        Tr("CrearActividad", "creation"),
        Tr("RegistrarRecaudo", "external", [Par("ParticipacionId", "Text"), Par("MontoRecaudo", "Currency")], "private"),
        Tr("CerrarSinPremioOSinGanador", "external"),
        Tr("IndicarGanador", "external", [Par("GanadorParticipacionId", "Text"), Par("WalletGanador", "Text"),
                                          Par("GanadorConfirmado", "Integer")]),
        Tr("CerrarEnLiquidacion", "external", vis="private"),
    ]
    aid = {"actividadId": C("ActividadId")}
    orden = lambda monto: dict(aid, natilleraId=C("NatilleraId"), ganadorParticipacionId=C("GanadorParticipacionId"),
                               monto=monto, walletGanador=C("WalletGanador"))
    ganador = [Liq("GanadorParticipacionId", P("GanadorParticipacionId")), Liq("WalletGanador", P("WalletGanador"))]
    recaudo = Acu("Recaudado", P("MontoRecaudo"))
    resto = [recaudo, Liq("RestoPremio", FORMULAS["actividad.RestoPremio"]), Acu("PremioPagado", C("RestoPremio")),
             Emit("RestoPremioOrdenado", orden(C("RestoPremio")))]
    hay_premio_y_ganador = [Gt(C("Premio"), cur(0)), Eq(P("GanadorConfirmado"), ent(1))]
    funciones = [
        Fn("CrearActividad", "CrearActividad", "El administrador crea la actividad; BRG-015 le crea a cada participante su obligación.", [
            Emit("ActividadCreada", dict(aid, natilleraId=C("NatilleraId"), valor=C("ValorPorParticipante"),
                                         castigoMoraDiario=C("CastigoMoraDiario"), fechaPago=C("FechaPago"))),
        ], pre=[Gt(P("ValorPorParticipante"), cur(0)),
                Lt(P("Premio"), Mul(P("ValorPorParticipante"), P("NumeroParticipantes")))]),
        Fn("RegistrarRecaudo", "RegistrarRecaudo", "BRG-016: una obligación pagada.", [
            recaudo, Emit("RecaudoRegistrado", dict(aid, recaudado=C("Recaudado")))], st("RECAUDANDO"), Gt(P("MontoRecaudo"), cur(0))),
        Fn("CerrarSinPremioOSinGanador", "CerrarSinPremioOSinGanador", "Sin premio o sin ganador: todo al acumulado.", [
            Estado(M, ix["ACUMULADA"]), Emit("ActividadAcumulada", dict(aid, natilleraId=C("NatilleraId"), recaudado=C("Recaudado")))],
           st("RECAUDANDO")),
        Fn("IndicarGanadorConPremioCompleto", "IndicarGanador", "«Indica y ordena; el sistema paga»: alcanza para el premio.", ganador + [
            Estado(M, ix["PREMIO_PAGADO"]), Liq("PremioPagado", C("Premio")),
            Emit("PremioOrdenado", orden(C("Premio"))), Emit("PremioCompletado", dict(aid, premio=C("Premio")))],
           st("RECAUDANDO"), hay_premio_y_ganador + [Gte(C("Recaudado"), C("Premio"))]),
        Fn("IndicarGanadorConPremioParcial", "IndicarGanador", "No alcanza: se paga lo recaudado y el resto con cada recaudo.", ganador + [
            Estado(M, ix["PREMIO_PARCIAL"]), Liq("PremioPagado", C("Recaudado")), Emit("PremioOrdenado", orden(C("Recaudado")))],
           st("RECAUDANDO"), hay_premio_y_ganador + [Gt(C("Recaudado"), cur(0)), Lt(C("Recaudado"), C("Premio"))]),
        Fn("RegistrarRecaudoParaPremio", "RegistrarRecaudo", "BRG-016 + BRG-022: el recaudo va al ganador.", resto,
           st("PREMIO_PARCIAL"), [Gt(P("MontoRecaudo"), cur(0)), Lt(Add(C("PremioPagado"), P("MontoRecaudo")), C("Premio"))]),
        Fn("CompletarPremio", "RegistrarRecaudo", "Este recaudo completa el premio.", resto + [
            Estado(M, ix["PREMIO_PAGADO"]), Emit("PremioCompletado", dict(aid, premio=C("Premio")))],
           st("PREMIO_PARCIAL"), Gte(Add(C("PremioPagado"), P("MontoRecaudo")), C("Premio"))),
        Fn("AcumularEnLiquidacion", "CerrarEnLiquidacion", "BRG-026 (E7): sin ganador al liquidar → acumulado.", [
            Estado(M, ix["ACUMULADA"]), Emit("ActividadAcumulada", dict(aid, natilleraId=C("NatilleraId"), recaudado=C("Recaudado")))],
           st("RECAUDANDO")),
        Fn("CerrarPremioEnLiquidacion", "CerrarEnLiquidacion", "BRG-026 (E7): el premio parcial queda en lo pagado.", [
            Estado(M, ix["PREMIO_PAGADO"]),
            Emit("PremioCerradoEnLiquidacion", dict(aid, ganadorParticipacionId=C("GanadorParticipacionId"), premioPagado=C("PremioPagado")))],
           st("PREMIO_PARCIAL")),
    ]
    sm = maquina(M, E, [
        ("RECAUDANDO", "ACUMULADA", "[CerrarSinPremioOSinGanador | CerrarEnLiquidacion] Al acumulado"),
        ("RECAUDANDO", "PREMIO_PAGADO", "[IndicarGanador] Alcanza para el premio"),
        ("RECAUDANDO", "PREMIO_PARCIAL", "[IndicarGanador] Se paga lo recaudado"),
        ("PREMIO_PARCIAL", "PREMIO_PAGADO", "[RegistrarRecaudo | CerrarEnLiquidacion] Completo, o cerrado en la liquidación"),
    ])
    avisos = [Aviso(e) for e in ("ActividadAcumulada", "PremioCompletado", "PremioCerradoEnLiquidacion")]
    return {"name": "natillera-actividad", "description": "CONT-005 · Actividad especial (rifa, bazar, compartir): recaudo, "
            "premio al ganador indicado por el administrador o todo al acumulado (E-11). " + ECOSISTEMA,
            "version": VERSION, "conceptDefinitions": conceptos, "stateMachines": sm, "triggers": triggers,
            "functions": funciones, "avisos": avisos}


# C7 · El motor corre TODAS las funciones de un trigger, en el orden del template, cada una sobre el estado que dejó la
# anterior (ContractService.ExecuteAsync). Una rama que cambia el estado puede despertar a la siguiente (la 3.ª cuota
# activaba la natillera y luego se sumaba otra vez como aporte de ACTIVA). Regla: primero la rama que CIERRA o la que
# exige el estado de llegada de otra; después las demás. Ninguna función puede habilitar a una que venga después.
ORDEN = {
    "natillera-cuenta": {
        "RegistrarAporte": ["RegistrarAporte", "RegistrarAporteCompletaCupo", "RegistrarAporteSinCupo"],
        "RegistrarParteCalculada": ["RegistrarUltimaParte", "RegistrarParteCalculada"],
        "RegistrarPagoLiquidacion": ["CerrarNatillera", "RegistrarPagoLiquidacion"],
        "RegistrarReembolso": ["CerrarSinCupo", "RegistrarReembolso"],
    },
    "natillera-participacion": {
        "CuotaCobrada": ["CuotaCobradaEnMora", "CuotaCobrada", "PrimeraCuotaCobrada"],
        "CuotaFallida": ["SumarDeudaCuota", "EntrarEnMora"],
    },
    "natillera-credito-ahorro": {
        "PagoRecibido": ["RecibirPagoTotal", "RecibirAbono", "RecibirPagoTotalEnMora", "PonerseAlDia", "RecibirAbonoEnMora"],
        "DescuentoLiquidacion": ["SaldarEnLiquidacion", "DescuentoLiquidacion"],
    },
    "natillera-obligacion-actividad": {"CobroFallido": ["CobroFallidoEnAlerta", "CobroFallido"]},
    "natillera-actividad": {"RegistrarRecaudo": ["CompletarPremio", "RegistrarRecaudoParaPremio", "RegistrarRecaudo"]},
}


def ordenar(tpl):
    orden = ORDEN.get(tpl["name"], {})
    pos = {n: i for nombres in orden.values() for i, n in enumerate(nombres)}
    for trig, nombres in orden.items():
        assert sorted(nombres) == sorted(f["name"] for f in tpl["functions"] if f["trigger"] == trig), (tpl["name"], trig)
    indice = {f["name"]: i for i, f in enumerate(tpl["functions"])}
    # cada función conserva su lugar relativo; las de un trigger ordenado se reacomodan entre sí
    primero = {}
    for f in tpl["functions"]:
        primero.setdefault(f["trigger"], indice[f["name"]])
    tpl["functions"].sort(key=lambda f: (primero[f["trigger"]], pos.get(f["name"], indice[f["name"]])))


def con_entradas(constructor):
    """El motor NO asigna solo los conceptos de initialization Parameter: la función de creación los copia (paso Crear),
    como Pagui. Va primero, para que las fórmulas de la creación (NumeroCuotas, CuotaMensual) los lean asignados."""
    def envoltura():
        tpl = constructor()
        creacion = next(t["name"] for t in tpl["triggers"] if t["type"] == "creation")
        fn = next(f for f in tpl["functions"] if f["trigger"] == creacion)
        entradas = [{"type": "Crear", "concept": c["name"], "expression": P(c["name"])}
                    for c in tpl["conceptDefinitions"] if c["initialization"] == "Parameter"]
        fn["steps"] = entradas + fn["steps"]
        ordenar(tpl)
        return tpl
    envoltura.__name__ = constructor.__name__
    return envoltura


PRODUCTOS = [con_entradas(p) for p in
             (natillera_cuenta, natillera_participacion, natillera_credito, natillera_obligacion, natillera_actividad)]
SLUG = {"CONT-001": "natillera-cuenta", "CONT-002": "natillera-participacion", "CONT-003": "natillera-credito-ahorro",
        "CONT-004": "natillera-obligacion-actividad", "CONT-005": "natillera-actividad"}


# ═══════════════════════════════ salida ═══════════════════════════════
def escribir(ruta, obj):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


FLAGS = {"AvisoPrestamoEnviado", "PagoFallidoPendiente", "DesembolsoFallidoPendiente"}
CALCULADOS_ENTEROS = {"NumeroCuotas", "PeriodoEnCobro", "DiasDeMora", "DiasCausados", "DiasDeCastigo"}
PREFIJO = {"natillera": "CONT-001", "participacion": "CONT-002", "credito": "CONT-003", "obligacion": "CONT-004",
           "actividad": "CONT-005"}


def clase(cd, derivados):
    n = cd["name"]
    if n in derivados:
        return "DERIVED"
    if cd["initialization"] == "Parameter":
        return "INPUT"
    if cd["category"] == "Status":
        return "STATE"
    if cd["dataType"] == "Date":
        return "TEMPORAL"
    if n in FLAGS:
        return "FLAG"
    if cd["dataType"] == "Integer" and n not in CALCULADOS_ENTEROS:
        return "COUNTER"
    return "COMPUTED"


def pasos(steps):
    for s in steps:
        yield s
        if s.get("type") == "Condicional":
            yield from pasos([s["then"]] + ([s["else"]] if "else" in s else []))
        if s.get("type") == "Bloque":
            yield from pasos(s["steps"])


def tipo_de_expresion(cd, kind, tpl):
    """El tipo del catálogo con que se calcula el concepto: la raíz de la expresión del primer paso que lo escribe."""
    if kind in ("INPUT", "DERIVED"):
        return "Parameter"
    if kind == "COUNTER":
        return "Increment"
    for f in tpl["functions"]:
        for s in pasos(f["steps"]):
            if s.get("concept") == cd["name"] and "expression" in s:
                return s["expression"]["type"]
    return "Constant"


def cem():
    escribir(os.path.join(SESION, "cem", "expresiones.json"),
             {"$comment": "Fórmulas con nombre del CEM. Las genera generator/natillera.py y son LITERALES las que van en los "
                          "templates; las prueba Natillera2ExpressionTests con oráculo a mano.",
              "formulas": FORMULAS})
    topo_path = os.path.join(SESION, "ecosystem-topology.json")
    topo = json.load(open(topo_path, encoding="utf-8"))
    plantillas = {t["name"]: t for t in (p() for p in PRODUCTOS)}
    for c in topo["contracts"]:
        cds = plantillas[SLUG[c["id"]]]["conceptDefinitions"]
        nombres = {x["name"] for x in cds}
        derivados = {}
        for b in topo["bridges"]:
            if b["target"]["contract"] == c["id"]:
                for prm in b["target"]["params"]:
                    if prm in nombres and prm not in ("CurrentDate",):
                        derivados.setdefault(prm, b["id"])
        c["concepts"] = []
        for cd in cds:
            k = clase(cd, derivados)
            fila = {"name": cd["name"], "kind": k, "dataType": cd["dataType"],
                    "expression_type": tipo_de_expresion(cd, k, plantillas[SLUG[c["id"]]])}
            if k == "DERIVED":
                fila["source_bridge"] = derivados[cd["name"]]
            formula = next((f for f in FORMULAS if PREFIJO[f.split(".")[0]] == c["id"] and f.split(".", 1)[1] == cd["name"]), None)
            if formula:
                fila["formula"] = formula
            c["concepts"].append(fila)
    open(topo_path, "w", encoding="utf-8").write(json.dumps(topo, ensure_ascii=False, indent=2))
    print("cem:", len(FORMULAS), "fórmulas ·", sum(len(c["concepts"]) for c in topo["contracts"]), "conceptos en la topología")


# ═══════════════════════════════ TGP: reglas declarativas ═══════════════════════════════
# payload del evento → parámetro del trigger destino, cuando el nombre no coincide (sin mayúsculas).
ALIAS = {
    "BRG-004": {"monto": "MontoAporte"}, "BRG-005": {"monto": "MontoAporte"},
    "BRG-007": {"monto": "MontoReembolso"}, "BRG-011": {"monto": "MontoPagado"},
    "BRG-014": {"valor": "ValorObligacion"}, "BRG-015": {"valor": "ValorActividad"},
    "BRG-016": {"valor": "MontoRecaudo"}, "BRG-017": {"montoCobrado": "MontoIngreso"},
    "BRG-018": {"deudaObligacion": "DeltaDeudaActividades"}, "BRG-019": {"castigoDelDia": "DeltaDeudaActividades"},
    "BRG-020": {"deudaSaldada": "MontoSaldado"},
    "BRG-021": {"monto": "MontoPremio"}, "BRG-022": {"monto": "MontoPremio"},
}


def payload_de(tpl, evento):
    claves = set()
    for f in tpl["functions"]:
        for s in pasos(f["steps"]):
            if s.get("type") == "EmitirEvento" and s["eventType"] == evento:
                claves |= set(s["payload"])
    return claves


def reglas(topo, plantillas):
    out = []
    for b in topo["bridges"]:
        src, tgt = SLUG[b["source"]["contract"]], SLUG[b["target"]["contract"]]
        payload = payload_de(plantillas[src], b["source"]["event"])
        assert payload, f"{b['id']}: {src} no emite {b['source']['event']}"
        alias = ALIAS.get(b["id"], {})
        mapeo = {}
        for prm in b["target"]["params"]:
            clave = next((k for k, v in alias.items() if v == prm), None) or next(
                (k for k in payload if k.lower() == prm.lower()), None)
            assert clave in payload, f"{b['id']}: el payload de {b['source']['event']} no trae '{prm}' ({sorted(payload)})"
            mapeo[clave] = prm
        for k in b["resolution"].get("match", {}).values():
            assert k in payload, f"{b['id']}: la llave '{k}' no viaja en {b['source']['event']}"
        for k in b["resolution"].get("identity", []):
            assert k in payload, f"{b['id']}: la identidad '{k}' no viaja en {b['source']['event']}"
        sub = {"sourceTemplate": src, "sourceEvent": b["source"]["event"], "targetTemplate": tgt}
        if b["resolution"]["mode"] != "create":
            sub["targetTrigger"] = b["target"]["trigger"]
        sub["resolution"] = b["resolution"]
        sub["parameterMapping"] = dict(sorted(mapeo.items()))
        nombre = f"integracion-natillera-{b['name']}"
        out.append((b, {"name": nombre, "description": f"{b['id']} ({b['type']}, regla {b['resolution']['mode']}) — {b['notes']} "
                                                     f"Regla {src} -> {tgt} de {ECOSISTEMA}.",
                        "version": VERSION, "contractType": "integration", "subscriptions": [sub]}))
    return out


def api_open_payments():
    """La API del tenant con la que hablan las llamadas. La URL y la credencial las pone el tenant al instalarla. El mock
    REPITE el monto pedido (RespondedorMock: `{{campo}}` dentro de un cuerpo de TEXTO que contiene JSON, para que el
    número vuelva como número): así un pago confirma exactamente lo que se pidió, como el riel real."""
    def op(id_, nombre, ruta, cuerpo):
        return {"id": id_, "nombre": nombre, "metodo": "POST", "ruta": ruta, "timeoutSegundos": 30,
                "mock": {"respuestas": [{"status": 200, "cuerpo": cuerpo}]}}
    return {
        "id": API, "nombre": "Open Payments (riel de la natillera)", "proveedor": "interledger-open-payments",
        "urlBase": "https://natillera-bff.example/open-payments",
        "auth": {"esquema": "header", "nombreHeader": "X-Api-Key"},
        "headers": {"Accept": "application/json"},
        "gobierno": {"costoPorConsulta": 0, "moneda": "COP", "reintentosSegundos": [2, 10, 60],
                     "enfermaTrasFallosConsecutivos": 5, "zonaHoraria": "America/Bogota"},
        "datos": {"retenerRespuestaCruda": False, "retencionDias": 0, "pii": True},
        "operaciones": [
            op("cobrar-cuota", "Cobrar la cuota del periodo con el grant recurrente del participante",
               "/cobrar-cuota", '{"estado":"completado","monto":{{monto}},"periodo":{{periodo}}}'),
            op("cobrar", "Cobrar con el grant recurrente del participante (deuda + mora, obligaciones de actividades)",
               "/cobrar", '{"estado":"completado","monto":{{monto}}}'),
            op("pagar", "Pagar desde la cuenta de la natillera a una billetera (outgoing payment)",
               "/pagar", '{"estado":"completado","monto":{{monto}}}'),
            op("desembolsar", "Desembolsar un préstamo de la financiera a la billetera del participante",
               "/desembolsar", '{"estado":"completado","monto":{{monto}}}'),
        ],
    }


def tgp():
    topo_path = os.path.join(SESION, "ecosystem-topology.json")
    topo = json.load(open(topo_path, encoding="utf-8"))
    plantillas = {t["name"]: t for t in (p() for p in PRODUCTOS)}
    carpeta = os.path.join(SESION, "templates")
    os.makedirs(carpeta, exist_ok=True)
    for f in os.listdir(carpeta):
        if f.endswith(".json"):
            os.remove(os.path.join(carpeta, f))
    generados = []
    for nombre, t in plantillas.items():
        escribir(os.path.join(carpeta, nombre + ".json"), t)
        generados.append(nombre)
    for b, regla in reglas(topo, plantillas):
        escribir(os.path.join(carpeta, regla["name"] + ".json"), regla)
        b["integration_template"] = regla["name"]
        generados.append(regla["name"])
    escribir(os.path.join(SESION, "apis", "open-payments.api.json"), api_open_payments())
    base = "discovery/sessions/FND-20261015-natillera-2/templates/"
    promovido = os.path.isdir(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(SESION))),
                                           "dotnet-backend", "product-templates", "natillera"))
    for c in topo["contracts"]:   # tras la promoción, la topología apunta a lo desplegado (ver promover())
        c["template_path"] = (f"dotnet-backend/product-templates/natillera/{SLUG[c['id']]}.json" if promovido
                              else base + SLUG[c["id"]] + ".json")
    if promovido:
        for b in topo["bridges"]:
            b["integration_template"] = "natillera/" + b["integration_template"]
    topo["implementation"]["templates_generated"] = [base + n + ".json" for n in sorted(generados)]
    open(topo_path, "w", encoding="utf-8").write(json.dumps(topo, ensure_ascii=False, indent=2))
    print("tgp:", len(plantillas), "productos +", len(generados) - len(plantillas), "reglas + apis/open-payments.api.json")


def promover():
    """Deja dotnet-backend/product-templates/natillera/ igual, BYTE A BYTE, a templates/ (la sesión es la fuente de
    verdad) y apunta la topología a lo desplegado: template_path de cada contrato e integration_template de cada regla
    (relativo a product-templates/, sin extensión, como lo resuelve la vitrina). Borra de la carpeta desplegada los .json
    que ya no pertenezcan al ecosistema. Después: FndValidator promote-check --write, score, verify-freshness."""
    repo = os.path.dirname(os.path.dirname(os.path.dirname(SESION)))
    twin = os.path.join(SESION, "templates")
    destino = os.path.join(repo, "dotnet-backend", "product-templates", "natillera")
    os.makedirs(destino, exist_ok=True)
    nombres = sorted(f for f in os.listdir(twin) if f.endswith(".json"))
    for f in os.listdir(destino):
        if f.endswith(".json") and f not in nombres:
            os.remove(os.path.join(destino, f))
    for f in nombres:
        with open(os.path.join(twin, f), "rb") as a, open(os.path.join(destino, f), "wb") as b:
            b.write(a.read())
    topo_path = os.path.join(SESION, "ecosystem-topology.json")
    topo = json.load(open(topo_path, encoding="utf-8"))
    for c in topo["contracts"]:
        c["template_path"] = f"dotnet-backend/product-templates/natillera/{SLUG[c['id']]}.json"
    for b in topo["bridges"]:
        b["integration_template"] = "natillera/" + b["integration_template"].split("/")[-1]
    topo["implementation"]["promotion_record_path"] = "discovery/sessions/FND-20261015-natillera-2/promotion-record.json"
    open(topo_path, "w", encoding="utf-8").write(json.dumps(topo, ensure_ascii=False, indent=2))
    print("promover:", len(nombres), "templates → dotnet-backend/product-templates/natillera/ (byte a byte)")


if __name__ == "__main__":
    {"cem": cem, "tgp": tgp, "promover": promover}[sys.argv[1]]()
