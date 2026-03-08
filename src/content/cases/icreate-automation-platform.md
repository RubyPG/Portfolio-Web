---
caseSlug: "icreategroup-automation-platform"
title: "iCreate Group — Plataforma de Automatización (n8n-Hub + Supabase + Infra + Email)"
summary: "Hub centralizado para servir múltiples clientes y automatizaciones: Traefik + Docker, n8n como capa de lógica, Supabase como persistencia mínima y email transaccional con SES."
type: "Automatización"
year: "2026"
status: "En curso"
role: "Cofounder / CTO — Arquitectura, infraestructura, seguridad y patrones de workflows"
stack:
  - "n8n"
  - "Supabase (PostgreSQL)"
  - "Docker Compose"
  - "Traefik v2.11"
  - "DigitalOcean (Ubuntu 22.04 LTS)"
  - "Zoho Mail"
  - "Amazon SES + IAM"
tags:
  - "Automation Hub"
  - "Infra"
  - "Multi-tenant"
  - "Deliverability"
cover: "/projects/icreategroup-automation/thumb.png"
links:
  demo: null
  repo: null
  docs: null
---

## Contexto

La plataforma de automatización de iCreate Group está diseñada como un **hub reutilizable** capaz de servir múltiples clientes/proyectos desde un único entorno, separando por identificadores lógicos como `client_code` y `app_slug` (no por infra duplicada).

## Problema

Al escalar automatizaciones, aparecen problemas recurrentes:
- duplicación de infraestructura por cliente,
- superficie de ataque grande (un único backend expuesto),
- persistencia excesiva de estado (difícil de gobernar),
- y mala entregabilidad de correo automatizado.

## Solución

Una arquitectura estándar y repetible:

**Patrón de flujo**:
**Frontend → Webhook → Orquestación (n8n) → Persistencia (Supabase) → Respuesta**

Principios:
- el frontend **no** habla directamente con DB ni servicios internos; toda validación/lógica vive en n8n,
- persistencia **mínima**: solo datos finales de negocio, no el estado completo del workflow,
- observabilidad por `client_code`, `app_slug`, `session_id`.

## Arquitectura

### Separación por subdominios
- **Administración (privado)**: editor n8n restringido (allowlist IP + credenciales).
- **Webhooks (público)**: endpoints de entrada para frontends e integraciones.
- **Frontends (público)**: apps web/app desacopladas del backend.

### Infraestructura
- DigitalOcean droplet (Ubuntu 22.04 LTS).
- Servicios en contenedores con Docker Compose.
- Traefik como reverse proxy y gestión automática de certificados (Let's Encrypt).

### Persistencia genérica (Supabase)
Estrategia: un solo proyecto Supabase, evitando:
- DB por cliente,
- tabla por automatización,
- migraciones constantes.

Modelo de registro genérico (`records` como "tabla clave"):
- `client_code`, `app_slug`, `record_type`, `session_id`, `status`, `payload (json)`.

### Email operativo/transaccional
- Zoho Mail: gestión humana (IMAP/Web).
- Amazon SES: envío automatizado por API desde n8n.
- IAM: usuario dedicado con permisos mínimos.
- DNS: SPF/DKIM/DMARC para entregabilidad.

## Features clave

- Hub multi-tenant lógico por `client_code/app_slug`.
- Aislamiento por subdominio + reverse proxy.
- Patrones de workflows:
  - normalización de inputs,
  - idempotencia con `session_id`,
  - logging estructurado y trazabilidad.
- Deliverability "seria" con SES + autenticación DNS.

## Retos y decisiones

- Equilibrar flexibilidad (payload JSON) con gobierno del dato (estandarizar claves por `record_type`).
- Seguridad mínima viable: secretos fuera del repo, backups, logs y restricción de admin.
- "No persistir por persistir": guardar lo justo para analítica/operación.

## Resultados / impacto

- Infra reutilizable para nuevos proyectos sin rehacer base.
- Menos riesgo operativo (aislamiento + mínimos privilegios).
- Base sólida para escalar automatización + IA + productos.

## Aprendizajes

- n8n funciona mejor como "capa de negocio" si defines un patrón fijo de entrada/salida y trazabilidad.
- El email transaccional requiere diseño DNS/credenciales; si no, tu automatización "no entrega".

## Próximos pasos

- Métricas/alertas (logs Traefik + healthchecks + panel mínimo).
- Plantillas de "record_type" y dashboards de analítica.
- Endurecimiento de seguridad (rotación de secretos, auditoría).

## Galería

> TODO: diagrama (subdominios + flujo), capturas de n8n, ejemplo de record payload.
