---
caseSlug: "icreategroup-web"
title: "iCreate Group — Web corporativa (captación + automatización)"
summary: "Web comercial en Astro con integración de chatbot y formulario conectados a n8n para cualificación de leads y seguimiento."
type: "Web"
year: "2025–2026"
status: "En curso"
role: "Cofounder / CTO — Arquitectura, frontend y automatización de captación"
stack:
  - "Astro"
  - "Tailwind CSS"
  - "React (ChatWidget)"
  - "n8n (webhooks)"
  - "Supabase (leads)"
tags:
  - "Lead Gen"
  - "Chatbot"
  - "Automation"
cover: "/projects/icreategroup-web/thumb.jpg"
coverIframe: "https://icreategroup.net"
links:
  demo: "https://icreategroup.net"
  repo: null
  docs: null
---

## Contexto

iCreate Group es una empresa B2B centrada en digitalización: desarrollo a medida, automatización e integración de IA, con visión SaaS modular.
Esta web funciona como **pieza de captación**: comunica oferta y convierte visitas en contactos cualificados.

## Problema

En una web comercial, el objetivo no es "tener formulario", sino:
- captar leads con contexto suficiente para poder presupuestar,
- asegurar trazabilidad y seguimiento,
- y automatizar el pipeline sin fricción para el usuario.

## Solución

Web en Astro con dos canales de captación conectados a automatización:

### 1) Chatbot (cualificación)
- Endpoint: `https://hooks.icreategroup.net/webhook/icreate/chat`.
- El frontend envía **mensaje + historial + `session_id`**.
- n8n procesa la conversación, recopila información, persiste en Supabase y notifica por email interno para seguimiento.

### 2) Formulario de contacto
- Endpoint actual (webhook): conectado a plataforma de automatización.
- Campos enviados: `nombre`, `correo`, `empresa`, `telefono`, `servicio`, `mensaje`.

## Arquitectura

- Frontend (Astro): UI + componentes de captación.
- Webhooks (entrada): envío de payload con trazabilidad (`session_id`).
- Orquestación (n8n): normalización, validación, enriquecimiento y routing.
- Persistencia (Supabase): almacenamiento de leads y estados (pipeline).

> Nota: hay recomendaciones de mejora para migrar el formulario a `POST` con respuesta validable.

## Features clave

- Chat widget dedicado (`ChatWidget.jsx`) con historial y sesión.
- Gestión de cookies/cumplimiento:
  - rutas legales publicadas,
  - consentimiento en `localStorage` con reapertura desde footer.
- Build optimizada y despliegue con compresión post-build.

## Retos y decisiones

- **Trazabilidad**: correlación por `session_id` para unificar conversaciones y formularios.
- **Automatización sin sobrecargar**: el frontend no gestiona negocio; delega a workflows.
- **Cumplimiento**: consentimiento de cookies como base para integraciones futuras.

## Resultados / impacto

- Canal de captación activo con automatización de primer contacto.
- Mejora del "lead quality" al recoger contexto desde chatbot + formulario.

## Aprendizajes

- El "chatbot" es más útil si trabaja con un workflow que valida y estructura datos antes de persistir.
- Menos fricción = más conversión (form + chat deben ser directos y rápidos).

## Próximos pasos

- Unificar backend de captación (form + chatbot) en una misma estrategia y endpoint.
- Migrar formulario a `POST` y confirmación verificable.
- Añadir analytics de embudo (views → intent → lead → qualified).

## Galería

> TODO: capturas de hero, secciones, widget chat, confirmaciones.
