# screen-redesign (delta)

## ADDED Requirements

### Requirement: Hoy (Today)
The home tab SHALL organize content in priority blocks: alerts → active work → opportunities → workshop shortcuts. Header SHALL be compact (avatar, name, notifications).

### Requirement: Mensajes (Inbox)
Chats list SHALL use clean rows, soft channel tags, canvas background.

### Requirement: Agenda (Calendar)
Month grid + day events + FAB; hairline cards.

### Requirement: Servicios
Segmented tabs Activas/Completadas/Rechazadas; reservation-style order rows.

### Requirement: Menú
Grouped sections with Host kickers (`Tu perfil` · `Tu negocio` · `Operar` · `Dinero` · `Herramientas` · `Cuenta`), list rows, logout at bottom.

### Requirement: Menú → Dinero (finanzas desacopladas)
The Dinero section SHALL expose dedicated destinations (not a single saturated hub):
- Plan y créditos → `/creditos` (tabs Suscripción + Tienda only)
- Saldo → `/creditos/saldo`
- Historial → `/creditos/historial`
- Rendimiento → `/rendimiento-kpis`
- Mercado Pago → `/configuracion-mercadopago`

Legacy deep links `/creditos?tab=saldo|historial|rendimiento` SHALL redirect to the dedicated screens.
