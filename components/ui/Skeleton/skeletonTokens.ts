import { COLORS } from '@/app/design-system/tokens';

const g = COLORS?.neutral?.gray;

/** Base y “highlight” del esqueleto (tokens + fallback al dashboard actual). */
export const SKELETON_BASE = g?.[100] ?? '#EBEFF1';
export const SKELETON_MUTED = g?.[200] ?? '#D7DFE3';
export const SKELETON_STRIP = g?.[50] ?? '#F3F4F6';
