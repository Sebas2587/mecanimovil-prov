# Current Implementation Status

## ✅ Completed - Authenticated Order Detail

### Working Features
1. **Workshop Owner Auth**: `test_taller` login → order detail page without errors
2. **Next-Action Banner**: "Próximos pasos" visible in accepted orders  
3. **Mechanic Auth**: `test_mecanico` login → assigned order visible
4. **Test Infrastructure**: Strict E2E tests with error overlay detection

### Screenshots Verified
- `ORDER-PAGE-CLEAN.png` (70KB) - Workshop view, no errors
- `BANNER-VERIFIED.png` - Next-action banner visible
- `MECHANIC-order-view.png` - Mechanic sees assigned order

### Backend Seeded State
- **Workshop**: test_taller (user_id: 6, taller_id: 2, rol: mandante)
- **Mechanic**: test_mecanico (user_id: 8, miembro_id: 6, rol: mecanico)
- **Order #1**: Estado `aceptada_por_proveedor`, assigned to mechanic ID 6
- **Assignment**: Seeded via direct DB (API has FOR UPDATE bug at f4ba235)

## ⚠️ Known Issues

### UI Warnings/Layout
1. **Stray Text Node**: Red toast "Unexpected text node: . A text..." in banner
   - Location: Lower left of `BANNER-VERIFIED.png`
   - Cause: Plain text inside View without Text wrapper
   - Impact: Runtime warning, but not breaking

2. **Banner Layout**: Cramped/partially clipped at bottom
   - Needs padding/margin adjustment in `styles.nextActionBanner`

3. **Duplicated CTA**: Assignment button appears twice
   - Check conditional rendering logic in banner section

4. **Misleading Label**: Order shows "Agendado" for accepted orders
   - Should distinguish acceptance from confirmed schedule
   - Use real `fecha_hora_propuesta` / `horario_confirmado` fields

5. **Button Visibility**: "Iniciar Servicio" not showing for mechanic role
   - Mechanic test shows ⚠️  button not found
   - May be permission/role-based UI issue

### Backend Blockers
- **Assignment API**: `POST /ordenes/proveedor-ordenes/{id}/asignar_tecnico/` 
  - Error: FOR UPDATE with nullable outer join
  - Status: Backend author fixing at f4ba235
  - Workaround: Direct DB seeding for testing

## 🚧 In Progress - Technician Checklist + Finding

### Next Implementation Steps

**Phase 1: Checklist Access**
1. Fix "Iniciar Servicio" button visibility for mechanic
2. Start service → transition to `servicio_iniciado`
3. Load checklist for order
4. Verify partial save/resume on reload

**Phase 2: Finding Workflow**
1. Add "Report Finding" action in checklist
2. Create finding modal:
   - Reuse vehicle/order/checklist context
   - Photo upload
   - Description field
   - Link to additional quote draft
3. Workshop prepares draft (NOT customer approval)
4. Show pending/approved/rejected states

**Phase 3: Integration**
1. Customer approval via existing customer app API only
2. No workshop impersonation or auto-approval
3. Clear next-action for each state

### Required Backend Contracts
Need exact API endpoints for:
- Finding creation with checklist context
- Linked additional quote draft
- Estado tracking: `pendiente_cliente`, `aprobado_cliente`, `rechazado_cliente`
- Checklist partial save/resume contract

### Testing Approach
- Mechanic login → assigned order → start service
- Partial checklist → pause → reload → resume
- Add finding → create linked extra draft
- Count user steps before/after
- Strict: pageerror, overlay, console error detection
- Screenshot at each step

## 📊 End-to-End Blockers

### Must Fix Before Full Workflow
1. ✅ Workshop auth → order detail (DONE)
2. ✅ Mechanic auth → assigned order (DONE)
3. ⚠️  Mechanic → start service button (IN PROGRESS)
4. 🔴 Backend assignment API (BLOCKED - backend fix needed)
5. 🔴 Finding → linked extra API contract (NEEDED)

### Current Test Coverage
```
✓ minimal-order-page.spec.ts - Workshop order without errors
✓ verify-banner-visible.spec.ts - Banner visibility
✓ mechanic-order-workflow.spec.ts - Mechanic sees order
```

### Remaining Tests Needed
```
- mechanic-start-service.spec.ts
- mechanic-checklist-partial.spec.ts
- mechanic-add-finding.spec.ts
- workshop-finding-draft.spec.ts
```

## 📝 Backend Coordination

**Needed from Backend Team:**
1. Assignment API fix ETA (currently f4ba235)
2. Finding/hallazgo model and endpoints
3. Linked additional quote draft workflow
4. Estado fields for pending/approved/rejected extras
5. Checklist partial save contract (already exists?)

## 🎯 Success Criteria

**For "Checklist + Finding" Implementation:**
- [ ] Mechanic logs in and starts service
- [ ] Checklist loads with progress tracking
- [ ] Partial completion saves
- [ ] Resume after reload preserves state
- [ ] Finding action available with context
- [ ] Draft additional quote links to finding
- [ ] Workshop sees draft WITHOUT customer approval
- [ ] Clear pending/approved/rejected states
- [ ] No arbitrary new minimums/signatures
- [ ] Screenshot proof at each step
- [ ] Step count comparison (before/after)

## 🔒 Security & Quality

- [x] localStorage override gated to `__DEV__`
- [x] No literal credentials in docs
- [x] DRF Token auth (40 hex) correctly identified
- [x] Tests fail on Expo error overlay
- [x] Tests fail on page errors
- [ ] Fix stray text node warning
- [ ] Banner layout polish
- [ ] Remove duplicated CTAs

## 📦 Files Modified

```
app/orden-detalle/[id].tsx           +InstitutionalText import, banner
services/serverConfig.ts              +__DEV__ gate
e2e/minimal-order-page.spec.ts       Strict error detection
e2e/verify-banner-visible.spec.ts    Banner visibility
e2e/mechanic-order-workflow.spec.ts  Mechanic flow
docs/IMPLEMENTATION_PROGRESS.md       Planning
docs/CURRENT_STATUS.md               This file
```

## 🚫 No Merge/Deploy

All changes remain on branch `cursor/flujo-taller-tecnico-mejoras-3624` for review and testing. No production deployment until full workflow verified.
