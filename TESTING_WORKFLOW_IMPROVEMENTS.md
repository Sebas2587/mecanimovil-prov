# Testing Guide - Workshop Workflow Improvements

This document outlines the testing scenarios for the workshop and technician workflow improvements implemented to support backend PR #45.

## Features Implemented

### 1. Technician Assignment History
- **Component**: `HistorialAsignacionesModal`
- **Location**: `components/ordenes/HistorialAsignacionesModal.tsx`
- **API Endpoint**: `GET /api/ordenes/proveedor-ordenes/{id}/historial_asignaciones/`

**Features**:
- Displays complete audit trail of technician assignments
- Shows previous and new technician for each change
- Displays who made the assignment and when
- Shows motivation/reason for reassignment
- Indicates if checklist was in progress during reassignment (with progress percentage)
- Timeline view with visual indicators

### 2. Schedule Conflict Warnings
- **Component**: `ConflictosHorarioAlert`
- **Location**: `components/ordenes/ConflictosHorarioAlert.tsx`
- **API Endpoint**: `GET /api/ordenes/proveedor-ordenes/{id}/conflictos_horario/?mecanico_id={id}`

**Features**:
- Non-blocking warnings when technician has schedule conflicts
- Shows all conflicting orders with date, time, and status
- Displays available capacity
- Option to view calendar
- Informative only - does not prevent assignment

### 3. Improved Error Handling
- Idempotent operations for accept and start service
- Prevents double-submit with `procesando` state check
- Clear error messages from backend
- Graceful handling of network failures
- Preserves data on retry

### 4. Enhanced API Service
- **File**: `services/ordenesProveedor.ts`
- New methods:
  - `asignarTecnico(ordenId, mecanicoId, motivo?)`
  - `obtenerConflictosHorario(ordenId, mecanicoId?)`
  - `obtenerHistorialAsignaciones(ordenId)`

## Testing Scenarios

### Scenario 1: Approve Order Without Schedule
**Goal**: Verify that orders can be approved without requiring a schedule to be set first.

**Steps**:
1. Login as workshop mandante/supervisor
2. Navigate to pending orders
3. Select an order without `fecha_servicio` or `hora_servicio`
4. Click "Aceptar Orden"
5. Confirm acceptance

**Expected Result**:
- Order transitions to `aceptada_por_proveedor` state
- No error about missing schedule
- Order appears in active orders
- Can assign technician and set schedule later

**Status Field to Check**: `estado: 'aceptada_por_proveedor'`

---

### Scenario 2: Assign Technician (First Assignment)
**Goal**: Test initial technician assignment with audit log creation.

**Steps**:
1. Open an accepted order (estado: `aceptada_por_proveedor`)
2. Click "Asignar" button in "Técnico Asignado" section
3. Select a technician from the list
4. (Optional) Add a reason/motive
5. Confirm assignment

**Expected Result**:
- Technician is assigned to order
- If schedule exists, conflict check is performed
- If conflicts exist, warning modal is shown (non-blocking)
- "Ver Historial de Asignaciones" button appears
- Audit log entry is created in backend

**Backend Verification**:
```sql
SELECT * FROM ordenes_asignaciontecnicolog WHERE orden_id = <order_id>;
```

Expected: One entry with `tecnico_anterior = NULL`, `tecnico_nuevo = <assigned_tech>`

---

### Scenario 3: Detect Schedule Conflicts
**Goal**: Verify conflict detection when assigning technician with overlapping schedules.

**Prerequisites**:
- Create two orders with same date and time (e.g., 2026-11-08 10:00)
- Assign technician to first order

**Steps**:
1. Open second order with same date/time
2. Assign the same technician
3. Observe conflict warning

**Expected Result**:
- Assignment succeeds
- `ConflictosHorarioAlert` modal appears
- Shows first order in "Órdenes en conflicto" list
- Displays capacity information (e.g., "0 / 5" if two orders assigned)
- "Ver Agenda" button navigates to calendar
- "Entendido" button dismisses modal

**API Response Check**:
```json
{
  "tiene_conflictos": true,
  "conflictos": [
    {
      "orden_id": 1001,
      "fecha": "2026-11-08",
      "hora_inicio": "10:00",
      "mecanico": "Juan Pérez",
      "estado": "aceptada_por_proveedor"
    }
  ],
  "capacidad_disponible": 0,
  "capacidad_total": 5
}
```

---

### Scenario 4: Reassign Technician
**Goal**: Test reassignment with history preservation.

**Steps**:
1. Open order with assigned technician
2. Click "Reasignar" button
3. Select different technician
4. Add reason: "Técnico original no disponible"
5. Confirm reassignment
6. Click "Ver Historial de Asignaciones"

**Expected Result**:
- New technician is assigned
- History modal shows two entries:
  1. Original assignment (tecnico_anterior: NULL → tecnico_nuevo: Juan Pérez)
  2. Reassignment (tecnico_anterior: Juan Pérez → tecnico_nuevo: Pedro González)
