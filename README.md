# Parte Digital - Presupuestador multiempresa v6 PRO

Versión lista para desplegar directamente en Netlify (sitio estático).

Cambios de esta versión:
- Sin logos predeterminados: Antena City y Antenas Abaso arrancan sin logo.
- Si ya existían los antiguos logos de fábrica en localStorage, se eliminan automáticamente.
- El único logo que se conserva es el que el usuario elige desde el editor de empresa.
- Los logos personalizados se redimensionan y se guardan en localStorage del navegador junto a los datos de empresa.
- Si una empresa no tiene logo, la cabecera no reserva hueco vacío: el nombre usa todo el espacio.
- Si tiene logo, queda aislado en una caja `contain`, sin superponer nunca las letras de la empresa.
- Guardar/Recuperar documentos siguen ocultos durante esta fase.
- Cada recarga inicia una hoja nueva vacía; los datos del parte no se recuperan automáticamente.
- Exportar PDF e Imprimir usan exactamente el mismo render A4, generado desde un clon fijo de escritorio. Así se evita que móvil/PC, el scroll o el alto de la hoja recorten la parte inferior.
- Fechas mediante selector de calendario.

## Netlify
Sube el contenido de esta carpeta o arrastra el ZIP descomprimido a Netlify. No necesita build.
