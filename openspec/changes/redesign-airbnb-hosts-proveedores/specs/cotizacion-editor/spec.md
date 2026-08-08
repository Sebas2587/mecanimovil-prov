# cotizacion-editor (delta)

## ADDED Requirements

### Requirement: Inputs visibles en modales Host
Form fields inside cotizar/agendar modals SHALL use `background.paper` on institutional inputs so fields remain visible against the modal canvas.

Vehicle patente summary (compact variant) SHALL render inside an elevated Host `Card` with a labeled spec grid, not plain text on canvas.

### Requirement: Domicilio cotización con comuna
`ChileAddressField` in cotizar flow SHALL accept `acceptLevel: 'comuna'` so a verified comuna + región is sufficient for domicilio modalidad (full street address remains optional).

Agendar flow keeps `acceptLevel: 'full'`.

### Requirement: Nombre cliente por canal
Contact names MUST use `nombreContactoAgendable`; Meta PSIDs and placeholders (`Cliente`, numeric IDs) MUST NOT be persisted as `cliente_nombre`.

Messenger/Instagram ingest SHALL attempt Graph profile enrichment (`name`) when `display_name` is empty or equal to the PSID. WhatsApp continues to use `profile.name` from the webhook.

When the channel provides no agendable name, Cotizar/Agendar SHALL show an editable **Nombre del cliente** field (required before generar). Chip labels MAY show `{Canal} · sin nombre` for UI only — that string MUST NOT be sent as `cliente_nombre`.

### Requirement: Repuesto JSON en cotización
Each repuesto line MAY include:
- `fuente_marketplace` (optional: `mercadolibre` | `catalogo` | empty). MUST NOT default to Mercado Libre.
- `marca_repuesto` (part brand, distinct from vehicle brand)
- `tienda_ml` (Mercado Libre seller; taller-only; only when obtained from a real ML listing; stripped from public cliente API)
- `precio_iva_incluido: true` (all quoted CLP amounts are IVA-inclusive)

After IA normalize, the backend SHALL run `enriquecer_repuestos_cotizacion`:
1. Match taller catalog / master `Repuesto` → `marca_repuesto` + `fuente_marketplace: catalogo`
2. Infer known part brands from the part name (e.g. Vimasa) without inventing a store
3. Best-effort ML OAuth search for real `tienda_ml` + brand; on 403/unavailable, leave tienda empty (never invent)

Catalog desglose (`_desglose_oferta_catalogo`) SHALL forward `marca_repuesto` from oferta JSON.

UI SHALL show marca/tienda/canal as read-only tags only when present.

### Requirement: Repuestos por vehículo
Cotización IA SHALL list parts compatible with marca/modelo/año/cilindrada/tipo_motor from context and inject relevant diagnostic knowledge when servicio/síntoma matches. Prefer fewer correct lines over generic unrelated parts (e.g. volante bimasa on applicable Fiat Bravo T-Jet clutch jobs).

### Requirement: Editor de cotización IA
`CotizacionIaEditor` SHALL:
- Show repuesto marca / canal / tienda as tags only when JSON values exist
- Show `metadata.servicios_lineas` breakdown when more than one service line exists
- Show summary: Repuestos, Mano de obra, Neto, IVA 19%, **Total a pagar** (derived from IVA-inclusive amounts)
- NOT label intermediate rows as “(IVA incl.)” when the Neto/IVA desglose is shown
- Caption: “Los precios de línea ya incluyen IVA. El desglose neto/IVA es informativo.”
- NOT render an empty readiness card
- NOT duplicate primary send CTA when hosted in `CotizacionLibreModal`

### Requirement: Cotización pública (cliente)
Public cotización page SHALL show the same informative Neto / IVA 19% / Total a pagar desglose and MAY show `marca_repuesto` on line items. It MUST NOT show `tienda_ml`.

### Requirement: Anular cotización aceptada
When a cotización is **aceptada**, the provider UI SHALL offer **Anular cotización**:
- If `cita_personal_id` exists → cancel cita (sync marks cotización origen cancelada)
- Else → `marcarPerdida` on the cotización

No new backend endpoint is required.
