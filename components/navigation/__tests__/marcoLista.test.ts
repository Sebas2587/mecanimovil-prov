import { marcoListaStyle } from '@/components/navigation/marcoLista';

describe('marcoListaStyle', () => {
  it('sin control medido el marco no se encoge', () => {
    expect(marcoListaStyle(0)).toEqual({ flex: 1 });
  });

  it('la reserva medida es margen del marco, no padding del contenido', () => {
    const estilo = marcoListaStyle(73);
    expect(estilo.marginBottom).toBe(73);
    expect(estilo).not.toHaveProperty('paddingBottom');
  });

  it('un FAB típico deja aire bajo la lista', () => {
    expect(marcoListaStyle(64).marginBottom).toBe(64);
  });

  it('FAB + dock suma en el margen del marco', () => {
    expect(marcoListaStyle(64 + 88).marginBottom).toBe(152);
  });
});
