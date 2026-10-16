# Fuentes y límites de evidencia

> Modo: escritorio · Lectura: 2026-10-14 · Sin sistema construido, sin usuarios y sin validación externa.

## Registro de fuentes

| ID | Fuente | Uso |
|---|---|---|
| F-00 | Mensaje del usuario de 2026-10-14, transcrito en [encargo.md](encargo.md) | Intención y frameworks solicitados |
| F-01 | `C:\Users\WILLI\Downloads\Natillera 2.pdf` — «NATILLERA 2.0 · Prototipo», 4 páginas | Orígenes, propuesta, políticas, mecánica, estados y actores de la iniciativa |

| F-02 | https://interledger.org/es/hackathon/2026-hackathon-medellin/ — aportada por el usuario en P-06; leída 2026-10-14 | Fechas, sede, premios y enlaces del evento |
| F-03 | https://interledger.org/es/hackathon/submission-judging/ | Criterios de evaluación, entregables y proceso de pitch |
| F-04 | https://interledger.org/es/hackathon/2026-timetable/ | Cronograma y horas de construcción |
| F-05 | https://interledger.org/es/hackathon/participation/ y https://interledger.org/es/hackathon/ai-policy/ | Tamaño de equipo, regla de código y obligaciones de uso de IA |
| F-06 | https://interledger.org/es/hackathon/open-payments/ | Herramientas: Test Wallet, SDK de Node.js, documentación en openpayments.dev |

El PDF no se copió al repositorio; vive en la carpeta de descargas del usuario y no está versionado. Este registro resume su contenido para que la sesión pueda reanudarse sin él, pero la fuente manda ante cualquier diferencia.

## Lo que el documento establece

| ID | Tema | Lo que dice F-01 |
|---|---|---|
| E-01 | Problema de origen | En la natillera tradicional un organizador del grupo guarda el dinero; hubo casos de autopréstamo o robo, y préstamos entre integrantes que no se pagaban. Hoy hay desconfianza y estas natilleras son menos frecuentes. |
| E-02 | Antecedentes | Natilleras de empresa (resuelven en parte la custodia, con trabas legales para el dinero de actividades; se usan fondos de empleados) y «natilleras» bancarias (cuenta de ahorros con entrega en diciembre y algo más de interés). |
| E-03 | Propuesta | Mantener la familiaridad y el entusiasmo de la natillera original quitando el riesgo a los participantes. |
| E-04 | Custodia | El dinero lo controla y maneja una empresa financiera, en una «cuenta en árbol»: aportes identificados por persona que suman una cuenta de la natillera. |
| E-05 | Creación | Cualquier persona puede crear una natillera; en su enrolamiento se le hace un análisis de identidad y de situación financiera «similar a un crédito pequeño». |
| E-06 | Parámetros | Nombre único, periodicidad, valor de cuota (con mínimos y máximos del sistema), porcentaje de mora diario, fecha de inicio (máximo en un mes), fecha final (máximo en un año) y tipo de moneda digital. |
| E-07 | Billetera de la natillera | El sistema crea una billetera digital a nombre de la financiera; el creador no tiene acceso directo, solo recibe su identificador. Estado de la natillera: «Creada». |
| E-08 | Invitación | El administrador invita por correo o celular; el invitado acepta o rechaza y la respuesta llega al administrador. |
| E-09 | Validación del participante | Datos personales e identificador de una billetera propia con saldo mínimo de 1, que el sistema debita y acredita para validarla. Estado: «Validado». Se crea en el motor financiero una cuenta de pago periódico y el participante autoriza el débito con esa periodicidad. |
| E-10 | Arranque | Con N validados la natillera pasa a «Iniciada»; si N pagan la primera cuota pasa a «Activa» y ellos a «Activo». Si a los N días del primer pago no se alcanza el cupo mínimo, se devuelve lo aportado y natillera y participantes pasan a «Cerrada»/«Cerrado». |
| E-11 | Actividades especiales | Solo con la natillera «Activa». En esta versión se registran con nombre, fechas (inicio máximo a un periodo, fin máximo al cierre de la natillera), valor por participante, valor de premio (de 0 hasta menos que valor × participantes) y castigo de mora diario. El motor crea a cada participante una cuenta por pagar. El control de rifas, ventas o juegos queda para el futuro. |
| E-12 | Cobro de cuotas y mora | El día de pago se debita; sin fondos, el participante pasa a «Mora», recibe recordatorios diarios con el valor más la mora, y cuando tiene el dinero lo avisa por Telegram para que el sistema cobre y lo regrese a «Activo». |
| E-13 | Cobro de actividades | Se notifica el día de pago y el participante da permiso para el débito; sin fondos queda en «alerta» en esa actividad con recordatorios diarios. |
| E-14 | Premios | El administrador indica el ganador, se notifica a todos y se paga a su billetera, nunca por encima de lo recaudado; si falta recaudo, se entrega el 100 % de lo recaudado y el resto cuando paguen los deudores. |
| E-15 | Préstamos | Tras Y pagos se habilita la solicitud. Los otorga la financiera (no la natillera), hasta N × valor de cuota, a tasa comercial, con solicitud y pago aparte; cláusula para cobrar del fondo de la natillera en la liquidación si no paga. Cobranza intensificada en el último periodo. |
| E-16 | Liquidación | Valor estimado = cuotas + actividades − premios; se toma el mayor entre estimado y real y se divide por participantes; a cada uno se descuentan actividades pendientes con mora, cuotas en mora con mora (hasta 0) y deuda con la financiera (hasta 0); el saldo va a su billetera; se traslada valor a la financiera. Natillera «Cerrado», participantes «liquidados». |

