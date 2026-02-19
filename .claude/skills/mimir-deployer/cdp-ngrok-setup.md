# CDP + ngrok + Render Setup

Esta guía explica cómo usar tu navegador local con Mimir deployado en Render, conectándolos vía ngrok.

## ¿Por Qué Este Setup?

### Arquitectura

```
Tu Máquina Local:
  ┌─────────────────┐
  │ Chrome (CDP)    │ ← Aquí se ejecutan los tests
  │ Port 9222       │
  └────────┬────────┘
           │
           ↓
  ┌─────────────────┐
  │ ngrok           │ ← Expone CDP públicamente
  │ tcp://X:12345   │
  └────────┬────────┘
           │
           ↓ Internet
           │
  ┌────────┴────────┐
  │ Render (Oregon) │ ← Backend se conecta al CDP
  │ FastAPI         │
  └─────────────────┘

Frontend (Vercel):
  ┌─────────────────┐
  │ Usuario ingresa │
  │ ngrok URL       │
  └─────────────────┘
```

### Ventajas

✅ **Backend en Render**: Gratis, siempre disponible
✅ **Frontend en Vercel**: Deploy automático, CDN global
✅ **Browser local**: Ves la ejecución en tiempo real
✅ **Sin costos de cloud browser**: CDP es gratis
✅ **Memoria Render**: Solo ~120MB (sin Celery, sin browser)
✅ **Control total**: Puedes pausar, inspeccionar, interactuar

### Desventajas

❌ **ngrok free tier**: URL cambia cada 2 horas
❌ **Tu máquina debe estar prendida**: Chrome corre localmente
❌ **Solo para uso personal**: No escala para múltiples usuarios

## Setup Inicial (Una Vez)

### 1. Instalar ngrok

**Mac**:
```bash
brew install ngrok
```

**Linux**:
```bash
snap install ngrok
```

**Windows**:
- Descargar de https://ngrok.com/download
- O usar: `choco install ngrok`

### 2. Autenticar ngrok (Opcional pero recomendado)

```bash
# Registrarse en https://dashboard.ngrok.com/signup
# Copiar tu authtoken de https://dashboard.ngrok.com/get-started/your-authtoken

ngrok config add-authtoken TU_TOKEN_AQUI
```

**Beneficios**:
- Túneles más estables
- Más tiempo de sesión
- Estadísticas en dashboard

### 3. Verificar Render

Asegúrate de tener esta variable en Render:

```bash
ENABLE_CELERY_WORKER=false
```

Esto reduce la memoria de ~170MB a ~120MB.

## Uso Diario

### Opción A: Script Automático (Recomendado)

**Mac/Linux**:
```bash
cd /path/to/Mimir
./start-cdp.sh
```

**Windows**:
```cmd
cd C:\path\to\Mimir
start-cdp.bat
```

El script:
1. ✅ Limpia instancias previas de Chrome
2. ✅ Inicia Chrome con CDP en puerto 9222
3. ✅ Inicia ngrok y muestra la URL
4. ✅ Al cerrar (Ctrl+C), limpia todo

### Opción B: Manual

**Paso 1 - Chrome con CDP**:

Mac:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug-mimir" \
  --no-first-run &
```

Windows:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\temp\chrome-debug-mimir" ^
  --no-first-run
```

Linux:
```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug-mimir" \
  --no-first-run &
```

**Paso 2 - ngrok**:
```bash
ngrok tcp 9222
```

Verás algo como:
```
Session Status                online
Forwarding                    tcp://0.tcp.ngrok.io:12345 -> localhost:9222
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              ⬆ ESTA ES TU CDP URL
```

## Usar en Mimir Frontend

### 1. Abrir Mimir

Ve a tu frontend en Vercel (o localhost si estás en dev):
```
https://tu-app.vercel.app
```

### 2. Configurar CDP

En cualquier formulario (Generate, Execute, Replay):

**Browser Settings**:
- **Browser Mode**: Seleccionar **"Existing (CDP)"**
- **CDP URL**: Pegar la URL de ngrok
  ```
  tcp://0.tcp.ngrok.io:12345
  ```
- **Headless**: ❌ Dejar desmarcado (para ver el browser trabajar)

### 3. Ejecutar Test

Click en "Execute" o "Generate & Execute"

**Lo que verás**:
1. Frontend envía request a Render con `cdp_url`
2. Render se conecta a tu Chrome vía ngrok
3. **En tu Chrome local**: Verás tabs abrirse, clicks, typing, etc.
4. Resultados se guardan en Render
5. Frontend muestra los resultados

## Flujo Completo (Ejemplo)

### Scenario: Testear login en una app

