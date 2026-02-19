# CDP Quick Start - Mimir

Usa tu navegador local con Mimir en la nube (Render + Vercel).

## Setup (2 minutos)

### 1. Instalar ngrok

```bash
# Mac:
brew install ngrok

# Windows:
# Descargar de https://ngrok.com/download

# Linux:
snap install ngrok
```

### 2. Iniciar CDP

```bash
# Mac/Linux:
./start-cdp.sh

# Windows:
start-cdp.bat
```

Verás:
```
Forwarding: https://abc-123.ngrok.io -> http://localhost:9222
            ^^^^^^^^^^^^^^^^^^^^^^^
            Copiar esta URL ⬆
```

### 3. Usar en Mimir

Ve a https://tu-app.vercel.app

**Configurar**:
- Browser Mode: **"Existing (CDP)"**
- CDP URL: Pegar `https://abc-123.ngrok.io`
- Headless: ❌ Dejar desmarcado

**Ejecutar test**:
- Verás el browser trabajar en tu máquina 🎉
- Resultados aparecen en el frontend

## ¿Cómo Funciona?

```
Tu Chrome Local ← ngrok (túnel) ← Render Backend
                                      ↑
                                   Vercel Frontend
```

## Ventajas

✅ Backend en Render: Gratis, siempre disponible
✅ Browser local: Ves la ejecución en tiempo real
✅ Sin costos de cloud browser
✅ Memoria en Render: Solo ~120MB

## Detener

Presiona `Ctrl+C` en la terminal de ngrok.

---

**Documentación completa**: `.claude/skills/mimir-deployer/cdp-ngrok-setup.md`
