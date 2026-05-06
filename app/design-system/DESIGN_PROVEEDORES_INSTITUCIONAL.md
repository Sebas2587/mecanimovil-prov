# Sistema de diseño institucional — App Proveedores (MecaniMóvil)

Este documento es la **fuente de verdad de diseño** para **mecanimovil-prov**. Está adaptado del perfil visual tipo Coinbase descrito en `DESIGN-coinbase.md` (marketing web), pero **calibrado para React Native**, herramientas de taller y densidad de información sin sacrificar claridad ni estados semánticos.

## Principios

1. **Superficie clara por defecto**: lienzo blanco (`canvas`), bandas suaves grises (`surfaceSoft`), acento azul **usado con mesura** en CTAs y vínculos primarios.
2. **Un solo azul de marca para acción primaria**: `#0052ff` (activo `#003ecc`, deshabilitado `#a8b8cc`). Los botones secundarios sobre fondo claro usan gris elevado (`surfaceStrong`), no un segundo azul competidor.
3. **Tipografía sustituta** (las fuentes Coinbase son propietarias): **Inter** cuerpo / títulos con pesos 400–600; **JetBrains Mono** solo para cifras tabulares (montos, cantidades, deltas). El resto del copy va en **Inter** (`TYPOGRAPHY.fontFamily.sansRegular` / `sansMedium` / `sansSemiBold`), sin mezclar otra familia sans.
4. **Display “calmo”**: titulares grandes en **400** donde aplique; jerarquía por tamaño y tracking, no solo por negrita extrema.

### Jerarquía en pantalla (tokens `TYPOGRAPHY.styles`)

| Uso | Referencia | Familia Inter |
|-----|------------|----------------|
| Título de sección (ej. “Gestión del Taller”) | `styles.h2` (24 / 400) | `sansRegular` |
| Nombre / cabecera destacada | `styles.h4` (18 / 600) | `sansSemiBold` |
| Subtítulo de bloque o fila | `styles.h4` o `h3` (20 / 600) | `sansSemiBold` |
| Párrafo principal | `styles.body` (16 / 400) | `sansRegular` |
| Texto secundario | `styles.small` (14 / 400) | `sansRegular` |
| Meta / caption | `styles.caption` (13 / 400) | `sansRegular` |
| Rótulo mayúsculas corto | `styles.captionBold` (14 / 600) o `caption` + `sansMedium` | `sansSemiBold` / `sansMedium` |
| CTA texto | `styles.button` (16 / 600) | `sansSemiBold` |
| Montos y % | `styles.numberDisplay` | `monoMedium` |

En **Home** (`app/(tabs)/homeScreenStyles.ts`) los estilos siguen esta tabla tomando tamaños e interlineado desde `TYPOGRAPHY.styles`, no valores sueltos.
5. **Semántica financiera**: verde `#05b169` y rojo `#cf202f` como **color de texto** para deltas y métricas; **no** como fondo de botón de acción. Los fondos de alerta (error/suscripción) pueden seguir usando tintes suaves para legibilidad y accesibilidad táctil — son patrones de producto, no “velas” de trading.
6. **Formas**: inputs y tarjetas con radio **md ≈ 12** y **xl ≈ 24**; CTAs y chips tipo **pill** (`radius.pill`); avatares/placas circulares `full`.
7. **Elevación mínima**: preferencia por borde `hairline` + una sombra suave estándar (`SHADOWS.editorial`); sin escaleras de sombras múltiples salvo casos legacy.
8. **Iconografía única (producto UI)**: pictogramas **geométricos de trazo** alineados a la referencia tipo Coinbase (“geometric and minimal”, `DESIGN-coinbase.md`). En **React Native** la familia canónica es **[Lucide](https://lucide.dev)** vía `lucide-react-native` (SVG, trazo consistente). **No** mezclar en la misma pantalla iconos de relleno tipo Material con trazo tipo Lucide. **No** usar `@expo/vector-icons` (Material / Ionicons / etc.) en pantallas nuevas; pantallas legacy migran gradualmente. Constantes de trazo y tamaño: `app/design-system/iconography.ts`. Puente de nombres históricos Material/Ionicons → Lucide: `components/ui/InstitutionalIcon.tsx`. Iconos de plantilla Expo (`IconSymbol`): solo Lucide, sin SF Symbols en iOS para esta app.

## Tokens en código

| Área | Ubicación |
|------|-----------|
| Paleta y roles (`COLORS`, incl. `institutional`) | `app/design-system/tokens/colors.ts` |
| Tipografía (`TYPOGRAPHY`, familias Inter / Mono) | `app/design-system/tokens/typography.ts` |
| Radios / pilares | `app/design-system/tokens/borders.ts` |
| Sombras | `app/design-system/tokens/shadows.ts` |
| Espaciado (incl. `fixed.section` para ritmo) | `app/design-system/tokens/spacing.ts` |
| Acceso en pantalla | `useTheme()` / `@/app/design-system/tokens` |
| Iconografía (tamaño / trazo) | `app/design-system/iconography.ts` |
| Puente legacy Material / Ionicons → Lucide | `components/ui/InstitutionalIcon.tsx` |

### Referencia rápida `COLORS.institutional`

- `canvas` `#ffffff`, `surfaceSoft` `#f7f7f7`, `surfaceStrong` `#eef0f3`
- `ink` `#0a0b0d`, `body` `#5b616e`, `muted` `#7c828a`
- `hairline` `#dee1e6`
- `primary` `#0052ff`, `primaryActive` `#003ecc`, `primaryDisabled` `#a8b8cc`
- `semanticUp` `#05b169`, `semanticDown` `#cf202f`

## Reglas para trabajo nuevo

- **No** introducir hex sueltos en pantallas: usar tokens o `COLORS.institutional` / escala `primary[n]`.
- Componentes nuevos: botón primario = pill azul; secundario claro = fondo `surfaceStrong`, texto `ink`.
- **Iconos:** solo Lucide (`lucide-react-native`); usar `ICON_STROKE_WIDTH` / `ICON_SIZE` desde `iconography.ts`. No añadir nuevos `MaterialIcons` / `Ionicons` en UI.
- Cualquier desviación documentada aquí debe actualizar **este archivo** y los tokens correspondientes.

## Notas legales / marca

La referencia Coinbase es **solo inspiración de sistema visual**. No se utilizan logotipos ni fuentes propietarias de Coinbase. Las fuentes cargadas en la app son Inter y JetBrains Mono vía `@expo-google-fonts/*`.
