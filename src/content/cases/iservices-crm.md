---
caseSlug: "iservices-crm"
title: "SaaS CRM iServices — Agenda de citas (CRM → ERP modular)"
summary: "Plataforma SSR en Astro con Supabase (Auth, RLS, Realtime) para gestionar clientes y agenda de citas; roadmap hacia ERP modular."
type: "SaaS/CRM"
year: "2025–2026"
status: "En curso"
role: "Arquitectura + Full Stack (Web) — Front SSR, seguridad, diseño modular y contrato Supabase"
stack:
  - "Astro SSR (output: server)"
  - "TypeScript"
  - "Tailwind CSS v4"
  - "Supabase (@supabase/ssr + supabase-js)"
  - "PostgreSQL"
  - "Realtime"
tags:
  - "SaaS"
  - "Supabase"
  - "RLS"
  - "Realtime"
cover: "/projects/iservices-crm/thumb.png"
links:
  demo: null
  repo: null
  docs: null
---

## Contexto

**SaaS CRM iServices** es una plataforma para negocios de servicios, enfocada actualmente en:
- gestión de clientes,
- gestión de citas/agenda,
- y un flujo operativo para la atención diaria.

Visión: evolucionar hacia un **ERP modular** con CRM integrado.

## Problema

En negocios de atención presencial, el día a día depende de:
- una agenda fiable (sin solapes, estados claros),
- datos consistentes por negocio (multi-tenant),
- y un panel admin rápido que no se rompa con permisos/roles.

## Solución

Aplicación web SSR en Astro (`output: "server"`) con Tailwind v4 y Supabase para:
- Auth email/password,
- middleware que protege rutas `/admin/*`,
- datos en PostgreSQL con RLS,
- y Realtime para sincronizar la agenda.

## Arquitectura

### Rutas principales
- `src/pages/admin/citas.astro`: panel de citas (lista/calendario, detalle, alta manual, realtime).
- `src/pages/admin/config.astro`: configuración completa del negocio.
- `src/pages/admin/global.astro`: configuración global compartida (schema `core`).
- `src/pages/admin/backoffice.astro` + `/permisos`: alta de usuarios y edición de permisos (RPC).
- Wizard público: `src/pages/[slug]/reserva.astro` + `/ok`.
- iMenu integrado en el mismo "shell" admin: `/admin/imenu` y rutas públicas `/[slug]/menu`.

### Estructura modular
- Shell/layout admin: `src/modules/core/admin/layouts/AdminLayout.astro`.
- Sidebar: `src/modules/core/admin/components/Sidebar.astro`.
- iCalendar admin: `src/modules/icalendar/admin/components/*`.
- iMenu: `src/modules/imenu/*` (admin + público).

### Seguridad y permisos
- `src/middleware.ts` protege `/admin/*` con `supabase.auth.getUser()`.
- Backoffice restringido por `BACKOFFICE_ALLOWED_EMAIL` (server-side).
- RPCs de monitor/permisos con `SECURITY DEFINER` y `GRANT EXECUTE`.

### Datos (Supabase)
- Auth: login admin email/password.
- Realtime: `iCalendar.Citas` incluida en publicación realtime y RLS permite ver cambios por `perfil_id`.
- Nota operativa: schema `core` debe estar expuesto en API; si no, fallan acciones como `/admin/global`.

## Features clave

- **Agenda en tiempo real**: Realtime en citas para mantener panel sincronizado.
- **Backoffice**:
  - alta de usuarios (Auth + cuenta + servicios/perfiles) vía RPC,
  - monitor y permisos globales (listar memberships / actualizar permisos).
- **Slug compartido** (iServices): estrategia para resolver `slug` global entre iCalendar + iMenu con fallbacks y RPC de resolución.

## Retos y decisiones

- Mantener un "contrato" estable entre frontend y Supabase (tablas, vistas públicas, RPCs) sin romper la app.
- Seguridad real:
  - RLS bien definida,
  - rutas admin cerradas por middleware,
  - operaciones sensibles encapsuladas en RPC con `SECURITY DEFINER`.
- Multi-servicio dentro del mismo producto (agenda + iMenu) sin duplicar shell ni auth.

## Estado actual

- Gestión de clientes.
- Gestión de citas/agenda.
- Menú operativo para flujo comercial/atención.

## Roadmap (hacia ERP modular)

- Gastos e ingresos.
- RRHH / Nóminas.
- Facturación a clientes (emisión y envío).
- Módulos administrativos adicionales.

## Aprendizajes

- El SSR con Supabase requiere disciplina: separar cliente server/browser y controlar bien cookies/sesión.
- Realtime aporta mucho valor en agenda, pero exige RLS y publicación bien alineadas.

## Próximos pasos

- Completar gating visual por servicios contratados (ya preparado pero no conectado en UI).
- Mejorar analítica de agenda (no-shows, tasa de confirmación, carga por recurso).
- Endurecer observabilidad (logs y auditoría de acciones sensibles).

## Galería

> TODO: capturas del panel de citas, backoffice, wizard de reserva, panel iMenu.
