import { dequeueAlert, emptyAlertQueue, enqueueAlert } from '@/utils/alertQueue';

describe('alertQueue', () => {
  it('muestra el primero y encola el segundo (Éxito no se pisa)', () => {
    let q = emptyAlertQueue<{ title: string }>();
    q = enqueueAlert(q, { title: 'Éxito' });
    q = enqueueAlert(q, { title: 'Dirección Actualizada' });
    expect(q.current?.title).toBe('Éxito');
    expect(q.pending).toEqual([{ title: 'Dirección Actualizada' }]);
    q = dequeueAlert(q);
    expect(q.current?.title).toBe('Dirección Actualizada');
    q = dequeueAlert(q);
    expect(q.current).toBeNull();
  });

  it('un Error solo no deja cola', () => {
    let q = emptyAlertQueue<string>();
    q = enqueueAlert(q, 'Error');
    expect(q.pending).toEqual([]);
    q = dequeueAlert(q);
    expect(q.current).toBeNull();
  });
});
