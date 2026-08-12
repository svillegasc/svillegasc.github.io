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

> El CV **no** se publica como descarga directa en el sitio (contiene teléfono, email y detalle completo de la trayectoria). Se comparte de forma directa a quien contacte por el formulario o LinkedIn.

## Formulario de contacto

El formulario envía los mensajes vía [Web3Forms](https://web3forms.com) — un relay gratuito (250 envíos/mes en el plan free) que reenvía a la bandeja de entrada configurada **sin exponer el email en el código del sitio**. Solo se expone un "access key" público, que no revela ningún dato personal.

**Antes de publicar:** reemplaza `WEB3FORMS_ACCESS_KEY_AQUI` en `index.html` (input hidden `access_key` dentro de `<form id="contact-form">`) por tu access key real:
1. Entra a https://web3forms.com y regístrate con tu email (gratis, sin tarjeta).
2. Confirma el correo de verificación.
3. Copia el "Access Key" que te dan y pégalo en ese campo.

## Seguridad

- Content-Security-Policy y Referrer-Policy declaradas en `index.html` (`default-src 'self'`, sin `unsafe-inline`).
- Sin dependencias de terceros en runtime salvo Web3Forms (`connect-src` restringido explícitamente a ese dominio).
- Enlaces externos con `rel="noopener noreferrer"`.
- **Sin email ni teléfono expuestos en el código** — el único canal directo es el formulario (relay externo) y LinkedIn/GitHub.
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
