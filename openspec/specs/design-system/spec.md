# design-system Specification

## Purpose
Sistema de diseño institucional de Mecanimovil Proveedores. Define tokens visuales
(colores, tipografía, espaciado, sombras, bordes, animaciones) y componentes UI base
que garantizan consistencia visual en toda la app.

## Requirements

### Requirement: Tokens de color
Todos los colores de la app provienen del design system. Nunca se usan hex hardcodeados.

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
Solo se usa lucide-react-native en componentes nuevos.

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
Los componentes deben verse correctamente en todos los tamaños de pantalla.

#### Scenario: Componente en pantalla pequeña
- GIVEN un dispositivo con pantalla < 375pt de ancho
- CUANDO se renderiza cualquier pantalla
- THEN no hay overflow de texto ni elementos cortados
- AND el layout se adapta con unidades relativas o responsive utilities
