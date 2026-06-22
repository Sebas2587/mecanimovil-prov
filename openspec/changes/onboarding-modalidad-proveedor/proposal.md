# onboarding-modalidad-proveedor

## Why

Hoy el onboarding obliga a elegir "Taller" vs "Mecánico a domicilio" como entidades
distintas. Con la unificación, un proveedor elige su **modalidad de atención**
(en taller / a domicilio / ambas), y el equipo interno se configura después.

## What Changes

- `app/(onboarding)/tipo-cuenta.tsx`: reemplazar la elección de tipo por selección de
  `modalidad_atencion` (`en_taller` / `a_domicilio` / `ambas`).
- Flujos derivados: si incluye domicilio, pedir `radio_cobertura`; si incluye taller, pedir dirección.
- Mapear la selección al payload del backend (`modalidad_atencion`).

## Requirements

- REQ-ONB-MODALIDAD: el onboarding SHALL permitir elegir entre en taller / a domicilio / ambas.
- REQ-ONB-COBERTURA: si la modalidad incluye domicilio, SHALL solicitar radio de cobertura.
- REQ-ONB-DIRECCION: si la modalidad incluye taller, SHALL solicitar dirección física.