**1. Iniciar CDP**:
```bash
./start-cdp.sh
# Output: tcp://0.tcp.ngrok.io:12345
```

**2. En Mimir Frontend**:
- Test Case: "Login with user@example.com and password123, verify dashboard loads"
- URL: https://my-app.com
- Email: user@example.com
- Password: password123
- Browser Mode: **Existing (CDP)**
- CDP URL: `tcp://0.tcp.ngrok.io:12345`
- Click "Execute"

**3. Observar**:
- **En tu Chrome**: Ves el browser abrir my-app.com, llenar formulario, hacer login
- **En ngrok terminal**: Ves las conexiones TCP
- **En Render logs**: Ves los mensajes del QaAgent

**4. Resultados**:
- Frontend muestra el report
- Puedes descargar actions.json para replay

## Troubleshooting

### Error: "Cannot connect to CDP"

**Síntoma**: Backend logs muestran connection timeout

**Posibles causas**:
1. **ngrok no está corriendo**
   ```bash
   # Verificar:
   curl http://localhost:4040/api/tunnels
   # Debería mostrar el tunnel activo
   ```

2. **URL incorrecta en frontend**
   - Verificar que sea `tcp://X.tcp.ngrok.io:XXXXX`
   - No usar `http://` ni `https://`

3. **Chrome CDP no está activo**
   ```bash
   # Verificar:
   curl http://localhost:9222/json/version
   # Debería devolver JSON con info de Chrome
   ```

4. **Firewall bloqueando**
   - Verificar firewall local
   - Verificar que ngrok pueda conectar

### Error: "ngrok session expired"

**Síntoma**: Después de 2 horas, tests dejan de funcionar

**Solución**:
1. Presiona Ctrl+C en ngrok terminal
2. Corre `ngrok tcp 9222` de nuevo
3. Copia la nueva URL a Mimir frontend
4. Re-ejecuta el test

**Permanente**:
- Autenticar ngrok (ver Setup Inicial)
- O usar ngrok paid ($8/mes) para URLs estáticas

### Error: "Multiple Chrome instances"

**Síntoma**: Chrome no responde, múltiples ventanas abiertas

**Solución**:
```bash
# Mac/Linux:
pkill -f "remote-debugging-port=9222"

# Windows:
taskkill /F /IM chrome.exe
```

Luego reinicia `./start-cdp.sh`

### Browser se cierra solo

**Síntoma**: Después del test, Chrome se cierra

**Causa**: `browser-use` cierra el browser al terminar

**Solución**: Normal behavior. Chrome se reiniciará en el próximo test.

## ngrok Free Tier Limits

| Feature | Free Tier | Paid ($8/mo) |
|---------|-----------|--------------|
| Concurrent tunnels | 1 | 3+ |
| Connections/min | 40 | Unlimited |
| Session duration | 2 hours | 24 hours |
| Static domain | ❌ | ✅ |
| Custom domain | ❌ | ✅ |

Para uso personal (1-5 tests/día), **free tier es suficiente**.

## Alternativas a ngrok

### 1. Cloudflare Tunnel (Gratis, Mejor)

```bash
# Instalar:
brew install cloudflared  # Mac
# Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation

# Uso:
cloudflared tunnel --url tcp://localhost:9222
```

**Ventajas**:
- ✅ Gratis para siempre
- ✅ Sin límites de tiempo
- ✅ Más rápido
- ✅ Más seguro

**Desventajas**:
- Requiere cuenta Cloudflare (gratis)
- Setup inicial más complejo

### 2. localhost.run (Más Simple)

```bash
ssh -R 80:localhost:9222 localhost.run
```

**Ventajas**:
- ✅ Sin instalación
- ✅ Una línea de comando

**Desventajas**:
- Solo HTTP (no TCP), no sirve para CDP

### 3. Serveo (Alternativa a ngrok)

```bash
ssh -R 9222:localhost:9222 serveo.net
```

**Similar a localhost.run pero con TCP support**

## Configuración Avanzada

### ngrok con Región Específica

Para reducir latency entre tu máquina y Render:

```bash
# Render está en Oregon (us-west)
ngrok tcp 9222 --region us
```

Regiones:
- `us` - United States
- `eu` - Europe
- `ap` - Asia/Pacific
- `au` - Australia
- `sa` - South America
- `jp` - Japan
- `in` - India

### ngrok con Config File

Crear `~/.ngrok2/ngrok.yml`:

```yaml
version: "2"
authtoken: TU_TOKEN_AQUI

tunnels:
  mimir-cdp:
    proto: tcp
    addr: 9222
    region: us
```

