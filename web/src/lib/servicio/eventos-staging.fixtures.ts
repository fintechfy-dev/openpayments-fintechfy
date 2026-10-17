// Eventos reales de staging del 16 oct (contratos «Prueba web #53»), recortados: el Initialized
// trae solo 4 de sus cambios y el actorId es ficticio. Ver web/INTEGRACION.md.

export const EVENTOS_PARTICIPACION = {
  "contractId": "30acc57f-279e-4024-9e38-d4e01fe9e429",
  "templateName": "natillera-participacion",
  "totalEvents": 4,
  "events": [
    {
      "sequenceNumber": 1,
      "occurredAt": "2026-10-16T22:14:51.7482907Z",
      "type": "Initialized",
      "functionName": null,
      "trigger": "CreacionCredito",
      "changes": [
        {
          "concept": "GrantId",
          "previousValue": null,
          "newValue": ""
        },
        {
          "concept": "ParteNeta",
          "previousValue": null,
          "newValue": "$0,00"
        },
        {
          "concept": "DiasDeMora",
          "previousValue": null,
          "newValue": "0"
        },
        {
          "concept": "ParteFinal",
          "previousValue": null,
          "newValue": "$0,00"
        }
      ],
      "parameters": {
        "ValorCuota": "{\"type\": \"Currency\", \"value\": 50000}",
        "FechaInicio": "{\"type\": \"Date\", \"value\": \"2026-11-01T00:00:00.0000000\"}",
        "NatilleraId": "{\"type\": \"Text\", \"value\": \"prueba-web-53-a\"}",
        "NumeroCuotas": "{\"type\": \"Integer\", \"value\": 6}",
        "ParticipanteId": "{\"type\": \"Text\", \"value\": \"prueba-telegram-1\"}",
        "ParticipacionId": "{\"type\": \"Text\", \"value\": \"prueba-web-53-a-p1\"}",
        "MultiploPrestamo": "{\"type\": \"Integer\", \"value\": 3}",
        "PagosParaPrestamo": "{\"type\": \"Integer\", \"value\": 2}",
        "WalletParticipante": "{\"type\": \"Text\", \"value\": \"https://ilp.interledger-test.dev/prueba-web-53\"}",
        "PorcentajeMoraDiaria": "{\"type\": \"Percentage\", \"value\": 0.01}"
      },
      "correlationId": "d76dd6d7-7072-41a9-87d0-91551fd76631",
      "actorId": "user_prueba"
    },
    {
      "sequenceNumber": 2,
      "occurredAt": "2026-10-16T22:33:52.3823415Z",
      "type": "StateChanged",
      "functionName": "ConfirmarAutorizacion",
      "trigger": "ConfirmarAutorizacion",
      "changes": [
        {
          "concept": "GrantId",
          "previousValue": "",
          "newValue": "grant-prueba-web-53"
        },
        {
          "concept": "EstadoParticipacion",
          "previousValue": "0",
          "newValue": "1"
        }
      ],
      "parameters": {
        "GrantId": "{\"type\": \"Text\", \"value\": \"grant-prueba-web-53\"}",
        "PermisoAprobado": "{\"type\": \"Integer\", \"value\": 1}",
        "BilleteraVerificada": "{\"type\": \"Integer\", \"value\": 1}"
      },
      "correlationId": "05fb2282-3339-4120-b8d8-afaa12841893",
      "actorId": "user_prueba"
    },
    {
      "sequenceNumber": 3,
      "occurredAt": "2026-10-16T22:34:21.7844947Z",
      "type": "StateChanged",
      "functionName": "CobrarCuota",
      "trigger": "CobrarCuota",
      "changes": [
        {
          "concept": "PeriodoEnCobro",
          "previousValue": "0",
          "newValue": "1"
        },
        {
          "concept": "PeriodosSolicitados",
          "previousValue": "0",
          "newValue": "1"
        }
      ],
      "parameters": {
        "Periodo": "{\"type\": \"Integer\", \"value\": 1}"
      },
      "correlationId": "04d4407f-ccc5-41f9-b608-49c888b4f77e",
      "actorId": "user_prueba"
    },
    {
      "sequenceNumber": 4,
      "occurredAt": "2026-10-16T22:34:24.0000763Z",
      "type": "StateChanged",
      "functionName": "PrimeraCuotaCobrada",
      "trigger": "CuotaCobrada",
      "changes": [
        {
          "concept": "EstadoParticipacion",
          "previousValue": "1",
          "newValue": "2"
        },
        {
          "concept": "TotalAportado",
          "previousValue": "$0,00",
          "newValue": "$50.000,00"
        },
        {
          "concept": "CuotasPagadas",
          "previousValue": "0",
          "newValue": "1"
        }
      ],
      "parameters": {
        "Periodo": "{\"type\": \"Integer\", \"value\": 1}",
        "CurrentDate": "{\"type\": \"Date\", \"value\": \"2026-10-16T00:00:00.0000000Z\"}",
        "MontoCobrado": "{\"type\": \"Currency\", \"value\": 50000}"
      },
      "correlationId": "04d4407f-ccc5-41f9-b608-49c888b4f77e",
      "actorId": null
    }
  ]
} as const;

