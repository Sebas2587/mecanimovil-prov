## Context

`confirmarCobro` cierra sobre el dueño del envío y, al terminar, actualiza el estado de React sin mirar si la pantalla cambió de cuenta. `confirmarCosto` y el `cargar` que dispara el alta hacen lo mismo.

## Goals / Non-Goals

**Goals:**

- Persistir el 502 del cobro bajo A y no dibujarlo en B.
- Ignorar en B el 200, el 400 y el 409 tardíos, y el libro que recargarían.
- Restaurar el aviso al volver a A. El costo ambiguo sigue la misma regla.

**Non-Goals:**

- Cancelar el POST. Merge, deploy y el PR 16 quedan fuera.

## Decisions

1. Un ref de la cuenta visible se actualiza al cambiar la identidad, en el mismo render que limpia la pantalla. El callback compara esa clave con la del envío.
2. El almacenamiento del intento usa siempre el dueño del envío. `setState` de intento, fallo, alta, nota y libro solo corre si la clave sigue coincidiendo.
3. El costo ambiguo recuerda dueño, cuerpo y fallo. B no lo ve. Al volver a A se muestra el aviso.
4. El candado de envío deja de bloquear a B cuando la pantalla ya no es la del envío.

## Risks / Trade-offs

- Dos POST pueden quedar en vuelo, uno por cuenta. Cada uno solo pinta en la suya. La clave de A no se reutiliza en B.
