import { useCallback, useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const DISMISS_DY = 48;
const DISMISS_VY = 0.85;

/** Arrastre vertical para cerrar el sheet (nativo y web táctil / mouse). */
export function useSheetDismissGesture(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const translateY = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);

  const reset = useCallback(() => {
    translateY.stopAnimation();
    translateY.setValue(0);
    dragging.current = false;
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.15,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.15,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          translateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          dragging.current = false;
          if (g.dy > DISMISS_DY || g.vy > DISMISS_VY) {
            Animated.timing(translateY, {
              toValue: 780,
              duration: 160,
              useNativeDriver: true,
            }).start(({ finished }) => {
              translateY.setValue(0);
              if (finished) onCloseRef.current();
            });
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [translateY],
  );

  return {
    translateY,
    panHandlers: panResponder.panHandlers,
    reset,
  };
}