export const EVENTOS_CUENTA = {
  "contractId": "0650899a-5af5-46ee-bc3b-0f21da6fce9e",
  "templateName": "natillera-cuenta",
  "totalEvents": 2,
  "events": [
    {
      "sequenceNumber": 1,
      "occurredAt": "2026-10-16T22:14:23.2363768Z",
      "type": "Initialized",
      "functionName": null,
      "trigger": "CreacionCredito",
      "changes": [
        {
          "concept": "Moneda",
          "previousValue": null,
          "newValue": "COP"
        },
        {
          "concept": "Residuo",
          "previousValue": null,
          "newValue": "$0,00"
        },
        {
          "concept": "CupoMinimo",
          "previousValue": null,
          "newValue": "2"
        },
        {
          "concept": "FechaFinal",
          "previousValue": null,
          "newValue": "2027-04-01"
        }
      ],
      "parameters": {
        "CupoMinimo": "{\"type\": \"Integer\", \"value\": 2}",
        "FechaFinal": "{\"type\": \"Date\", \"value\": \"2027-04-01T00:00:00.0000000\"}",
        "ValorCuota": "{\"type\": \"Currency\", \"value\": 50000}",
        "FechaInicio": "{\"type\": \"Date\", \"value\": \"2026-11-01T00:00:00.0000000\"}",
        "NatilleraId": "{\"type\": \"Text\", \"value\": \"prueba-web-53-a\"}",
        "DiasEsperaCupo": "{\"type\": \"Integer\", \"value\": 5}",
        "NombreNatillera": "{\"type\": \"Text\", \"value\": \"Prueba web #53\"}",
        "MultiploPrestamo": "{\"type\": \"Integer\", \"value\": 3}",
        "PagosParaPrestamo": "{\"type\": \"Integer\", \"value\": 2}",
        "PeriodicidadMeses": "{\"type\": \"Integer\", \"value\": 1}",
        "PorcentajeMoraDiaria": "{\"type\": \"Percentage\", \"value\": 0.01}"
      },
      "correlationId": "6e91593c-dd03-4de2-bd49-f0451ba9ebc5",
      "actorId": "user_prueba"
    },
    {
      "sequenceNumber": 2,
      "occurredAt": "2026-10-16T22:33:52.5429947Z",
      "type": "StateChanged",
      "functionName": "RegistrarValidado",
      "trigger": "RegistrarValidado",
      "changes": [
        {
          "concept": "ParticipantesValidados",
          "previousValue": "0",
          "newValue": "1"
        }
      ],
      "parameters": {
        "CurrentDate": "{\"type\": \"Date\", \"value\": \"2026-10-16T00:00:00.0000000Z\"}",
        "ParticipacionId": "{\"type\": \"Text\", \"value\": \"prueba-web-53-a-p1\"}"
      },
      "correlationId": "05fb2282-3339-4120-b8d8-afaa12841893",
      "actorId": "user_prueba"
    }
  ]
} as const;
