# Propuesta: Rediseño Airbnb Hosts — App Proveedores

## Why

La app de proveedores usa un sistema institucional Coinbase (azul `#0052ff`, glass, Inter) desalineado con la app de usuarios y con la IA operativa de un taller (dashboard diario, inbox, agenda, servicios activos, menú de configuración).

Queremos la **arquitectura visual de la app Airbnb Anfitriones**: tabs operativos, pantalla Hoy por prioridad, superficies limpias, tokens semánticos PaletaColor Pro y marca Tinder unificada con usuarios.

## What Changes

- Tokens: paleta Tinder + superficies Airbnb; Poppins; sin glass
- Primitivos: restyle `Institutional*` + Card, AppHeader, BottomSheet
- Navegación: 5 tabs — Hoy | Mensajes | Agenda | Servicios | Menú
- Pantallas tab + cards dominio + modals alineados a densidad Hosts

## Non-goals

- Cambios de backend/API
- Tab Insights dedicado (KPIs en Hoy + Menú)
- Copy literal Airbnb ("guests", "listings")

## Alcance

`mecanimovil-prov/app/**`, `design-system/**`, `components/**`
