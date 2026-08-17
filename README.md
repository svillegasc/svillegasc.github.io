# Santiago Villegas Castro — Portfolio

Portafolio profesional personal. Sitio estático de una sola página, bilingüe (ES/EN), construido con Astro.

🔗 **Live:** https://svillegasc.github.io/

## Stack

- [Astro](https://astro.build/) — framework estático
- HTML5 + CSS3 (custom properties, sin frameworks)
- JavaScript vanilla (toggle de idioma, scroll reveal, formulario de contacto)
- Tipografía auto-hospedada: Space Grotesk, IBM Plex Sans, IBM Plex Mono (sin dependencias de terceros como Google Fonts)

## Estructura

```
.
├── src/
│   ├── components/     # Componentes Astro por sección
│   ├── layouts/        # Layout principal (Layout.astro)
│   ├── pages/          # Páginas (index.astro)
│   └── styles/         # Estilos globales (global.css)
├── public/fonts/       # Tipografías auto-hospedadas (.woff2)
├── .github/workflows/  # GitHub Actions (deploy automático)
├── astro.config.mjs    # Configuración de Astro
└── package.json
```

> El CV **no** se publica como descarga directa en el sitio (contiene teléfono, email y detalle completo de la trayectoria). Se comparte de forma directa a quien contacte por el formulario o LinkedIn.

## Formulario de contacto

El formulario envía los mensajes vía [Web3Forms](https://web3forms.com) — un relay gratuito (250 envíos/mes en el plan free) que reenvía a la bandeja de entrada configurada **sin exponer el email en el código del sitio**. Solo se expone un "access key" público, que no revela ningún dato personal.

## Seguridad

- Content-Security-Policy y Referrer-Policy declaradas en `Layout.astro` (meta tags).
- Sin dependencias de terceros en runtime salvo Web3Forms (`connect-src` restringido explícitamente a ese dominio).
- Enlaces externos con `rel="noopener noreferrer"`.
- **Sin email ni teléfono expuestos en el código** — el único canal directo es el formulario (relay externo) y LinkedIn/GitHub.
- Ningún documento con información personal completa (CV) se sirve públicamente desde el repo.

## Desarrollo local

Requiere Node.js >= 22.12.0.

```bash
npm install
npm run dev
```

## Despliegue

Desplegado automáticamente con GitHub Actions al hacer push a la rama `main`.

1. Instala dependencias: `npm ci`
2. Build: `npm run build`
3. Output en `dist/`

El sitio se publica en https://svillegasc.github.io/ via GitHub Pages (source: GitHub Actions).

## Contacto

- Email: santivicastro18@gmail.com
- LinkedIn: [linkedin.com/in/santiagovillegas-castro](https://linkedin.com/in/santiagovillegas-castro-06175a9b/)
- GitHub: [@svillegasc](https://github.com/svillegasc)
