/**
 * Iconos de plantilla y SF-compat: **solo Lucide** (misma familia que el resto de la app).
 * Nombres `name` conservan claves tipo SF Symbols por compatibilidad con llamadas existentes.
 */
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Home,
  Phone,
  Send,
  User,
  X,
} from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const MAPPING = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code2,
  'chevron.right': ChevronRight,
  'exclamationmark.triangle.fill': AlertTriangle,
  'person.fill': User,
  'phone.fill': Phone,
  'car.fill': Car,
  calendar: CalendarDays,
  clock: Clock,
  xmark: X,
  checkmark: Check,
  'clock.fill': Clock,
  'building.2.fill': Building2,
} as const;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight: _weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  const Cmp = MAPPING[name];
  return (
    <Cmp
      color={color}
      size={size}
      strokeWidth={ICON_STROKE_WIDTH}
      style={style}
    />
  );
}
