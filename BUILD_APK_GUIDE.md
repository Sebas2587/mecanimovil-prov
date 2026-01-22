# 🛠️ Guía para Crear APK de MecaniMóvil Proveedores

Esta guía te mostrará **3 métodos diferentes** para crear una APK instalable de la aplicación MecaniMóvil Proveedores para dispositivos Android.

## 🚀 Método 1: Script Automático (Recomendado)

### Ejecución Rápida
```bash
# Desde el directorio mecanimovil-app-proveedores/
./create-apk.sh
```

El script automáticamente:
- ✅ Verifica e instala dependencias (Node.js, Expo CLI, Java)
- ✅ Detecta o ayuda a instalar Android SDK
- ✅ Genera archivos nativos de Android
- ✅ Compila la APK
- ✅ Proporciona instrucciones detalladas

---

## 🌐 Método 2: EAS Build (En la Nube)

### Ventajas
- ✅ No requiere Android SDK local
- ✅ Compilación rápida en servidores de Expo
- ✅ Manejo automático de dependencias
- ✅ Firmado automático para distribución

### Pasos

#### 1. Crear cuenta en Expo
Visita [https://expo.dev](https://expo.dev) y crea una cuenta gratuita.

#### 2. Instalar EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

#### 3. Iniciar sesión
```bash
eas login
```

#### 4. Configurar el proyecto (Ya está configurado)
```bash
# Ya tienes estos archivos configurados:
# - eas.json
# - app.json (con configuración Android)
```

#### 5. Crear build de APK
```bash
# Para APK de prueba (recomendado)
eas build --platform android --profile preview

# Para build de producción (genera AAB)
eas build --platform android --profile production
```

#### 6. Descargar APK
- Ve a [https://expo.dev/accounts/[tu-usuario]/projects/mecanimovil-app-proveedores/builds](https://expo.dev)
- Descarga la APK cuando esté lista (5-10 minutos)

### Configuración EAS (Ya incluida)

**eas.json:**
```json
{
  "cli": { "version": ">= 8.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## 🏠 Método 3: Build Local (Avanzado)

### Requisitos Previos

#### 1. Java JDK 17
```bash
# macOS (con Homebrew)
brew install openjdk@17

# Configurar variables de entorno
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 2. Android SDK
**Opción A: Android Studio (Recomendado)**
1. Descarga [Android Studio](https://developer.android.com/studio)
2. Instala SDK a través del Android Studio
3. Configura variables de entorno:
```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
source ~/.zshrc
```

**Opción B: Solo Command Line Tools**
```bash
brew install --cask android-commandlinetools
```

### Pasos para Build Local

#### 1. Generar archivos nativos
```bash
npx expo prebuild --platform android --clear
```

#### 2. Configurar Android SDK path
```bash
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
```

#### 3. Compilar APK
```bash
./gradlew assembleRelease
```

#### 4. Localizar APK generada
```bash
# La APK estará en:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Instalar APK en Dispositivo Android

### Preparar el Dispositivo

1. **Habilitar Depuración USB:**
   - Configuración → Acerca del teléfono
   - Toca "Número de compilación" 7 veces
   - Regresa a Configuración → Opciones de desarrollador
   - Activa "Depuración USB"

2. **Permitir Fuentes Desconocidas:**
   - Configuración → Seguridad
   - Activa "Fuentes desconocidas" o "Instalar apps desconocidas"

### Métodos de Instalación

#### Método 1: ADB (USB)
```bash
# Conectar dispositivo por USB
adb devices

# Instalar APK
adb install mecanimovil-proveedores-v1.0.0.apk
```

#### Método 2: Transferencia de Archivo
1. Transfiere la APK al dispositivo (USB, email, cloud)
2. Abre un explorador de archivos en el dispositivo
3. Navega hasta la APK y tócala
4. Confirma la instalación

#### Método 3: URL Directa (EAS Build)
1. Abre el link de descarga de EAS en el dispositivo
2. La APK se descargará automáticamente
3. Toca para instalar

---

## 🔧 Configuración de la App

### Variables de Entorno

Antes de compilar, asegúrate de configurar la URL del backend:

**Para desarrollo local:**
```bash
# En tu archivo .env o directamente en el código
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api  # Android Emulator
# o
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:8000/api  # IP de tu computadora
```

**Para producción:**
```bash
EXPO_PUBLIC_API_BASE_URL=https://tu-servidor.com/api
```

### Configuración del Backend

Asegúrate de que el backend Django esté configurado para aceptar conexiones:

```python
# settings.py
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '10.0.2.2', 'tu-ip-local']

# Para desarrollo, permitir CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://10.0.2.2:8000",
]
```

---

## 🐛 Solución de Problemas

### Error: "SDK location not found"
**Solución:**
```bash
# Crear archivo local.properties en android/
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Error: "Java Runtime not found"
**Solución:**
```bash
# Instalar Java y configurar JAVA_HOME
brew install openjdk@17
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

### Error: "Command 'eas' not found"
**Solución:**
```bash
npm install -g @expo/cli eas-cli
```

### Error: "Build failed with gradle"
**Soluciones:**
1. Limpiar proyecto: `cd android && ./gradlew clean`
2. Regenerar: `npx expo prebuild --platform android --clear`
3. Verificar versiones de Java (usa JDK 17)

### App se cierra inmediatamente
**Posibles causas:**
1. URL del backend incorrecta
2. Permisos faltantes
3. Certificado de desarrollo no válido

**Soluciones:**
1. Verificar logs: `adb logcat | grep -i expo`
2. Usar build de desarrollo: `eas build --profile development`
3. Probar en emulador primero

---

## 📋 Checklist de Verificación

Antes de crear la APK:

- [ ] Backend Django ejecutándose y accesible
- [ ] URL del backend configurada correctamente
- [ ] Credenciales de prueba disponibles (jeferson/123456)
- [ ] Permisos de Android configurados
- [ ] Variables de entorno establecidas
- [ ] Dependencias instaladas (`npm install`)

Después de crear la APK:

- [ ] APK instalada correctamente
- [ ] App abre sin errores
- [ ] Login funciona
- [ ] Navegación entre pantallas funciona
- [ ] API calls al backend funcionan
- [ ] Imagenes y assets cargan correctamente

---

## 🚀 Automatización Completa

Para automatizar todo el proceso, usa el script incluido:

```bash
# Hacer ejecutable (solo la primera vez)
chmod +x create-apk.sh

# Ejecutar script completo
./create-apk.sh
```

El script te guiará a través de:
1. Verificación de dependencias
2. Instalación automática de herramientas faltantes
3. Generación de archivos nativos
4. Compilación de APK
5. Instrucciones de instalación

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs:** `npx expo start` y busca errores
2. **Limpia el proyecto:** `npx expo prebuild --clear`
3. **Regenera node_modules:** `rm -rf node_modules && npm install`
4. **Consulta la documentación:** [Expo Build Docs](https://docs.expo.dev/build/introduction/)

**Contacto:** desarrollo@mecanimovil.com

---

## 📱 Información de la APK Generada

- **Nombre:** MecaniMóvil Proveedores
- **Package:** com.mecanimovil.proveedores
- **Versión:** 1.0.0 (versionCode: 1)
- **Tamaño aproximado:** 50-80 MB
- **Compatibilidad:** Android 7.0+ (API 24+)
- **Permisos:** Cámara, Almacenamiento, Ubicación

¡Listo para probar la aplicación en dispositivos Android reales! 🎉 