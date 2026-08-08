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
- `fuente_marketplace` (optional: `mercadolibre` | `catalogo` | `historial` | `estimado` | empty). MUST NOT default to Mercado Libre. `catalogo` means **the taller's published OfertaServicio only**.
- `marca_repuesto` (part brand, distinct from vehicle brand; MUST NOT be placeholders like GENÉRICO / N/A)
- `proveedor_nombre` (Catálogo del taller, Historial del taller, or ML nickname — NEVER "Catálogo Mecanimovil" from the global master)
- `tienda_ml` (Mercado Libre seller; taller-only; only from a real ML listing; stripped from public cliente API)
- `precio_estimado` (true when price is not from taller catalog/historial; UI shows "Precio estimado — revisar")
- `precio_iva_incluido: true` (all quoted CLP amounts are IVA-inclusive)

**Trust rule:** never present unverified data as catalog. The global master `Repuesto` taxonomy MUST NOT be used as CatalogSource for quotes (it caused false "Catálogo Mecanimovil / GENÉRICO" tags when the taller had no published services). Master `Repuesto` MAY only fill name/marca when resolving an id already present on a taller oferta.

**Marca and its source MUST travel together.** Gemini MUST leave `marca_repuesto` / `fuente_marketplace` / `tienda_ml` as `""`. The model MUST NOT invent brands or stores.

After IA normalize, `enriquecer_repuestos_cotizacion` (failures MUST NOT 500 `generar-ia`):
1. **CatalogSource** — only `OfertaServicio` with `disponible=True` for that taller (optionally filtered by vehicle marca) → `fuente_marketplace: catalogo`, `proveedor_nombre: Catálogo del taller`
2. **HistorialCotizacionSource** — prior taller cotizaciones `enviada|aceptada` (~6 months)
3. **MercadoLibreSource** — best-effort OAuth; 403/unavailable → no-op
4. **KnowledgeBrandSource** — brand already present in the part *name* only; tagged `estimado`

Lines without taller catalog/historial price SHALL set `precio_estimado: true` and cotización metadata `valores_estimativos: true`.

UI SHALL show Marca / Canal / Proveedor only when present; "Precio estimado — revisar" when `precio_estimado` and not a verified canal; Canal warning style for `estimado`.

### Requirement: Repuestos por vehículo
Cotización IA SHALL list parts compatible with marca/modelo/año/cilindrada/tipo_motor from context and inject relevant diagnostic knowledge when servicio/síntoma matches. Prefer fewer correct lines over generic unrelated parts (e.g. volante bimasa on applicable Fiat Bravo T-Jet clutch jobs).

### Requirement: Editor de cotización IA
`CotizacionIaEditor` SHALL:
- Show repuesto Marca / Canal / Proveedor as tags only when JSON values exist
- Short hint: prices and brands from published services feed IA quotes
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
