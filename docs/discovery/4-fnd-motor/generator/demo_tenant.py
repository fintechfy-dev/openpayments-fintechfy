"""Demo: el ciclo completo de Natillera 2.0 en un tenant, por la API real del motor (Redpanda, router, integrador).

Montaje local (control-tower/README.md): Control Plane API :5210 (perfil http) y motor :5110 (perfil «http (multi-tenant)»);
tenant aprovisionado (POST :5210/api/tenants) y el ecosistema instalado (POST :5210/api/tenants/{t}/ecosystems/
FND-20261015-natillera-2/install). Los programados se fuerzan con la fecha del escenario: el canal control plane es
admin-equivalente y puede disparar triggers privados. La llave es la de desarrollo de launchSettings, no un secreto.

Uso: python demo_tenant.py   (tenant y motor arriba; NATILLERA_TENANT para otro tenant)
"""
import json
import sys
import time
import urllib.request
import uuid

MOTOR = "http://localhost:5110"
import os
H = {"X-Control-Plane-Key": "dev-torre-motor-local", "X-Tenant-Id": os.environ.get("NATILLERA_TENANT", "natillera-demo"),
     "Content-Type": "application/json"}
SUF = uuid.uuid4().hex[:6]
NAT = f"NAT-DEMO-{SUF}"


def req(metodo, ruta, cuerpo=None):
    r = urllib.request.Request(MOTOR + ruta, method=metodo, headers=H,
                               data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:600]


def V(t, v): return {"type": t, "value": v}


def crear(template, params, fecha="2026-10-15"):
    params = dict(params, CurrentDate=V("date", fecha))
    st, b = req("POST", "/api/contracts", {"templateName": template, "parameters": params})
    assert st == 201, (template, st, b)
    return b["contractId"]


def disparar(cid, trigger, params=None, fecha=None):
    p = dict(params or {})
    if fecha:
        p["CurrentDate"] = V("date", fecha)
    st, b = req("POST", f"/api/contracts/{cid}/triggers", {"trigger": trigger, "parameters": p})
    if st != 200:
        raise SystemExit(f"{trigger}: HTTP {st} {b}")
    corrio = [r["functionName"] for r in b["results"]
              if not (r["preconditionFailed"] or r["requiredStateFailed"] or r.get("hasInvalidTransition"))]
    if not corrio:
        raise SystemExit(f"{trigger} rechazado: " + " | ".join(
            str(r.get("failedPrecondition") or r.get("failedStateRequirement") or r.get("invalidTransitionError")) for r in b["results"]))
    return corrio


def estado(cid):
    st, b = req("GET", f"/api/contracts/{cid}")
    return b["currentState"]


def esperar(desc, cid, pred, seg=90):
    t0 = time.time()
    while time.time() - t0 < seg:
        s = estado(cid)
        if pred(s):
            print(f"  ✔ {desc} ({time.time() - t0:.1f}s)")
            return s
        time.sleep(1)
    raise SystemExit(f"  ✘ {desc}: no ocurrió en {seg}s · estado: " + json.dumps(s, ensure_ascii=False)[:900])


def num(s, c):
    raw = s[c]
    return float(raw.replace("$", "").replace("%", "").replace(".", "").replace(",", ".").strip())


print(f"Natillera {NAT} en el tenant natillera-demo")
nat = crear("natillera-cuenta", {
    "NatilleraId": V("text", NAT), "NombreNatillera": V("text", "Natillera Los Primos (demo)"), "ValorCuota": V("currency", 100000),
    "FechaInicio": V("date", "2026-11-01"), "FechaFinal": V("date", "2026-12-20"), "PeriodicidadMeses": V("integer", 1),
    "CupoMinimo": V("integer", 3), "PorcentajeMoraDiaria": V("percentage", 0.01), "DiasEsperaCupo": V("integer", 5),
    "PagosParaPrestamo": V("integer", 1), "MultiploPrestamo": V("integer", 2)})
print("  natillera creada:", nat, "· cuotas:", estado(nat)["NumeroCuotas"])

pars = []
for i, nombre in enumerate(["ana", "beto", "caro"], 1):
    pid = crear("natillera-participacion", {
        "ParticipacionId": V("text", f"PAR-{SUF}-{i}"), "NatilleraId": V("text", NAT), "ParticipanteId": V("text", f"PER-{nombre}"),
        "WalletParticipante": V("text", f"https://ilp.interledger-test.dev/natillera-{nombre}"), "ValorCuota": V("currency", 100000),
        "NumeroCuotas": V("integer", 2), "PorcentajeMoraDiaria": V("percentage", 0.01), "PagosParaPrestamo": V("integer", 1),
        "MultiploPrestamo": V("integer", 2), "FechaInicio": V("date", "2026-11-01")})
    disparar(pid, "ConfirmarAutorizacion", {"PermisoAprobado": V("integer", 1), "BilleteraVerificada": V("integer", 1),
                                            "GrantId": V("text", f"grant-{nombre}")}, "2026-10-15")
    pars.append(pid)
print("  3 participaciones con permiso de pago aprobado")
esperar("BRG-001: la natillera cuenta 3 validados", nat, lambda s: s["ParticipantesValidados"] == "3")

print("1 nov · Iniciar (programado, forzado con la fecha del escenario)")
disparar(nat, "Iniciar", fecha="2026-11-01")
esperar("cobro de la 1.ª cuota por el riel (mock) → natillera ACTIVA con $300.000", nat,
        lambda s: s["EstadoNatillera"] == "2" and num(s, "SaldoNatillera") == 300000)

print("1 dic · AbrirPeriodo")
disparar(nat, "AbrirPeriodo", fecha="2026-12-01")
esperar("cobro de la 2.ª cuota → $600.000", nat, lambda s: num(s, "SaldoNatillera") == 600000)

print("20 dic · IniciarLiquidacion")
disparar(nat, "IniciarLiquidacion", fecha="2026-12-20")
s = esperar("dos rondas, pagos por el riel y cierre: natillera CERRADA en $0", nat,
            lambda s: s["EstadoNatillera"] == "5" and num(s, "SaldoNatillera") == 0, seg=150)
for i, pid in enumerate(pars, 1):
    e = estado(pid)
    print(f"  participación {i}: estado {e['EstadoParticipacion']} (6 = LIQUIDADA) · parte final {e['ParteFinal']} · aportó {e['TotalAportado']}")
print("  natillera:", {k: s[k] for k in ("EstadoNatillera", "SaldoNatillera", "PartesReportadas", "PagosLiquidacion", "FechaCierre")})
print("CICLO COMPLETO OK")
