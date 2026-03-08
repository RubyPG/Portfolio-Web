---
caseSlug: "ilead-crm"
title: "CRM iLead - Lead-to-Cash (Desktop + Automation + Billing)"
summary: "Plataforma desktop para operaciones comerciales: leads, clientes, facturacion y cobro con sincronizacion Stripe, automatizaciones n8n y metricas en tiempo real."
type: "SaaS/CRM"
year: "2025-2026"
status: "En curso"
role: "Arquitectura de producto + Full Stack + Automatizacion"
stack:
  - "Kotlin"
  - "Compose Multiplatform"
  - "Supabase (PostgreSQL)"
  - "n8n"
  - "Stripe"
  - "Grafana"
tags:
  - "CRM"
  - "Desktop"
  - "Automation"
  - "Billing"
  - "Observability"
cover: "/projects/ilead-crm/thumb.png"
links:
  demo: null
  repo: null
  docs: null
gallery:
  - image: "/projects/ilead-crm/Leads.png"
    alt: "Vista general del modulo de leads en iLead CRM"
    title: "Pipeline de leads"
    description: "Vista principal para revisar estado comercial, actividad reciente y seguimiento diario sin salir del flujo operativo."
    label: "Pipeline"
  - image: "/projects/ilead-crm/Leads%20Detalle.png"
    alt: "Detalle de lead con informacion operativa dentro de iLead CRM"
    title: "Ficha operativa del lead"
    description: "Detalle completo del lead con contexto comercial, trazabilidad y acciones de seguimiento desde una sola pantalla."
    label: "Detalle"
  - image: "/projects/ilead-crm/Clients.png"
    alt: "Modulo de clientes dentro de iLead CRM"
    title: "Cartera de clientes"
    description: "Conversion de leads a clientes con informacion consolidada por cuenta para trabajar renovaciones y oportunidades."
    label: "Clientes"
  - image: "/projects/ilead-crm/Invoices.png"
    alt: "Pantalla de facturacion e invoices dentro de iLead CRM"
    title: "Facturacion conectada"
    description: "Panel de invoices para controlar emision, estado y cobro conectado con Stripe y reglas de negocio internas."
    label: "Billing"
  - image: "/projects/ilead-crm/Grafana.png"
    alt: "Dashboard de metricas operativas en Grafana para iLead CRM"
    title: "Observabilidad y KPIs"
    description: "Metricas de embudo, conversion y facturacion en tiempo real para tomar decisiones con señal operativa real."
    label: "KPIs"
---

## Contexto

CRM iLead nace para unificar en un unico producto el flujo comercial completo:
- captacion y gestion de leads,
- conversion a cliente,
- emision y seguimiento de factura,
- y control de cobro con trazabilidad tecnica.

## Problema

Cuando ventas, facturacion y seguimiento viven en herramientas separadas:
- se pierde estado real del negocio,
- aparecen duplicados e inconsistencias,
- y el equipo comercial invierte tiempo en tareas manuales en lugar de cerrar operaciones.

## Solucion

Se diseno una plataforma desktop modular con:
- UX operativa de alta velocidad (tabla, filtros, edicion inline, autosave),
- capa de datos relacional en Supabase/PostgreSQL,
- automatizaciones n8n para procesos de negocio,
- y sincronizacion de estados de factura con Stripe via webhooks.

## Arquitectura

### Frontend desktop
- Kotlin + Compose Multiplatform (JVM).
- Modulos por dominio (`core/*`, `feature/*`).
- Configuracion runtime por cliente (`client.json` + variables de entorno).

### Datos y negocio
- Supabase/PostgreSQL como fuente de verdad.
- Vistas SQL de KPIs para seguimiento operativo.
- Reglas de consistencia para facturas, pagos y estados.

### Automatizacion
- n8n como capa de orquestacion de flujos.
- Workflows para facturacion/cobro y tareas operativas.
- Pipeline IA para recomendacion comercial ("que venderle") con enfoque RAG.

### Observabilidad
- Dashboard de metricas en Grafana.
- KPIs de embudo comercial, conversion y facturacion.

## Retos y decisiones clave

- Elegir Stripe Invoicing oficial para reducir ambiguedad de estado y mejorar trazabilidad.
- Resolver importaciones heterogeneas con merge anti-duplicados por claves jerarquicas.
- Diseñar procesamiento por lotes para IA y automatizaciones sin colisiones.
- Mantener aislamiento por cliente para escalar sin contaminar datos entre proyectos.

## Estado actual

- Flujo Lead -> Cliente -> Factura -> Cobro integrado.
- Instrumentacion de metricas operativas disponible.
- Base tecnica preparada para escalar por cliente.

## Proximos pasos

- Publicar historico antes/despues de KPIs de negocio.
- Aumentar automatizaciones de seguimiento comercial y cobro.
- Endurecer testing de workflows criticos y alertas operativas.
