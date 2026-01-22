# Sistema de Diseño MecaniMóvil - App Proveedores

Sistema de diseño completo y consistente para la aplicación MecaniMóvil Proveedores, basado en una paleta de colores que proyecta transparencia, calma, confianza, profesionalismo y claridad.

## Paleta de Colores

### Colores Base

- **White**: `#FFFFFF` - Brillante y absoluto, reflejando posibilidades infinitas
- **Ink Black**: `#00171F` - Ultra-oscuro con un toque de azul, evocando tinteros profundos
- **Deep Space Blue**: `#003459` - Azul oscuro infinito, inspirando asombro y ambición
- **Cerulean**: `#007EA7` - Vibrante y acuático, lleno de vida, libertad y conocimiento
- **Fresh Sky**: `#00A8E8` - Cian brillante, evoca cielos abiertos y optimismo

### Colores Principales

- **Primary**: Deep Space Blue (`#003459`) - Color principal de la aplicación
- **Secondary**: Cerulean (`#007EA7`) - Color secundario
- **Accent**: Fresh Sky (`#00A8E8`) - Color de acento para destacar elementos

### Colores Semánticos

- **Success**: Verde turquesa (`#00C9A7`) - Para estados exitosos
- **Warning**: Amarillo dorado (`#FFB84D`) - Para advertencias
- **Error**: Rojo coral (`#FF6B6B`) - Para errores
- **Info**: Cerulean (`#007EA7`) - Para información

## Estructura del Sistema

```
app/design-system/
├── tokens/              # Tokens de diseño
│   ├── colors.ts       # Sistema de colores
│   ├── typography.ts   # Tipografía
│   ├── spacing.ts      # Espaciado
│   ├── shadows.ts      # Sombras
│   ├── borders.ts      # Bordes
│   ├── animations.ts   # Animaciones
│   ├── safeHelpers.ts  # Helpers de seguridad
│   └── index.ts        # Exportaciones centralizadas
├── theme/              # Sistema de temas
│   ├── DesignSystemThemeProvider.tsx
│   └── useTheme.ts
└── README.md           # Esta documentación
```

## Uso

### 1. Importar el DesignSystemThemeProvider en el layout principal

```typescript
import { DesignSystemThemeProvider } from '@/app/design-system/theme/DesignSystemThemeProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DesignSystemThemeProvider>
        {/* resto de la app */}
      </DesignSystemThemeProvider>
    </SafeAreaProvider>
  );
}
```

### 2. Usar el hook useTheme en componentes

```typescript
import { useTheme } from '@/app/design-system/theme/useTheme';
import { View, Text, StyleSheet } from 'react-native';

export default function MyComponent() {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <Text style={[styles.text, { color: theme.colors.text.primary }]}>
        Hola Mundo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});
```

### 3. Importar tokens directamente

```typescript
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary[500],
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    ...SHADOWS.md,
  },
});
```

## Uso de Tokens

### Importar Tokens

```typescript
// Importar tokens individuales
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';

// O importar todos los tokens
import { TOKENS } from '@/app/design-system/tokens';

// O usar el hook useTheme
import { useTheme } from '@/app/design-system/theme/useTheme';
const theme = useTheme();
```

### Usar Colores

```typescript
import { COLORS } from '@/app/design-system/tokens';

// Colores primarios
const primaryColor = COLORS.primary[500]; // Deep Space Blue
const primaryLight = COLORS.primary[300];
const primaryDark = COLORS.primary[700];

// Colores semánticos
const successColor = COLORS.success[500];
const errorColor = COLORS.error[500];
const warningColor = COLORS.warning[500];

// Colores de texto
const textPrimary = COLORS.text.primary; // Ink Black
const textSecondary = COLORS.text.secondary;

// Colores de fondo
const backgroundDefault = COLORS.background.default;
const backgroundPaper = COLORS.background.paper;
```

### Usar Espaciado

```typescript
import { SPACING } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,      // 16px (responsivo)
    marginBottom: SPACING.lg, // 24px (responsivo)
    gap: SPACING.sm,          // 8px (responsivo)
  },
});
```

### Usar Tipografía

```typescript
import { TYPOGRAPHY } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  body: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
```

### Usar Sombras

```typescript
import { SHADOWS } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  card: {
    ...SHADOWS.md, // Sombra mediana
  },
  elevated: {
    ...SHADOWS.lg, // Sombra grande
  },
});
```

### Usar Bordes

```typescript
import { BORDERS } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
  },
  rounded: {
    borderRadius: BORDERS.radius.full,
  },
});
```

## Helpers de Seguridad

Para evitar errores de referencia, especialmente con typography:

```typescript
import { getSafeTypography } from '@/app/design-system/tokens';

const typography = getSafeTypography();
// Siempre retorna un objeto válido, nunca undefined
const fontSize = typography.fontSize.md;
```

## Características

