## ADDED Requirements

### Requirement: Menú sin accesos duplicados

El menú MUST mostrar Rendimiento una sola vez. Con la tarjeta «Tu rendimiento» visible, MUST NOT repetir la fila a `/rendimiento-kpis`. Sin la tarjeta, esa fila MUST seguir. «Finanzas del mes» MUST abrir `/caja-taller`. Recargar y el plan MUST seguir en `/creditos`. Plan, Saldo e Historial MUST quedar como créditos, en sus rutas actuales, y Mercado Pago MUST seguir en el menú.

#### Scenario: Rendimiento no se repite

- GIVEN la cuenta aprobada ve la tarjeta «Tu rendimiento»
- WHEN abre el menú
- THEN no hay otra fila «Rendimiento» hacia `/rendimiento-kpis`

#### Scenario: La caja no se confunde con los créditos

- GIVEN el mandante abre el menú
- WHEN toca Finanzas del mes
- THEN va a `/caja-taller`
- WHEN toca Plan y créditos, Saldo o Historial
- THEN va a `/creditos`, `/creditos/saldo` o `/creditos/historial`
- AND recargar sigue en `/creditos` con la tienda
