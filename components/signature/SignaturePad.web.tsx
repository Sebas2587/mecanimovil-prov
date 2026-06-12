import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type SignaturePadRef = {
  clearSignature: () => void;
  readSignature: () => void;
};

type SignaturePadProps = {
  onOK: (signature: string) => void;
  onEmpty: () => void;
  onBegin?: () => void;
  style?: ViewStyle;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  webStyle?: string;
};

function fillCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string,
  penColor: string,
) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = penColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
  {
    onOK,
    onEmpty,
    onBegin,
    style,
    height = 300,
    penColor = '#000000',
    backgroundColor = '#ffffff',
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    canvas.style.cursor = 'crosshair';
    container.replaceChildren(canvas);
    canvasRef.current = canvas;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const cssW = rect.width;
      const cssH = rect.height;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width: cssW, height: cssH };
      fillCanvas(ctx, cssW, cssH, backgroundColor, penColor);
      ctxRef.current = ctx;
      hasInkRef.current = false;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const getPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      if (!hasInkRef.current) {
        onBegin?.();
      }
      const point = getPoint(event);
      ctxRef.current?.beginPath();
      ctxRef.current?.moveTo(point.x, point.y);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      const point = getPoint(event);
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      hasInkRef.current = true;
    };

    const endStroke = (event: PointerEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // pointer already released
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endStroke);
      canvas.removeEventListener('pointercancel', endStroke);
    };
  }, [backgroundColor, penColor, onBegin]);

  useImperativeHandle(ref, () => ({
    clearSignature: () => {
      const ctx = ctxRef.current;
      const { width, height: h } = sizeRef.current;
      if (!ctx || width <= 0 || h <= 0) return;
      fillCanvas(ctx, width, h, backgroundColor, penColor);
      hasInkRef.current = false;
    },
    readSignature: () => {
      if (!hasInkRef.current) {
        onEmpty();
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        onEmpty();
        return;
      }
      onOK(canvas.toDataURL('image/png'));
    },
  }));

  return (
    <View style={[styles.wrapper, { height }, style]}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
  },
});

export default SignaturePad;
