## MODIFIED Requirements

### Requirement: Lista de cotizaciones con carga y pruebas

La lista de cotizaciones MUST distinguir «Cargando cotizaciones» de «Sin resultados». Mientras carga, MUST NOT mostrar la suma de dinero como $0. Un total 0 explícito, ya cargado, sigue siendo $0. Un total null sigue «Incompleto».

La lista MUST ocultar por defecto una cotización si la palabra TEST, con límite de palabra, aparece en `cliente_nombre`, `cliente_display` o `servicio_nombre`. «contestado» MUST NOT contar como prueba. Ocultarlas MUST NOT borrar el registro. Volver a mostrarlas MUST devolverlas a la lista.

#### Scenario: Suma mientras carga

- GIVEN la lista de cotizaciones todavía no respondió
- WHEN se abre la lista
- THEN no se muestra un total $0 como si no hubiera dinero
- AND el texto dice que está cargando

#### Scenario: Ocultar y mostrar una prueba

- GIVEN una cotización titulada «TEST pastillas» y otra titulada «Cambio de aceite»
- WHEN el filtro de pruebas está activo
- THEN solo se ve «Cambio de aceite»
- AND el registro TEST sigue existiendo
- WHEN se desactiva el filtro
- THEN «TEST pastillas» vuelve a la lista

#### Scenario: TEST en el nombre del cliente

- GIVEN una ficha con `cliente_nombre` «TEST Cotización IA 12» y servicio «Cambio de aceite»
- WHEN el filtro de pruebas está activo
- THEN esa ficha no se ve
- AND el registro sigue existiendo
- WHEN se desactiva el filtro
- THEN la ficha vuelve a la lista

#### Scenario: TEST en el servicio

- GIVEN una cotización con servicio «TEST pastillas»
- WHEN el filtro de pruebas está activo
- THEN no se ve
- AND un título «contestado» no se trata como prueba
