# Santiago Villegas Castro — Portfolio

Portafolio profesional personal. Sitio estático de una sola página, bilingüe (ES/EN), sin frameworks ni build step.

🔗 **Live:** https://svillegasc.github.io/

## Stack

- HTML5 + CSS3 (custom properties, sin frameworks)
- JavaScript vanilla (toggle de idioma, scroll reveal, formulario de contacto)
- Tipografía auto-hospedada: Space Grotesk, IBM Plex Sans, IBM Plex Mono (sin dependencias de terceros como Google Fonts)

## Estructura

```
.
├── index.html    # Marcado del sitio
├── styles.css    # Estilos
├── script.js     # Lógica (idioma, scroll reveal, formulario)
└── fonts/        # Tipografías auto-hospedadas (.woff2)
```

> El CV **no** se publica como descarga directa en el sitio (contiene teléfono, email y detalle completo de la trayectoria). Se comparte de forma directa a quien contacte por el formulario, LinkedIn o el email listado.

## Seguridad

- Content-Security-Policy y Referrer-Policy declaradas en `index.html` (`default-src 'self'`, sin `unsafe-inline`).
- Sin dependencias de terceros en runtime (fuentes auto-hospedadas).
- Enlaces externos con `rel="noopener noreferrer"`.
- Sin backend ni almacenamiento de datos de visitantes: el formulario de contacto abre el cliente de correo del usuario (`mailto:`), no envía datos a ningún servidor.
- Ningún documento con información personal completa (CV) se sirve públicamente desde el repo.

## Desarrollo local

No requiere instalación. Basta con abrir `index.html` en el navegador, o servirlo localmente:

```bash
python3 -m http.server 8000
```

## Despliegue

Publicado con GitHub Pages directo desde la rama `main`.

## Contacto

- Email: santivicastro18@gmail.com
- LinkedIn: [linkedin.com/in/santiagovillegas-castro](https://linkedin.com/in/santiagovillegas-castro-06175a9b/)
- GitHub: [@svillegasc](https://github.com/svillegasc)
