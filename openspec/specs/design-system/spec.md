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

#### Scenario: Rol de texto
- **WHEN** un texto usa un rol tipográfico
- **THEN** el rol sale de `TYPOGRAPHY.styles` y la fuente es Poppins

### Requirement: Superficies sin glass
Decorative glass gradients SHALL NOT be used in tab screens. Cards use paper + hairline borders + `SHADOWS.editorial`.

#### Scenario: Card de una pestaña
- **WHEN** se pinta una card en una pantalla de pestañas
- **THEN** usa paper, borde hairline y sombra editorial, sin gradiente de vidrio

### Requirement: CTA primario con gradiente
Primary buttons SHALL use `PrimaryGradientFill` / `GRADIENTS.hostCta` (magenta→orange). Secondary/outline SHALL use paper. Header links SHALL use `InstitutionalButton` variant `tertiary`.

#### Scenario: Botón primario
- **WHEN** se muestra un botón primario
- **THEN** usa el gradiente host de magenta a naranja

### Requirement: Tags canónicos
Status chips and meta labels SHALL use `InstitutionalTag` (radius sm, soft surfaces). Neutral tags SHALL NOT use heavy gray pills (`surfaceStrong` fill).

#### Scenario: Etiqueta de estado
- **WHEN** se muestra un estado o una meta
- **THEN** usa `InstitutionalTag` y una etiqueta neutra no rellena con `surfaceStrong`

### Requirement: Icon plates Host
Decorative icon plates in insight/action cards SHALL use `hostIconPlateStyle` (tonal + ink). Brand magenta SHALL NOT fill icon plates by default.

#### Scenario: Plato de ícono
- **WHEN** una card de acción muestra un plato de ícono
- **THEN** usa el estilo tonal con tinta y no rellena el plato de magenta

### Requirement: Iconos — única familia Lucide
New components SHALL use lucide-react-native for icons.

#### Scenario: Ícono nuevo
- **WHEN** un componente nuevo necesita un ícono
- **THEN** lo toma de lucide-react-native

### Requirement: Primitivos base
The app SHALL provide Card, AppHeader, BottomSheet, InstitutionalModal, and restyled Institutional* components.

#### Scenario: Primitivo disponible
- **WHEN** una pantalla necesita card, header, sheet o modal institucional
- **THEN** usa el primitivo del design system

### Requirement: Header compacto del checklist
The checklist modal header SHALL use compact density and typography (`base`/`xs`).

#### Scenario: Header del checklist
- **WHEN** se abre el modal del checklist
- **THEN** el header usa densidad compacta

### Requirement: Barra de progreso del checklist
The checklist progress bar SHALL be thin (≤4px) without per-item circular step indicators.

#### Scenario: Progreso del checklist
- **WHEN** el checklist muestra su avance
- **THEN** la barra mide 4 px o menos y no dibuja un círculo por ítem

### Requirement: Formularios de ítem del checklist
Checklist item forms SHALL use design tokens without hardcoded hex colors.

#### Scenario: Formulario de ítem
- **WHEN** se edita un ítem del checklist
- **THEN** el formulario usa tokens y no colores hex escritos a mano

### Requirement: Dinero y estado a 13 px
Los textos de dinero y de estado que estaban en 10 u 11 px en créditos, perfil y las etiquetas de pestaña SHALL renderizarse a 13 px o más. El kanban que no está en el camino del dueño MUST NOT reincorporarse para cumplir este tamaño.

#### Scenario: Etiqueta de estado en créditos
- **WHEN** se muestra una etiqueta de estado o un monto que antes usaba 10 u 11 px en créditos
- **THEN** ese texto usa al menos 13 px

#### Scenario: Pestañas
- **WHEN** se muestran las etiquetas de las pestañas
- **THEN** su tamaño es al menos 13 px
