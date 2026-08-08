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
- `fuente_marketplace` (optional: `mercadolibre` | `catalogo` | `historial` | `estimado` | empty). MUST NOT default to Mercado Libre.
- `marca_repuesto` (part brand, distinct from vehicle brand)
- `proveedor_nombre` (human-readable channel/supplier: Catálogo del taller, historial, ML nickname)
- `tienda_ml` (Mercado Libre seller; taller-only; only when obtained from a real ML listing; stripped from public cliente API; kept for ML compat)
- `precio_iva_incluido: true` (all quoted CLP amounts are IVA-inclusive)

**Marca and its source MUST travel together, atomically, from the same hit.** The IA prompt (Gemini) MUST always leave `marca_repuesto` / `fuente_marketplace` / `tienda_ml` as `""` — the model MUST NOT guess or invent a "known market brand" for a part on its own. Only the backend enrichment pipeline is authorized to assign `marca_repuesto`, and only paired with the source it came from. This prevents disconnected/unsourced brand tags (e.g. showing "Marca: Bosch" with no Canal/Proveedor tag).

After IA normalize, the backend SHALL run `enriquecer_repuestos_cotizacion` (failures MUST NOT 500 `generar-ia`; deliver IA content without enrich):
1. **CatalogSource** — `OfertaServicio` with `disponible=True` + master `Repuesto` → marca/precio + `fuente_marketplace: catalogo` (highest confidence)
2. **HistorialCotizacionSource** — prior taller cotizaciones `enviada|aceptada` (~6 months) → mediana precio / moda marca (medium confidence)
3. **MercadoLibreSource** — best-effort OAuth for real `tienda_ml` + brand; on 403/unavailable, leave empty (never invent; never block)
4. **KnowledgeBrandSource** — infer known part brands from the part name (e.g. Vimasa) ONLY when no CatalogSource/HistorialSource/MercadoLibreSource match exists for that line; MUST be tagged `fuente_marketplace: estimado` (never blank, never conflated with a verified source) so the UI can visually distinguish an inference from real data

Merge rule: a "grounded" hit (`catalogo` | `historial` | `mercadolibre`) MAY overwrite an existing `marca_repuesto`/`fuente_marketplace`/`proveedor_nombre` only when the existing value is NOT already grounded (e.g. a stray/ungrounded value). A grounded value is never overwritten by another grounded or `estimado` hit. Prefer catalog/historial price when matched. Recalculate totals with `recalcular_totales`.

Provider effort: keep services with priced/branded repuestos (crear-servicio precarga `marca_repuesto` from master). No new catalog admin UI this phase.

Catalog desglose (`_desglose_oferta_catalogo`) SHALL forward `marca_repuesto` from oferta JSON.

UI SHALL show Marca / Canal / Proveedor as read-only tags only when present (not force Mercado Libre). The Canal tag SHALL render with a distinct (warning) style when `fuente_marketplace: estimado`, versus verified sources (`catalogo`/`historial`/`mercadolibre`), so the taller can tell an inference apart from a real store/catalog match.

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
