# design-system Specification

## Purpose
Sistema de diseño institucional de Mecanimovil Proveedores. Define tokens visuales
(colores, tipografía, espaciado, sombras, bordes, animaciones) y componentes UI base
que garantizan consistencia visual en toda la app.

## Requirements

### Requirement: Tokens de color
Todos los colores de la app SHALL provenir del design system. Hardcoded hex values MUST NOT be used.

#### Scenario: Usar color de token
- GIVEN un nuevo componente que necesita color de fondo
- CUANDO se implementa
- THEN usa un token del design system (ej. colors.institutional.primary)
- AND no contiene valores hex hardcodeados

#### Scenario: Token inexistente
- GIVEN que el color necesario no existe en los tokens actuales
- CUANDO se necesita agregar
- THEN se define primero en app/design-system/tokens/colors.ts
- AND luego se usa desde ahí en el componente

### Requirement: Iconos — única familia Lucide
New components SHALL use lucide-react-native for icons.

#### Scenario: Nuevo componente con ícono
- GIVEN un componente nuevo que necesita mostrar un ícono
- CUANDO se implementa
- THEN importa el ícono desde lucide-react-native
- AND registra la constante en app/design-system/iconography.ts si será reutilizable

#### Scenario: Ícono legacy (MaterialIcons/Ionicons)
- GIVEN un componente legacy que usa iconos fuera de Lucide
- CUANDO se edita ese componente
- THEN se migra al ícono Lucide equivalente
- AND se usa el puente InstitutionalIcon.tsx si es necesario por compatibilidad

### Requirement: Responsividad
Components SHALL render correctly across all supported screen sizes.

#### Scenario: Componente en pantalla pequeña
- GIVEN un dispositivo con pantalla < 375pt de ancho
- CUANDO se renderiza cualquier pantalla
- THEN no hay overflow de texto ni elementos cortados
- AND el layout se adapta con unidades relativas o responsive utilities

### Requirement: Header compacto del checklist
The checklist modal header SHALL use compact density and institutional typography (`base`/`xs`).

#### Scenario: Header del modal checklist
- GIVEN el proveedor abre el checklist de una orden
- WHEN se renderiza el header del modal
- THEN el título usa tipografía `base` o menor en una sola línea preferente
- AND el padding vertical es compacto
- AND el estado se muestra inline en el subtítulo

### Requirement: Barra de progreso del checklist
The checklist progress bar SHALL be thin and SHALL NOT include per-item circular step indicators.

#### Scenario: Barra de progreso del checklist
- GIVEN un checklist en progreso
- WHEN se muestra el progreso
- THEN incluye porcentaje y contador de ítems en una fila
- AND la barra tiene altura de 4px o menos
- AND no muestra una fila de círculos numerados por ítem

### Requirement: Formularios de ítem del checklist
Checklist item forms SHALL use `COLORS.institutional` tokens without hardcoded hex colors.

#### Scenario: Formulario de ítem del checklist
- GIVEN el proveedor abre un ítem del checklist
- WHEN se renderizan inputs, botones y CTAs
- THEN usa `COLORS.institutional` para colores y tipografía
- AND los bordes usan `hairline` y radios del design system
- AND el CTA primario usa `primary` y `onPrimary`
