## Why

El backend actual manda `total_clp` numérico, incluso 0. El de la caja puede mandarlo null cuando falta un precio. La app convierte null en $0 y podría enviar ese cero. Hay que leer ambos contratos sin abrir la caja ni cambiar la navegación.

## What Changes

- Lista, detalle, burbuja y editor muestran «Incompleto» si el total es null, falta o `totales_completos` es false. El 0 explícito sigue siendo $0.
- El editor compara las líneas con el total guardado y no presenta el parcial como total.
- Enviar queda bloqueado cuando el total está incompleto. Un borrador se puede seguir guardando.
- No se crea la ruta de caja ni se mueve Finanzas del mes.
- Tokens ya usados por esas pantallas. Sin pantallas nuevas.