- Second entry shows motivation
- Timeline displays changes chronologically

---

### Scenario 5: Reassign During Checklist Progress
**Goal**: Verify reassignment preserves checklist progress information.

**Prerequisites**:
- Order with checklist in progress (e.g., 45% completed)

**Steps**:
1. Open order with checklist at 45% progress
2. Reassign to different technician
3. Provide reason
4. View assignment history

**Expected Result**:
- Reassignment succeeds
- History entry shows:
  - `checklist_en_progreso: true`
  - `checklist_progreso_pct: 45`
- Warning badge in history modal: "⚠️ Checklist en progreso (45% completado)"
- Checklist progress is preserved on order

---

### Scenario 6: Idempotent Accept Operation
**Goal**: Verify accepting an already-accepted order returns success.

**Steps**:
1. Accept order normally (POST `/aceptar/`)
2. Verify order is in `aceptada_por_proveedor` state
3. Call accept endpoint again (simulating double-click or retry)

**Expected Result**:
- Second call returns `200 OK`
- Message: "La orden ya estaba aceptada" (or similar idempotent message)
- No duplicate state transitions
- No errors thrown

**Backend Check**: Verify only one state change log entry

---

### Scenario 7: Idempotent Start Service Operation
**Goal**: Verify starting an already-started service returns success without duplicating checklist.

**Steps**:
1. Start service normally (POST `/iniciar_servicio/`)
2. Verify checklist is created
3. Call start endpoint again

**Expected Result**:
- Second call returns `200 OK`
- Message indicates service already started
- No duplicate checklist created
- Returns existing checklist ID
- Field `checklist_creado: false` on second call

**Backend Check**:
```sql
SELECT COUNT(*) FROM checklists_checklistinstance WHERE orden_id = <order_id>;
```
Expected: `1` (not 2)

---

### Scenario 8: Partial Checklist Progress (Pause and Resume)
**Goal**: Verify partial progress is saved and can be resumed.

**Steps**:
1. Start service and open checklist
2. Complete 3 out of 10 items
3. Exit/pause checklist
4. Reload order detail
5. Open checklist again

**Expected Result**:
- Progress indicator shows "3/10 (30%)"
- Completed items remain checked
- Can continue from where left off
- Estado changes to `PAUSADO` when exiting

**Existing Feature**: Already implemented, verify it still works after changes

---

### Scenario 9: Connection Failure and Recovery
**Goal**: Test graceful handling of network failures without data loss.

**Steps**:
1. Start accepting an order
2. Disconnect network (airplane mode or disable connection)
3. Click "Aceptar"
4. Observe error
5. Reconnect network
6. Click "Aceptar" again

**Expected Result**:
- First attempt shows: "Error de conexión. Verifica tu conexión a internet."
- Data is not lost (form state preserved)
- Second attempt succeeds after reconnection
- Idempotent handling prevents duplicate if first request actually went through

---

### Scenario 10: Double-Click Prevention
**Goal**: Verify UI prevents accidental double submissions.

**Steps**:
1. Open order detail
2. Rapidly click "Aceptar Orden" button twice
3. Observe behavior

**Expected Result**:
- Only one API call is made
- Button becomes disabled during processing (`procesando` state)
- Second click is ignored
- Alert shows only once
- Backend idempotence handles any race conditions

**UI Check**: `procesando` state should block second click

---

### Scenario 11: Permission Validation
**Goal**: Verify only mandante and authorized supervisors can assign technicians.

**Test Cases**:

**a) Mandante assigns**:
- Login as mandante
- Assign technician
- Expected: Success

**b) Supervisor with `servicios` permission**:
- Login as supervisor with `permisos.servicios = true`
- Assign technician
- Expected: Success

**c) Supervisor without permission**:
- Login as supervisor with `permisos.servicios = false`
- Attempt to assign
- Expected: 403 Forbidden - "No tienes permiso para gestionar servicios"

**d) Mechanic attempts**:
- Login as mechanic
- Attempt to assign (button should not be visible)
- Expected: If API is called directly, 403 Forbidden - "Solo mandantes y supervisores pueden asignar técnicos"

---

### Scenario 12: Inactive Technician Rejection
**Goal**: Verify cannot assign inactive technician.

**Prerequisites**:
- Create technician with `activo = false`

**Steps**:
1. Attempt to assign inactive technician via API (should not appear in UI list)
2. Direct API call with inactive technician ID

**Expected Result**:
- 400 Bad Request
- Error: "El técnico seleccionado no está activo"
- Order technician remains unchanged

---

### Scenario 13: View History Modal
**Goal**: Test history modal UI and interaction.

**Steps**:
1. Open order with multiple reassignments
2. Click "Ver Historial de Asignaciones"
3. Scroll through history
4. Close modal

