## ADDED Requirements

### Requirement: BaseCard para cards de negocio
Las cards de listados comerciales (`OrdenCard`, `SolicitudCard`, `OfertaCard`, pipeline) SHALL usar `Card`/`BaseCard` del design system en lugar de reimplementar superficies con `institutionalCardStyles.surface`.

#### Scenario: Card de solicitud en listado
- GIVEN una fila de solicitud pública en el tab Servicios
- WHEN se renderiza `SolicitudCard`
- THEN la superficie usa `Card` con `elevated` y tokens de spacing

### Requirement: InstitutionalModal para modales de formulario
Modales de rechazo, confirmación y formularios cortos SHALL usar `InstitutionalModal` (SafeArea + KeyboardAvoidingView + backdrop).

#### Scenario: Rechazar solicitud
- GIVEN el proveedor abre el modal de rechazo
- WHEN confirma un motivo
- THEN el modal usa `InstitutionalModal` con footer de acciones

### Requirement: Sin componentes starter Expo
La app SHALL NOT importar `ThemedText` ni `ThemedView`; pantallas auxiliares usan `InstitutionalText` y tokens.
