@README.md

## Al trabajar en `integracion/`

Esta carpeta es la referencia del servicio externo de lógica financiera (staging): qué expone, sus contratos y acciones, los avisos y las diferencias encontradas contra el discovery. No tiene código: el bot y la web llaman a staging desde su propio servidor (decisión del 16 de octubre, en `docs/arquitectura.md`).

## Qué mantener al día

- **Cada diferencia nueva** entre staging y el discovery: la sección "Diferencias encontradas", con fecha y evidencia (la respuesta HTTP, no la documentación; `.claude/rules/verificar.md`).
- **Si cambia una ruta, un contrato o una acción de staging:** este README y el mapa del frente que la usa (`web/INTEGRACION.md` o `telegram/INTEGRACION.md`).
- **Si cambia quién llama a quién:** el diagrama de "Cómo se conecta todo" aquí y el de `docs/arquitectura.md`, que deben coincidir.
- **Variables nuevas** para hablar con staging: la tabla "Variables" y el `.env.example` de la carpeta que la usa. El token nunca va en el repo.
