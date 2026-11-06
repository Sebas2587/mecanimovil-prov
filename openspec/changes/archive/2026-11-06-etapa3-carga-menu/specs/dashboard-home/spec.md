## ADDED Requirements

### Requirement: Carga honesta de Hoy

Mientras Hoy no tiene respuesta, la pantalla MUST mostrar carga y MUST NOT pintar contadores en 0 ni un vacío. El vacío solo aparece con la respuesta. Un 0 ya respondido MUST verse como 0. «Por agendar» MUST contarse desde las cotizaciones de esa lista. El pipeline de Hoy MUST limitarse a las acciones visibles y MUST NOT pedir 100 filas para ese número.

#### Scenario: Hoy todavía carga

- GIVEN las cotizaciones del día aún no respondieron
- WHEN se abre Hoy
- THEN los contadores no muestran 0
- AND no aparece «Nada pendiente»

#### Scenario: Hoy vacío de verdad

- GIVEN las consultas de Hoy ya respondieron y no hay acciones
- WHEN se mira «Siguiente acción»
- THEN aparece el vacío «Nada pendiente»

#### Scenario: Por agendar sin barrer el pipeline

- GIVEN hay cotizaciones aceptadas en la lista del taller
- WHEN Hoy calcula «Por agendar»
- THEN el número sale de esas cotizaciones
- AND no depende de traer 100 filas del pipeline

### Requirement: Lista de cotizaciones con carga y pruebas

La lista de cotizaciones MUST distinguir «Cargando cotizaciones» de «Sin resultados». Mientras carga, MUST NOT mostrar la suma de dinero como $0. Un total 0 explícito, ya cargado, sigue siendo $0. Un total null sigue «Incompleto».

La lista MUST ofrecer un filtro reversible que oculta cotizaciones cuyo título contiene la palabra TEST. Ocultarlas MUST NOT borrar el registro. Volver a mostrarlas MUST devolverlas a la lista.

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
