# Conectar a un Navegador Existente (CDP)

Esta guía explica cómo conectar Mimir a un navegador Chrome/Edge ya abierto. Esto es útil cuando:

- Tu app requiere permisos de micrófono/cámara
- Quieres mantener una sesión de usuario activa
- Necesitas extensiones específicas del navegador
- Quieres ver las pruebas en tu navegador principal

## Configuración

### 1. Lanzar Chrome con Remote Debugging

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"
```

**Windows:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```

**Edge (macOS):**
```bash
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222 --user-data-dir="/tmp/edge-debug"
```

### 2. Otorgar Permisos (Opcional)

Si tu app requiere permisos de micrófono/cámara:

1. Abre tu app en el navegador lanzado con debugging
2. Navega a la página que requiere mic/cámara
3. Otorga los permisos necesarios
4. Deja el navegador abierto

### 3. Configurar en el Frontend de Mimir

Al ejecutar un test:

1. Selecciona **"Existing (CDP)"** en Browser Mode
2. Ingresa la CDP URL: `http://localhost:9222`
3. Selecciona "With UI" o "Headless" según prefieras
4. Ejecuta el test

El navegador ya abierto con remote debugging será usado para ejecutar los tests.

## Notas Importantes

### User Data Directory

El flag `--user-data-dir` es **importante** porque:
- Crea un perfil separado para debugging
- Evita conflictos con tu instancia normal de Chrome
- Permite múltiples instancias de Chrome corriendo

### Permisos de Sitio

Los permisos otorgados (mic/cámara) se guardan en el perfil de Chrome, por lo que:
- Solo necesitas otorgar permisos una vez
- Los permisos persisten mientras uses el mismo `user-data-dir`
- Puedes navegar manualmente a diferentes páginas entre tests

### Múltiples Tabs

Cuando te conectas a un navegador existente:
- browser-use creará una nueva tab si es necesario
- Las tabs existentes permanecen abiertas
- El replay service usará la primera tab disponible

### Limitaciones

- Solo funciona con navegadores basados en Chromium (Chrome, Edge, Brave)
- El navegador debe permanecer abierto durante la ejecución
- No puedes usar el modo headless con CDP connection

## Verificar Conexión CDP

Puedes verificar que Chrome está exponiendo CDP correctamente visitando:

```
http://localhost:9222/json
```

Deberías ver un JSON con información sobre las tabs abiertas y sus WebSocket URLs.

## Troubleshooting

### Error: "WebSocket connection failed"

**Causa:** Chrome no está corriendo con remote debugging o el puerto está ocupado.

**Solución:**
```bash
# Verifica que el puerto esté abierto
lsof -i :9222

# Si hay un proceso, mátalo y relanza Chrome
pkill -f "remote-debugging-port=9222"
# Luego relanza con el comando del paso 1
```

### Error: "Target closed"

**Causa:** El navegador se cerró durante la ejecución.

**Solución:** Mantén el navegador abierto mientras corren los tests.

### Permisos no se guardan

**Causa:** No estás usando `--user-data-dir` o el directorio cambia.

**Solución:** Usa siempre el mismo path en `--user-data-dir`.

### Tests fallan con CDP

**Causa:** Algunas funcionalidades de browser-use son limitadas con CDP.

**Solución:** Para funcionalidad completa, usa `BROWSER_EXECUTION_MODE=local` sin CDP URL.

## Automatizar con Script

Puedes crear un script para facilitar el proceso:

**start-chrome-debug.sh:**
```bash
#!/bin/bash
# Mata cualquier instancia de Chrome con debugging
pkill -f "remote-debugging-port=9222"

# Espera un segundo
sleep 1

# Lanza Chrome con debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug" \
  --disable-blink-features=AutomationControlled \
  > /dev/null 2>&1 &

echo "Chrome launched with remote debugging on port 9222"
echo "CDP URL: http://localhost:9222"
```

Luego ejecuta:
```bash
chmod +x start-chrome-debug.sh
./start-chrome-debug.sh
```
