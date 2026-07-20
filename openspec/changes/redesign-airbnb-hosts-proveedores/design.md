# Diseño — Airbnb Hosts Proveedores

## Referencia

App Airbnb Anfitriones: Today / Inbox / Calendar / Menu (+ Insights en bloques).

## Paleta 60-30-10

Guía: [UI/UX Palettes — 60-30-10 Rule](https://paletacolorpro.com/en/ui-ux-palette-guide).

| Rol | % | Hex | Token |
|-----|---|-----|-------|
| Dominante (canvas) | ~60% | `#F9F9F9` | `background.default`, `institutional.canvas` |
| Secundario (paper / tonal) | ~30% | `#FFFFFF` / `#F3F3F3` | `background.paper`, `institutional.surfaceSoft` |
| Acento brand | ~10% | `#FD2B7B` → `#FF7158` | `brand.*`, `GRADIENTS.hostCta` |
| Ink | — | `#3B3B3B` | `text.primary`, `institutional.ink` |
| Soft tint | — | `#FFF0F5` | `base.soft`, `selection.background` |
| Hairline | — | `#E8E8E8` | `border.light`, `institutional.hairline` |
| Tab muted | — | `#B8B8B8` | `tab.unselected` |
| Icon default | — | `#757575` | `icon.default` / body |

**Regla:** canvas + paper dominan. Magenta/naranja solo en CTA primario, progreso clave y tints soft de tags `primary`. No pintar icon plates ni cards enteras con brand.

## Tipografía — Poppins

| Token | Size | Weight | Uso |
|-------|------|--------|-----|
| h1 | 30 | 600 | Display raro |
| h2 | 24 | 600 | Títulos de pantalla |
| h3 | 20 | 600 | Nombre de perfil / hero de sección |
| h4 | 17 | 600 | Título de card / fila |
| h5 | 15 | 500 | Subtítulo énfasis |
| h6 / label | 13 | 500 | Kickers de sección (MAYÚSCULAS, letterSpacing wider) |
| body | 15 | 400 | Cuerpo |
| caption | 13 | 400 | Meta quieta |
| captionBold | 13 | 600 | Meta enfatizada |
| small | 11 | 400 | Microcopy |
| button | 15 | 600 | CTAs (letterSpacing 0) |
| numberDisplay | mono 500 | — | Montos / % |

## Forma

- Card radius: **16** (`BORDERS.radius.lg`)
- Button radius: **12**, height 48–52
- Tag / chip: radius **8** (`sm`), no pill pesado
- Sheet/modal top: 24
- Shadow opacity ≤ 0.06 (`SHADOWS.editorial`)
- Lucide stroke 1.75–2 (`ICON_STROKE_WIDTH`)

## Primitivos canónicos

| Componente | Rol |
|------------|-----|
| `InstitutionalButton` | `primary` (gradiente 10%) · `outline`/`secondary` (paper) · `tertiary` (link header) |
| `InstitutionalTag` | Chips soft semánticos (`neutral`/`primary`/`warning`/…) |
| `InstitutionalText` | Roles tipográficos Poppins |
| `InstitutionalSectionHeader` | Títulos de bloque |
| `hostIconPlateStyle` | Plato 36 tonal + ink (no magenta) |
| `Card` / `institutionalCardStyles.surface` | Paper + hairline + editorial |

## Tabs (5)

Hoy | Mensajes | Agenda | Servicios | Menú

## Plantillas

Hub (Hoy, Menú), Listing (Servicios, Mensajes), Calendar (Agenda), Detail, Wizard, Focus
