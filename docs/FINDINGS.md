# Implementation Findings - Checklist Workflow

## Tested Workflow

### ✅ Working Components

**1. Authentication & Authorization**
- Workshop owner (`test_taller`) can start service ✓
- Mechanic (`test_mecanico`) can login and view assigned order ✓
- Backend permission check: `exigir_puede_ejecutar_servicio` validates assigned mechanic ✓

**2. Service Start API**
- Endpoint: `POST /api/ordenes/proveedor-ordenes/{id}/iniciar_servicio/`
- Accepts requests from: workshop owner OR assigned mechanic
- Idempotent: returns success if already started
- Transitions order estado: `aceptada_por_proveedor` → `servicio_iniciado`

**3. UI Improvements**
- Fixed stray text node warning (removed bullets, wrapped in container)
- Improved banner padding (12→16px, less cramped)
- Simplified banner text to avoid React Native text warnings
- Container gap replaces inline margins

### 🔴 BLOCKER: No Checklist Templates

**Issue**: Checklist instance not created when service starts

**Evidence**:
```
Step 1: Workshop owner starting service...
✓ Service started: Servicio iniciado exitosamente
  Checklist created: false  ← NO CHECKLIST!

API check: GET /api/checklists/templates/
Response: {"count": 0, "results": []}  ← NO TEMPLATES!
```

**Root Cause**: Backend `iniciar_servicio` creates checklist IF template exists:
```python
# From backend views.py line ~450
if orden.estado in ['servicio_iniciado', 'checklist_en_progreso']:
    checklist_instance = ChecklistInstance.objects.filter(orden=orden).first()
    # Returns None when no template exists
```

**Impact**: Cannot test checklist partial save/resume without templates

### ⚠️  UI Visibility Issue

**Mechanic sees order but no checklist button**

**Screenshots**:
- `CHECKLIST-1-order-started.png` - Order in `servicio_iniciado` state
- `CHECKLIST-2-no-button.png` - No checklist button visible for mechanic

**Possible causes**:
1. No checklist instance = no button (expected if no templates)
2. Button conditional logic checks for wrong estado
3. Role-based hiding (mechanic vs owner)

**Code check needed**: Review `app/orden-detalle/[id].tsx` button rendering for `servicio_iniciado` estado

### 📊 Test Results

```
✓ e2e/checklist-partial-save.spec.ts
  ✓ Owner starts service via API
  ✓ Mechanic logs in and views order
  ✓ No Expo error overlay
  ⚠️  Checklist button not visible
  ⚠️  Cannot test partial save (no checklist)
```

## Exact Backend Contracts Found

### Service Start
```
POST /api/ordenes/proveedor-ordenes/{id}/iniciar_servicio/
Authorization: Token <workshop_or_assigned_mechanic>

Success response:
{
  "success": true,
  "message": "Servicio iniciado exitosamente",
  "orden": {...},
  "checklist_creado": false,  ← depends on template existence
  "tiene_checklist": false,
  "checklist_id": null
}

Permission check:
- Uses exigir_puede_ejecutar_servicio()
- Validates: user is workshop owner OR assigned mechanic
- Parameter: miembro_asignado_id from order
```

### Checklist APIs
```
GET /api/checklists/templates/
  - Returns available templates for creating instances
  - Currently: count=0, results=[]

GET /api/checklists/instances/?orden_id={id}
  - Returns checklist instances for order
  - Currently: count=0 (no templates = no instances)
```

## Remaining Work

### Cannot Complete Without:
1. ❌ Checklist template seeding in test DB
2. ❌ Checklist instance creation verification
3. ❌ Partial save API contract (`PATCH /checklists/responses/{id}/` ?)
4. ❌ Resume on reload verification

### Can Complete Now:
- [x] UI layout fixes (stray text, cramped banner)
- [x] Service start permission investigation
- [x] Owner/mechanic start service flow
- [ ] Fix checklist button visibility for `servicio_iniciado`
- [ ] Document exact button render logic

## Next Steps for Coordinator

**Backend needs**:
1. Seed at least ONE checklist template in test DB
2. Confirm template is linked to service type or taller
3. Verify `iniciar_servicio` creates instance with template
4. Provide partial save endpoint/payload example

**Frontend needs**:
1. Fix checklist button conditional for `servicio_iniciado` estado
2. Verify button shows for mechanic role when checklist exists
3. Test partial save/resume once backend has templates

## Screenshots Captured

```
CHECKLIST-1-order-started.png (48KB) - Order after service start
CHECKLIST-2-no-button.png (48KB) - Mechanic view, no checklist button
```

## Code Changes

**Commit 6304e65**: Banner layout fixes
- Removed stray text warnings
- Improved padding and spacing
- Simplified text (no bullet characters)
