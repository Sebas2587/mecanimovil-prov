import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { COLORS } from '@/app/design-system/tokens';

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

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
  {
    onOK,
    onEmpty,
    onBegin,
    style,
    height = 300,
    penColor = COLORS.institutional.ink,
    backgroundColor = 'rgba(255,255,255,0)',
    webStyle,
  },
  ref,
) {
  const signatureRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    clearSignature: () => signatureRef.current?.clearSignature(),
    readSignature: () => signatureRef.current?.readSignature(),
  }));

  return (
    <SignatureScreen
      ref={signatureRef}
      onOK={onOK}
      onEmpty={onEmpty}
      onBegin={onBegin}
      descriptionText=""
      clearText=""
      confirmText=""
      webStyle={webStyle}
      autoClear={false}
      backgroundColor={backgroundColor}
      penColor={penColor}
      minWidth={2}
      maxWidth={4}
      style={[styles.canvas, { height }, style]}
    />
  );
});

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
  },
});

export default SignaturePad;
