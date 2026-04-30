import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Ancho útil dentro de sectionWrap (20×2) + glassInner (20×2), alineado con el dashboard. */
const SECTION_HORIZONTAL = 40;
const GLASS_INNER_HORIZONTAL = 40;

export function useDashboardCarouselMetrics() {
  const { width: windowWidth } = useWindowDimensions();

  return useMemo(() => {
    const usable = Math.max(280, windowWidth - SECTION_HORIZONTAL - GLASS_INNER_HORIZONTAL);
    const contentHorizontalPad = 20;
    const itemGap = 12;
    const itemWidth = Math.round(usable * 0.88);
    const snapInterval = itemWidth + itemGap;
    return {
      itemWidth,
      itemGap,
      snapInterval,
      contentHorizontalPad,
      usableWidth: usable,
    };
  }, [windowWidth]);
}
