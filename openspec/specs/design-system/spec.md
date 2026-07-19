# design-system Specification

## Purpose
Sistema de diseño Airbnb Hosts de Mecanimovil Proveedores. Tokens semánticos (paleta Tinder + superficies Airbnb), tipografía Poppins, primitivos `Institutional*` y componentes Card/AppHeader/BottomSheet.

## Requirements

### Requirement: Tokens de color Airbnb Hosts
Todos los colores SHALL provenir de `design-system/tokens/colors.ts`. La paleta usa brand Tinder (`#FD2B7B`, `#FF7158`), canvas `#F9F9F9`, paper `#FFFFFF`. `COLORS.institutional` SHALL alias la paleta para compatibilidad.

#### Scenario: Usar color de token
- GIVEN un nuevo componente que necesita color de fondo
- WHEN se implementa
- THEN usa un token del design system (ej. `COLORS.background.paper`)
- AND no contiene valores hex hardcodeados

### Requirement: Tipografía Poppins
Typography SHALL use Poppins 400/500/600 loaded in `app/_layout.tsx`.

### Requirement: Superficies sin glass
Decorative glass gradients SHALL NOT be used in tab screens. Cards use paper + hairline borders.

### Requirement: CTA primario con gradiente
Primary buttons SHALL use `PrimaryGradientFill` / `GRADIENTS.hostCta` (magenta→orange).

### Requirement: Iconos — única familia Lucide
New components SHALL use lucide-react-native for icons.

### Requirement: Primitivos base
The app SHALL provide Card, AppHeader, BottomSheet, and restyled Institutional* components.

### Requirement: Header compacto del checklist
The checklist modal header SHALL use compact density and typography (`base`/`xs`).

### Requirement: Barra de progreso del checklist
The checklist progress bar SHALL be thin (≤4px) without per-item circular step indicators.

### Requirement: Formularios de ítem del checklist
Checklist item forms SHALL use design tokens without hardcoded hex colors.
