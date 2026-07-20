# design-system Specification

## Purpose
Sistema de diseño Airbnb Hosts de Mecanimovil Proveedores. Tokens semánticos (paleta Tinder + superficies Airbnb), tipografía Poppins, primitivos `Institutional*` y componentes Card/AppHeader/BottomSheet. Distribución de color según regla 60-30-10 ([PaletaColor Pro](https://paletacolorpro.com/en/ui-ux-palette-guide)).

## Requirements

### Requirement: Tokens de color Airbnb Hosts (60-30-10)
Todos los colores SHALL provenir de `design-system/tokens/colors.ts`. La paleta usa:
- ~60% canvas `#F9F9F9`
- ~30% paper `#FFFFFF` / tonal `#F3F3F3`
- ~10% brand Tinder (`#FD2B7B`, `#FF7158`) solo en CTAs primarios y acentos puntuales
`COLORS.institutional` SHALL alias la paleta para compatibilidad.

#### Scenario: Usar color de token
- GIVEN un nuevo componente que necesita color de fondo
- WHEN se implementa
- THEN usa un token del design system (ej. `COLORS.background.paper`)
- AND no contiene valores hex hardcodeados

### Requirement: Tipografía Poppins
Typography SHALL use Poppins 400/500/600 loaded in `app/_layout.tsx`, con roles `h1`–`h6`, `body`, `caption`, `button` definidos en `TYPOGRAPHY.styles`.

### Requirement: Superficies sin glass
Decorative glass gradients SHALL NOT be used in tab screens. Cards use paper + hairline borders + `SHADOWS.editorial`.

### Requirement: CTA primario con gradiente
Primary buttons SHALL use `PrimaryGradientFill` / `GRADIENTS.hostCta` (magenta→orange). Secondary/outline SHALL use paper. Header links SHALL use `InstitutionalButton` variant `tertiary`.

### Requirement: Tags canónicos
Status chips and meta labels SHALL use `InstitutionalTag` (radius sm, soft surfaces). Neutral tags SHALL NOT use heavy gray pills (`surfaceStrong` fill).

### Requirement: Icon plates Host
Decorative icon plates in insight/action cards SHALL use `hostIconPlateStyle` (tonal + ink). Brand magenta SHALL NOT fill icon plates by default.

### Requirement: Iconos — única familia Lucide
New components SHALL use lucide-react-native for icons.

### Requirement: Primitivos base
The app SHALL provide Card, AppHeader, BottomSheet, InstitutionalModal, and restyled Institutional* components.

### Requirement: Header compacto del checklist
The checklist modal header SHALL use compact density and typography (`base`/`xs`).

### Requirement: Barra de progreso del checklist
The checklist progress bar SHALL be thin (≤4px) without per-item circular step indicators.

### Requirement: Formularios de ítem del checklist
Checklist item forms SHALL use design tokens without hardcoded hex colors.