Uso:
```bash
ngrok start mimir-cdp
```

### Múltiples Máquinas

Si tienes varios usuarios con Mimir:

**Cada usuario**:
1. Corre `./start-cdp.sh` en su máquina
2. Obtiene su propia ngrok URL
3. Usa su URL en el frontend

**Render backend**:
- Soporta múltiples CDP URLs simultáneamente
- Cada job usa el `cdp_url` que vino en el request

## Seguridad

### ⚠️ Consideraciones

**ngrok expone tu Chrome públicamente**:
- Cualquiera con la URL puede controlar tu browser
- No compartas la ngrok URL públicamente
- La URL cambia cada 2 horas (mitigación)

**Cookies y sesiones**:
- Chrome CDP tiene acceso a todas tus cookies
- Usa `--user-data-dir` separado (no tu perfil principal)
- Scripts usan `/tmp/chrome-debug-mimir` (limpio)

**Mejores prácticas**:
1. ✅ Solo usar en red confiable
2. ✅ No compartir ngrok URL
3. ✅ Cerrar ngrok cuando no lo uses
4. ✅ Usar perfil Chrome separado
5. ✅ Autenticar ngrok con tu cuenta

## Monitoreo

### ngrok Web Interface

Mientras ngrok corre, abre:
```
http://localhost:4040
```

Verás:
- Requests en tiempo real
- Conexiones activas
- Logs de tráfico
- Replay de requests

### Render Logs

En Render dashboard:
```
Logs tab → Filter by "CDP" or "browser"
```

Verás:
```
INFO [BrowserSession] Connecting to CDP: tcp://0.tcp.ngrok.io:12345
INFO [BrowserSession] CDP connected successfully
INFO [Agent] Starting test execution...
```

## Performance

### Latency Esperado

| Tu Ubicación | Render (Oregon) | ngrok Latency | Total |
|--------------|-----------------|---------------|-------|
| USA West | ~10ms | ~20ms | ~30ms ✅ |
| USA East | ~80ms | ~40ms | ~120ms ✅ |
| Europe | ~150ms | ~100ms | ~250ms ⚠️ |
| Asia | ~200ms | ~150ms | ~350ms ⚠️ |

**Recomendación**: Para latency >200ms, considera correr backend localmente.

### Bandwidth

Cada test consume:
- Screenshots: ~1-5MB
- DOM inspection: ~0.5MB
- Actions: ~0.1MB

**Total**: ~2-10MB por test

**ngrok free tier**: Sin límite de bandwidth, solo connections/min

## Costo Total

| Componente | Costo |
|------------|-------|
| Render (backend) | $0/mes (free tier) |
| Vercel (frontend) | $0/mes (hobby tier) |
| ngrok | $0/mes (free tier) |
| browser-use cloud | $0 (no lo usas) |
| **TOTAL** | **$0/mes** ✅ |

Para **uso personal** (1 usuario, pocos tests/día), todo gratis.

## FAQ

**Q: ¿Puedo usar esto para producción?**
A: No recomendado. Para producción multi-usuario, usa `BROWSER_EXECUTION_MODE=cloud`.

**Q: ¿Funciona con múltiples tabs/browsers?**
A: Sí. Cada test es independiente. browser-use maneja el CDP session.

**Q: ¿Puedo usar mi Chrome normal mientras corro tests?**
A: Sí. CDP usa un perfil separado (`--user-data-dir`). Tu Chrome normal no se afecta.

**Q: ¿Necesito ngrok paid?**
A: No para uso personal. Free tier es suficiente.

**Q: ¿Qué pasa si mi IP cambia?**
A: ngrok funciona igual. El tunnel se re-establece automáticamente.

**Q: ¿Puedo usar Firefox o Safari?**
A: No. CDP es específico de Chrome/Chromium. browser-use solo soporta Chrome.

**Q: ¿Funciona en mobile?**
A: Chrome Android soporta CDP, pero necesitas adb port forwarding + ngrok. Complejo.

---

## Quick Reference

**Start everything**:
```bash
./start-cdp.sh
# Copy the ngrok URL shown
```

**Frontend config**:
- Browser Mode: **Existing (CDP)**
- CDP URL: `tcp://X.tcp.ngrok.io:XXXXX`

**Stop everything**:
```
Ctrl+C in ngrok terminal
```

**Verify it's working**:
```bash
# Check Chrome CDP:
curl http://localhost:9222/json/version

# Check ngrok:
curl http://localhost:4040/api/tunnels

# Check Render backend:
curl https://your-api.onrender.com/health
```

---

**¿Listo para probar?** Corre `./start-cdp.sh` y copia la URL a Mimir! 🚀
