# Regla: revisión de código

La revisión es tan importante como la implementación: es la última oportunidad de ver lo que el jurado verá.

Quien revisa (persona o agente, como `web-revisor`) busca, en este orden:

1. **Secretos y fronteras de seguridad:** llaves en el diff, variables `NEXT_PUBLIC_` con secretos, autorización solo en la UI (la guarda de UI es comodidad, no seguridad; se valida en el servidor).
2. **Huecos:** algo que la historia o el issue pide y el código no hace. Cada cambio debe rastrear a un issue o a una historia (`US-xxx`).
3. **Código inyectado:** lo que nadie pidió (abstracciones, dependencias, "mejoras" fuera de alcance). En una hackathon cada línea extra es riesgo y tiempo.
4. **Dinero y estados:** montos, mora y liquidación coinciden con `docs/discovery/4-logica-financiera/especificacion-funcional.md`; los estados usan el design system (ícono + palabra, mora en naranja).
5. **Responsive y accesibilidad** según la checklist de `natillera-web`.

Severidades, siempre las mismas: 🔴 crítico (secreto, dinero mal calculado, demo rota) · 🟠 alto · 🟡 medio · ⚪ menor. Cada hallazgo lleva `ruta:línea` y cómo falla en la práctica. Los 🔴 y 🟠 se corrigen antes de fusionar; los demás, o se corrigen o quedan anotados en el PR.
