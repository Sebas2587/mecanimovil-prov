# Host surfaces — uso rápido

Paleta Tinder + arquitectura Airbnb Anfitriones. Tokens en `tokens/`; UI en `components/`.

## Pantalla

```tsx
import { hostScreenStyles, HOST_GUTTER } from '@/app/design-system/components';

<ScrollView
  style={hostScreenStyles.scroll}
  contentContainerStyle={[hostScreenStyles.scrollInner, { paddingBottom }]}
>
  {/* hijos a ancho completo — sin paddingHorizontal extra */}
</ScrollView>
```

## Bloque con métricas

```tsx
import {
  HostSectionKicker,
  HostPaperSection,
  HostMetricRow,
} from '@/app/design-system/components';

<HostSectionKicker label="Finanzas del taller" />
<HostPaperSection>
  <HostMetricRow label="Por cobrar" value="$0" />
  <HostMetricRow label="Liquidado" value="$0" last />
</HostPaperSection>
```

## Card suelta

```tsx
import { Card } from '@/app/design-system/components';

<Card>{/* padding host + editorial por defecto */}</Card>
```

## Reglas

- Canvas `#F9F9F9` ~60% · paper `#FFFFFF` ~30% · brand magenta→naranja ~10% (solo CTA)
- Una paper por bloque; filas con hairline, no cards anidadas
- Tipografía: **solo Poppins** (`TYPOGRAPHY.fontFamily.*`). Montos/KPI también Poppins (`monoMedium` es alias legado).
- Iconos Lucide; platos con `hostIconPlateStyle` (tonal, no magenta)