## Lo que establece la hackathon

Lectura de las páginas oficiales el 2026-10-14. Si cambian, mandan las páginas.

| ID | Tema | Lo que dicen F-02 a F-06 |
|---|---|---|
| H-01 | Fechas y sede | Hackatón de Open Payments, Medellín, presencial en RutaN, 16 y 17 de octubre de 2026. Asistencia en persona los dos días completos. |
| H-02 | Tiempo de construcción | Viernes 10:30–14:00 y 15:00–17:30; sábado 08:00–11:00. Son 9 horas en total. Entrega con cierre de código a las 11:00 del sábado. |
| H-03 | Regla de código | «Todo el código debe desarrollarse dentro de los dos días del hackatón.» La política de IA no menciona especificaciones ni diseño preparados antes; no los prohíbe ni los autoriza expresamente. |
| H-04 | Equipo | Equipos de 4 a 5 personas. |
| H-05 | Criterios del jurado, sin pesos publicados | Definición del problema · Uso de Open Payments (¿demuestra un flujo de pago que funciona?) · Experiencia del usuario · Calidad técnica (¿funciona de manera confiable?) · Presentación · Inclusión (pagos más fáciles, accesibles o inclusivos para usuarios desatendidos) · Innovación · Impacto. |
| H-06 | Demo obligatoria | Demo práctica con registro del flujo de pago: solicitud de pago, autorización, ejecución y finalización exitosa. |
| H-07 | Entregables | Diapositivas, enlace a la demo y repositorio público de GitHub con todas las ramas integradas a la principal. Por la política de IA: `AI_USAGE.md` en la raíz y los prompts usados. |
| H-08 | Pitch | Ronda 1: 5 minutos entre presentación y demo, ante al menos 2 jueces; pasan 12 equipos. Ronda 2: otros 5 minutos ante un panel con representantes de cada premio. |
| H-09 | Premios | Impacto (RutaN), Inclusión (Puntored), Innovación (FIND EAFIT) y Comunidad (votado por participantes). Un premio por equipo, equivalente a USD 5.000 en COP, repartido entre los integrantes. |
| H-10 | Herramientas | Test Wallet en wallet.interledger-test.dev con KYC y saldo de práctica; SDK `open-payments-node`; autorización con GNAP; documentación en openpayments.dev. |

## Vacíos de la hackathon

| ID | Vacío |
|---|---|
| VH-01 | No se sabe si usar el motor financiero propio, ya construido, cuenta como «código desarrollado antes del evento». Afecta la promesa de «producto propio sobre el motor». Conviene preguntar a hackathon@interledger.org. |
| VH-02 | Las páginas del evento no describen pagos recurrentes ni permisos con intervalo. La hipótesis es que los permisos de pago saliente de Open Payments admiten límites por intervalo, lo que encajaría con el débito periódico de E-09 [por verificar en openpayments.dev]. |
| VH-03 | No se sabe qué moneda o activo trae la Test Wallet; afecta a V-03. |

## Vacíos del documento

Son observaciones de lectura, no decisiones ni preguntas para responder de una vez. Se retomarán en la fase que les corresponda.

| ID | Vacío |
|---|---|
| V-01 | N, X e Y no tienen valor: cupo mínimo de participantes, días de espera del arranque, pagos previos al préstamo y múltiplo del préstamo. |
| V-02 | El documento dice «Prototipo», pero no aclara quién es la financiera, quién opera el sistema ni quién lo construye. |
| V-03 | «Tipo de moneda digital» y «todo se convierte a una moneda digital» no precisan si es una moneda estable, un token propio o pesos en billetera. |
| V-04 | El último paso de la liquidación («se traslada el valor a la financiera») no dice qué valor. La lectura más probable es lo descontado por préstamos impagos [supuesto de lectura], pero el texto no lo afirma. |
| V-05 | Tomar el mayor entre estimado y real cuadra cuando la diferencia son cuotas o actividades impagas, porque luego se descuentan al deudor. Pero si los descuentos de un deudor superan su parte y su saldo se deja en 0, el reparto total puede superar el dinero que existe. Falta la regla para ese faltante. |
| V-06 | No se define qué pasa con la mora cobrada: si engrosa el fondo, se reparte o la retiene la financiera. |
| V-07 | No hay métrica de negocio ni de éxito en el documento. |
