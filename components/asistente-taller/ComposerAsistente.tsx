import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp, Mic } from 'lucide-react-native';
import { COLORS, SHADOWS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

type Props = {
  placeholder: string;
  disabled?: boolean;
  onSubmit: (texto: string) => void;
  onSinVoz?: () => void;
  onInteract?: () => void;
};

type SpeechChunk = {
  isFinal?: boolean;
  0?: { transcript?: string };
};

type SpeechResult = {
  results: ArrayLike<SpeechChunk>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function crearReconocimiento(): SpeechRecognitionLike | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'es-CL';
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

export const ComposerAsistente = React.memo(function ComposerAsistente({
  placeholder,
  disabled = false,
  onSubmit,
  onSinVoz,
  onInteract,
}: Props) {
  const [texto, setTexto] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const enviando = useRef(false);
  const reconocimiento = useRef<SpeechRecognitionLike | null>(null);
  const dicho = useRef('');
  const hayTexto = texto.trim().length > 0;

  const enviar = useCallback(() => {
    const limpio = texto.trim();
    if (!limpio || disabled || enviando.current) return;
    enviando.current = true;
    setTexto('');
    onSubmit(limpio);
    queueMicrotask(() => {
      enviando.current = false;
    });
  }, [disabled, onSubmit, texto]);

  const publicarVoz = useCallback((frase: string) => {
    const limpio = frase.trim();
    if (!limpio || disabled || enviando.current) return;
    enviando.current = true;
    setTexto('');
    dicho.current = '';
    onInteract?.();
    onSubmit(limpio);
    queueMicrotask(() => {
      enviando.current = false;
    });
  }, [disabled, onInteract, onSubmit]);

  const hablar = useCallback(() => {
    if (reconocimiento.current) {
      reconocimiento.current.stop();
      return;
    }
    const rec = crearReconocimiento();
    if (!rec) {
      onInteract?.();
      onSinVoz?.();
      return;
    }
    reconocimiento.current = rec;
    dicho.current = '';
    setEscuchando(true);
    onInteract?.();
    rec.onresult = (event) => {
      const lista = event.results;
      let final = '';
      let parcial = '';
      for (let i = 0; i < lista.length; i += 1) {
        const pieza = lista[i]?.[0]?.transcript ?? '';
        if (lista[i]?.isFinal) final += pieza;
        else parcial += pieza;
      }
      const visible = (final || parcial).trim();
      dicho.current = final.trim() || visible;
      if (visible) setTexto(visible);
    };
    rec.onerror = () => {
      setEscuchando(false);
      reconocimiento.current = null;
    };
    rec.onend = () => {
      setEscuchando(false);
      reconocimiento.current = null;
      const frase = dicho.current.trim();
      if (!frase) {
        onSinVoz?.();
        return;
      }
      setTexto(frase);
      setTimeout(() => publicarVoz(frase), 400);
    };
    try {
      rec.start();
    } catch {
      setEscuchando(false);
      reconocimiento.current = null;
      onSinVoz?.();
    }
  }, [onInteract, onSinVoz, publicarVoz]);

  return (
    <View style={styles.pill}>
      <TextInput
        value={texto}
        onChangeText={(value) => {
          setTexto(value);
          if (value.trim().length > 0) onInteract?.();
        }}
        onFocus={() => onInteract?.()}
        placeholder={placeholder}
        placeholderTextColor={I.muted}
        style={styles.input}
        editable={!disabled}
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={enviar}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Enter') enviar();
        }}
        accessibilityLabel="Pedido para el asistente"
      />
      {hayTexto ? (
        <Pressable
          onPress={enviar}
          style={({ pressed }) => [styles.send, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          <ArrowUp size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ) : (
        <Pressable
          onPress={hablar}
          style={({ pressed }) => [styles.mic, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={escuchando ? 'Escuchando' : 'Hablar'}
        >
          <Mic
            size={20}
            color={escuchando ? I.primary : I.ink}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: 999,
    backgroundColor: I.paper,
    ...SHADOWS.editorial,
  },
  input: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    color: I.ink,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    ...(Platform.OS === 'web'
      ? { outlineWidth: 0, outlineStyle: 'none' as const }
      : null),
  },
  mic: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
