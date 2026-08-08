# Tasks — Redesign Airbnb Hosts Proveedores

## Fase 0 — Specs
- [x] proposal.md, design.md, .openspec.yaml
- [x] specs/design-system/spec.md
- [x] specs/navigation-ia/spec.md
- [x] specs/screen-redesign/spec.md

## Fase 1 — Tokens
- [x] colors.ts Tinder + aliases institutional
- [x] typography.ts Poppins
- [x] gradients.ts, shadows, borders, blankGlass
- [x] Poppins en app/_layout.tsx

## Fase 2 — Primitivos
- [x] Institutional* restyle + PrimaryGradientFill
- [x] Card, AppHeader, BottomSheet
- [x] HostTabBar 5 tabs

## Fase 3 — Pantallas tab
- [x] Hoy, Mensajes, Agenda, Servicios, Menú
- [x] Menú → Dinero: Plan y créditos / Saldo / Historial / Rendimiento / Mercado Pago (pantallas dedicadas)

## Fase 4 — Cards + modals
- [x] OrdenCard, SolicitudCard, OfertaCard, FinanzasTallerCard, PaqueteCard

## Fase 5 — Gate
- [x] Spec canónica design-system + dashboard-home

## Fase 6 — Split Cotizar vs Agendar
- [x] specs/cotizar-vs-agendar/spec.md
- [x] ClienteCanalPickerSection: PSID fix + contextoChat
- [x] VehiculoPatenteSection compartido
- [x] Backend: cotizacion_canal_origen_id en create cita
- [x] AgendarDesdeCanalModal: slim (sin IA/plantillas/editor)
- [x] CotizacionLibreModal: prefill desde chat
- [x] OmnichannelChatActionBar: Cotizar | Agendar
- [x] Entradas chat/chats/hoy/calendario + redirect agendar-cita-personal
