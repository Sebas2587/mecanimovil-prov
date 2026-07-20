# Change: consolidacion-componentes-design-system

## Why
Componentes de negocio duplicaban superficies (cards, headers, modales) y usaban colores/tipografía hardcodeados.

## What
- `BaseCard` alias sobre `Card`
- `Header` delega en `AppHeader` con `titleRole=h3`
- `InstitutionalModal` base
- Migración de colores hex sueltos y spacing en `SolicitudCard`
- `fontWeight.bold` diferenciado de `semibold`
