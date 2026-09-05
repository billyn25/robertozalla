# Parte Digital · Presupuestador multiempresa

Aplicación web estática para crear presupuestos, partes de trabajo, albaranes y facturas con una hoja visual tipo papel.

## Incluye

- Selector de empresa: cambia nombre, teléfono, correo, responsable, datos fiscales, condiciones y logo.
- Gestor para crear, editar, duplicar y borrar empresas sin tocar el código.
- Campos libres de cliente y servicio.
- Casillas de tipo de solicitud y trabajo.
- Líneas editables con cantidad, concepto, precio e importe.
- Cálculo automático `cantidad × precio`, con posibilidad de escribir el importe manualmente.
- Desglose de materiales, mano de obra, desplazamiento y plus.
- IVA configurable y totales editables.
- Firma del cliente y del técnico con ratón o dedo.
- Guardado y recuperación de documentos en el navegador.
- Exportación directa a PDF A4 e impresión.
- Diseño adaptado a ordenador y móvil.

## Publicar en Netlify

No necesita compilación ni instalar paquetes.

1. Descomprime el ZIP.
2. En Netlify, crea un sitio nuevo mediante despliegue manual y arrastra la carpeta completa.
3. También puedes subir estos archivos a un repositorio y conectar el repositorio con Netlify.

El archivo `netlify.toml` ya indica que la carpeta de publicación es la raíz del proyecto.

## Datos y copias de seguridad

Las empresas, los borradores, los documentos y los logos se guardan en `localStorage` del navegador. Por tanto:

- Permanecen en ese navegador y dispositivo.
- No se sincronizan automáticamente entre móvil y ordenador.
- Borrar los datos del navegador elimina la información guardada.

Para una siguiente versión se puede añadir una base de datos en Netlify/MongoDB para sincronizar todos los dispositivos.

## PDF

La exportación usa `html2pdf.js` desde CDN. Si el navegador o la conexión bloquean la librería, el botón abre la impresión del navegador para elegir **Guardar como PDF**.