**Expected Result**:
- Modal opens with bottom sheet animation
- Timeline shows all assignments chronologically (newest first)
- Each entry displays:
  - Date and time
  - Assigned by (user)
  - Previous → New technician
  - Reason (if provided)
  - Checklist warning (if applicable)
- "Cerrar" button dismisses modal
- Handles empty history gracefully

---

### Scenario 14: Calendar Navigation from Conflicts
**Goal**: Verify "Ver Agenda" button in conflicts modal navigates correctly.

**Steps**:
1. Trigger conflict warning by assigning technician with overlapping schedule
2. In `ConflictosHorarioAlert` modal, click "Ver Agenda"

**Expected Result**:
- Modal dismisses
- Navigation to `/calendario` (calendar screen)
- Can view technician schedule
- Can navigate back to order detail

---

## Manual Testing Checklist

### Pre-Testing Setup
- [ ] Backend PR #45 deployed and running
- [ ] Test database with fixtures created
- [ ] Test users created (workshop, mechanics, client)
- [ ] Test orders created with various states

### UI Tests
- [ ] All new components render without errors
- [ ] Modals open and close smoothly
- [ ] Buttons are properly enabled/disabled
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

### Functionality Tests
- [ ] Scenario 1: Approve without schedule ✓
- [ ] Scenario 2: First assignment ✓
- [ ] Scenario 3: Conflict detection ✓
- [ ] Scenario 4: Reassignment ✓
- [ ] Scenario 5: Reassign during checklist ✓
- [ ] Scenario 6: Idempotent accept ✓
- [ ] Scenario 7: Idempotent start ✓
- [ ] Scenario 8: Pause/resume checklist ✓
- [ ] Scenario 9: Network failure recovery ✓
- [ ] Scenario 10: Double-click prevention ✓
- [ ] Scenario 11: Permission validation ✓
- [ ] Scenario 12: Inactive technician ✓
- [ ] Scenario 13: History modal ✓
- [ ] Scenario 14: Calendar navigation ✓

### Regression Tests
- [ ] Existing order flows still work
- [ ] Other screens not affected
- [ ] Performance acceptable
- [ ] No console errors

## Known Limitations

1. **Safari/iOS Real Device Testing**: Not performed in VM environment. Requires physical device or simulator.

2. **Backend Dependency**: Full E2E tests require backend PR #45 to be merged and deployed.

3. **Offline Mode**: True offline support with queue and sync is not implemented. Current implementation handles connection errors gracefully but does not queue operations.

4. **Conflict Detection Accuracy**: Simplified conflict detection checks for overlapping 1-hour windows. Production may need more sophisticated scheduling logic.

## Test Environment Variables

For testing against local backend:

```env
# .env.local
EXPO_PUBLIC_API_URL=http://localhost:8000
```

For testing against staging:

```env
# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.mecanimovil.cl
```

## Debugging Tools

Enable debug logging:

```typescript
// In ordenesProveedorService.ts or orden-detalle screen
logger.log('🔍 Debug info:', data);
```

View network requests:
- Use React Native Debugger
- Check Network tab for API calls
- Verify request/response payloads

## Next Steps

1. **Type Safety**: Run `npx tsc --noEmit` to verify TypeScript types
2. **Linting**: Run `npm run lint` to check code style
3. **Unit Tests**: Add tests for service methods and utility functions
4. **E2E Tests**: Implement Playwright/Detox tests for complete workflows
5. **Performance**: Monitor app performance with React DevTools Profiler

## Backend Verification Queries

### Check Assignment Log
```sql
SELECT 
  id,
  orden_id,
  tecnico_anterior_id,
  tecnico_nuevo_id,
  asignado_por_id,
  fecha_cambio,
  motivo,
  checklist_en_progreso,
  checklist_progreso_pct
FROM ordenes_asignaciontecnicolog
WHERE orden_id = <order_id>
ORDER BY fecha_cambio DESC;
```

### Check Order State
```sql
SELECT 
  id,
  estado,
  mecanico_asignado_id,
  fecha_servicio,
  hora_servicio
FROM ordenes_solicitudservicio
WHERE id = <order_id>;
```

### Check Checklist
```sql
SELECT 
  id,
  orden_id,
  estado,
  progreso_porcentaje
FROM checklists_checklistinstance
WHERE orden_id = <order_id>;
```

## Reporting Issues

When reporting bugs, include:

1. Scenario name and step number
2. Expected vs actual behavior
3. Screenshots/video if UI issue
4. Console logs
5. Network request/response (if API issue)
6. Device/browser information

## Summary

These scenarios cover the main improvements to the workshop and technician workflow:

✅ Technician assignment with audit trail
✅ Non-blocking schedule conflict warnings  
✅ Idempotent accept and start operations
✅ Improved error handling and retry logic
✅ Permission-based access control
✅ Partial progress preservation

All scenarios should pass for the feature to be considered complete and ready for production deployment.