- ✅ **TypeScript**: Completamente tipado
- ✅ **Responsive**: Espaciado adaptativo según tamaño de pantalla
- ✅ **Safe Areas**: Integración con react-native-safe-area-context
- ✅ **Optimizado**: Lazy loading y memoización
- ✅ **Consistente**: Misma paleta que la app de clientes
- ✅ **Robusto**: Validaciones y fallbacks para evitar errores
- ✅ **Sin conflictos**: Nombre diferente del ThemeProvider para evitar conflicto con React Navigation

## Guía de Migración Gradual

### Paso 1: El sistema ya está creado
El sistema de diseño base ya está implementado y disponible para usar.

### Paso 2: Importar tokens en componentes existentes

```typescript
// Antes
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
});

// Después
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
  },
});
```

### Paso 3: Usar useTheme hook

```typescript
import { useTheme } from '@/app/design-system/theme/useTheme';

export default function MyComponent() {
  const theme = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background.default }}>
      <Text style={{ color: theme.colors.text.primary }}>
        Contenido
      </Text>
    </View>
  );
}
```

## Prevención de Errores

### Errores comunes a evitar

1. **"Cannot convert undefined value to object"**: Usa `getSafeTypography()` o el hook `useTheme()` que siempre retorna valores válidos.

2. **Problemas de bundle**: Todos los imports están validados con try-catch. Si un token falla, usa el fallback.

3. **Conflictos de nombres**: Usa `DesignSystemThemeProvider` (no `ThemeProvider`) para evitar conflicto con React Navigation.

### Mejores Prácticas

1. **Siempre usar tokens**: Nunca hardcodear colores, espaciados o valores de diseño
2. **Usar useTheme hook**: Preferir el hook sobre imports directos cuando sea posible
3. **Validar antes de usar**: El sistema ya incluye validaciones, pero siempre verifica que los valores existan
4. **Mantener consistencia**: Mismo componente, mismo estilo en toda la app
5. **Responsividad**: Los tokens ya incluyen responsividad, no duplicar lógica

## Referencia Rápida

### Colores Principales
- `COLORS.primary[500]` - Deep Space Blue (#003459)
- `COLORS.secondary[500]` - Cerulean (#007EA7)
- `COLORS.accent[500]` - Fresh Sky (#00A8E8)

### Colores Semánticos
- `COLORS.success[500]` - Verde turquesa (#00C9A7)
- `COLORS.error[500]` - Rojo coral (#FF6B6B)
- `COLORS.warning[500]` - Amarillo dorado (#FFB84D)
- `COLORS.info[500]` - Cerulean (#007EA7)

### Espaciado (responsivo)
- `SPACING.xs` - 3-5px
- `SPACING.sm` - 6-10px
- `SPACING.md` - 12-20px
- `SPACING.lg` - 18-30px
- `SPACING.xl` - 24-40px

### Tipografía
- `TYPOGRAPHY.fontSize.xs` - 10px
- `TYPOGRAPHY.fontSize.sm` - 12px
- `TYPOGRAPHY.fontSize.md` - 16px
- `TYPOGRAPHY.fontSize.lg` - 18px
- `TYPOGRAPHY.fontSize.xl` - 20px
- `TYPOGRAPHY.fontSize['2xl']` - 24px

## Troubleshooting

### Problema: "Cannot convert undefined value to object"

**Solución**: Usa `getSafeTypography()` o el hook `useTheme()`:
```typescript
import { getSafeTypography } from '@/app/design-system/tokens';
const typography = getSafeTypography();
```

### Problema: Theme no está disponible

**Solución**: Asegúrate de que `DesignSystemThemeProvider` esté en el layout principal:
```typescript
import { DesignSystemThemeProvider } from '@/app/design-system/theme/DesignSystemThemeProvider';
```

### Problema: Conflictos con React Navigation ThemeProvider

**Solución**: Usa `DesignSystemThemeProvider` (nombre diferente). Ambos pueden coexistir:
```typescript
<DesignSystemThemeProvider> {/* Nuestro */}
  <ThemeProvider value={...}> {/* React Navigation */}
    {/* ... */}
  </ThemeProvider>
</DesignSystemThemeProvider>
```

## Estado de Implementación

- ✅ Sistema de tokens base creado
- ✅ Theme Provider implementado
- ✅ Hook useTheme disponible
- ✅ Integración en layout principal (pendiente)
- ⏳ Implementación gradual en páginas (siguiente paso)

## Próximos Pasos

1. Integrar `DesignSystemThemeProvider` en `app/_layout.tsx`
2. Implementar gradualmente en una pantalla de prueba
3. Migrar página por página siguiendo las mejores prácticas
4. Mantener compatibilidad con componentes existentes

## Soporte

Para preguntas o problemas con el sistema de diseño, consulta la documentación completa o revisa los ejemplos de uso en la app de clientes.

