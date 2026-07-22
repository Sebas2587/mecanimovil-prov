# navigation-ia (delta)

## ADDED Requirements

### Requirement: Tab bar Airbnb Hosts
The app SHALL expose 5 tabs: Hoy (index), Mensajes (chats), Agenda (calendario), Servicios (ordenes), Menú (perfil).

### Requirement: Calendario visible
The calendario route SHALL be a visible tab, not hidden behind home grid only.

### Requirement: Mecánico de equipo
When `esMecanicoEquipo` is true, Servicios and Mensajes tabs MAY be hidden per existing business rules.

### Requirement: Finanzas fuera del hub saturado
Plan/créditos (Suscripción + Tienda), Saldo, Historial de créditos y Rendimiento SHALL be separate Detail screens reachable from Menú → Dinero. The `/creditos` hub SHALL NOT host Saldo, Historial o Rendimiento as tabs.
