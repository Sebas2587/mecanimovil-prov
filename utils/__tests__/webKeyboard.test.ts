import { activateFromKeyboard } from '@/utils/webKeyboard';

describe('activateFromKeyboard', () => {
  it('Enter dispara onPress cuando está habilitado', () => {
    const onPress = jest.fn();
    const preventDefault = jest.fn();
    expect(activateFromKeyboard({ key: 'Enter', preventDefault }, false, onPress)).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Space dispara onPress cuando está habilitado', () => {
    const onPress = jest.fn();
    expect(activateFromKeyboard({ key: ' ' }, false, onPress)).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no dispara si disabled', () => {
    const onPress = jest.fn();
    expect(activateFromKeyboard({ key: 'Enter' }, true, onPress)).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('no dispara otras teclas', () => {
    const onPress = jest.fn();
    expect(activateFromKeyboard({ key: 'Tab' }, false, onPress)).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });
});
