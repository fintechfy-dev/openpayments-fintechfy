# Cómo trabajamos: GitFlow

Todo el trabajo pasa por el repositorio: cada cosa por hacer es un **issue**, cada cambio es una **rama** y todo entra por **pull request**. Nadie sube directo a `main` ni a `develop`: GitHub lo bloquea.

## Las ramas

| Rama | Para qué | Recibe cambios de |
|---|---|---|
| `main` | Lo que se entrega al jurado. Al cierre del sábado tiene todo. | Solo `release/entrega` y `hotfix/*` |
| `develop` | Integración del equipo. Es la rama por defecto. | `feature/*` |
| `feature/<frente>-<issue>-<tema>` | Una historia o tarea. Sale de `develop`. | Tus commits |
| `release/entrega` | Se corta de `develop` el sábado a las 10:30 para la entrega. | Solo arreglos |
| `hotfix/<tema>` | Arreglo urgente sobre `main` después de la release. Sale de `main`. | Tus commits |

Ejemplos de nombre: `feature/telegram-15-crear-natillera`, `feature/pagos-4-servicio-open-payments`, `feature/web-9-lista-natilleras`. Los frentes son `telegram`, `web` y `pagos`.

## El ciclo de un issue

1. **Elige un issue** en [Issues](https://github.com/fintechfy-dev/openpayments-fintechfy/issues) y asígnatelo (*Assignees*). Filtra por tu frente con las etiquetas `frente: telegram`, `frente: web` o `frente: pagos`. Primero lo que tiene `núcleo`.
2. **Crea tu rama desde `develop`:**
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/telegram-15-crear-natillera
   ```
3. **Haz commits pequeños**, con el id de la historia al inicio:
   ```bash
   git add .
   git commit -m "US-001: el bot pide nombre, cuota y fechas de la natillera"
   ```
4. **Súbela** y abre el pull request hacia `develop`:
   ```bash
   git push -u origin feature/telegram-15-crear-natillera
   ```
   En la descripción escribe `Closes #15` para que el issue se cierre solo al fusionar. La plantilla trae la lista de revisión.
5. **Fusiona** cuando la lista esté completa. No se exige aprobación para no frenar al equipo, pero si alguien de otro frente puede mirarlo, mejor. La rama se borra sola al fusionar.

### Traer lo nuevo de `develop` a tu rama

```bash
git fetch
git merge origin/develop
```

Si hay conflictos, resuélvelos en tu rama, nunca en `develop`.

## Reglas que no se negocian

- **Todo el código se escribe durante el evento.** La lógica financiera vive en un servicio externo, como un n8n: no es parte del proyecto y aquí solo va el código que lo llama.
- **Secretos fuera del repo.** Claves de Open Payments, token del bot y llaves de API van en `.env`, que está en `.gitignore`. El repo es público. Si se sube un secreto por error, avisa de inmediato: se rota la clave.
- **Prompts reales en `prompts/`.** Cada vez que uses IA para programar, copia el prompt tal cual en `prompts/<frente>-<tema>.md`. Un resumen no cumple la política de la hackathon.
- **`AI_USAGE.md` al día.** En el mismo PR, agrega a su tabla los archivos que tocaste, con qué herramienta y cuánta IA.
- **Sin `--force` ni `--no-verify`.**

## La entrega del sábado

Lo lleva el issue #11:

1. **10:30:** se congela `develop`. Solo se arregla, no se agrega.
2. Se crea `release/entrega` desde `develop` y se revisan `AI_USAGE.md`, `prompts/` y el README.
3. PR de `release/entrega` a `main`, fusionado **antes de las 11:00**. Después de las 11:00 nadie toca el código.
4. La rama por defecto vuelve a ser `main`, que es lo que ven los jueces.

## Hotfix

Si algo se rompe en `main` después de la release y antes de las 11:00:

```bash
git checkout main
git pull
git checkout -b hotfix/arreglo-cobro
# arreglar, commit, push y PR a main; luego otro PR de main a develop
```
