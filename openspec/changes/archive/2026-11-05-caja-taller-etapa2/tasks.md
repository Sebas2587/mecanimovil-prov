## 1. Contrato de lectura

- [x] 1.1 Tipos, período Santiago y fallos honestos en `utils/cajaTaller.ts` y `services/cajaTallerService.ts`
- [x] 1.2 Totales de cotización en `utils/totalesCotizacion.ts` sin escribir la cotización

## 2. Pantalla

- [x] 2.1 Ruta `app/caja-taller.tsx` y registro en `app/_layout.tsx`
- [x] 2.2 `components/caja/CajaLibro.tsx`: resumen, serie, páginas, pie fuera del scroll
- [x] 2.3 `app/(tabs)/perfil.tsx` abre `/caja-taller`; Recargar sigue en `/creditos`

## 3. Cobro y totales visibles

- [x] 3.1 `utils/cobroTrabajo.ts` lee `estado_cobro_ui` sin pisar el pagado legacy
- [x] 3.2 Lista, detalle y editor de cotización muestran incompleto en vez de $0

## 4. Pruebas

- [x] 4.1 Tests de período, 100/30/10, idempotencia, 404, margen, legacy y totales
- [x] 4.2 Validar y archivar el change OpenSpec
