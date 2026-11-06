## ADDED Requirements

### Requirement: Confirmar antes de borrar o limpiar

Eliminar una conversación, limpiar alertas, quitar una alerta y el ícono de basura de una línea de cotización MUST pedir confirmación antes de ejecutar la acción. Cancelar MUST NOT ejecutarla. Las limpiezas de listas que ya pedían confirmación MUST seguir haciéndolo.

#### Scenario: Cancelar no borra el chat

- GIVEN una conversación con el control Eliminar
- WHEN se pide borrar y se elige Cancelar
- THEN la conversación no se elimina

#### Scenario: Confirmar sí borra

- GIVEN el mismo control Eliminar
- WHEN se confirma
- THEN la eliminación se ejecuta

#### Scenario: Cancelar no limpia las alertas

- GIVEN alertas en la lista
- WHEN se toca limpiar y se elige Cancelar
- THEN las alertas siguen en la lista
