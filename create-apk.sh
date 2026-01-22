#!/bin/bash

echo "🚀 Script para crear APK de MecaniMóvil Proveedores"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_step "1. Verificando dependencias..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi

print_step "2. Instalando dependencias del proyecto..."
npm install

print_step "3. Verificando/Instalando Expo CLI..."
if ! command -v expo &> /dev/null; then
    print_warning "Instalando Expo CLI..."
    npm install -g @expo/cli
fi

print_step "4. Verificando Java..."
if ! command -v java &> /dev/null; then
    if command -v brew &> /dev/null; then
        print_warning "Instalando OpenJDK 17..."
        brew install openjdk@17
        
        # Configurar JAVA_HOME
        export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
        export PATH="$JAVA_HOME/bin:$PATH"
        
        # Agregar al shell profile
        echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
        echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
        
        print_step "Java configurado. Reinicia la terminal después de la instalación."
    else
        print_error "Homebrew no está instalado. Instala Java manualmente desde https://adoptopenjdk.net/"
        exit 1
    fi
else
    print_step "Java ya está instalado"
fi

print_step "5. Verificando Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    print_warning "ANDROID_HOME no está configurado"
    
    # Intentar encontrar Android SDK en ubicaciones comunes
    POTENTIAL_ANDROID_HOMES=(
        "$HOME/Library/Android/sdk"
        "$HOME/Android/Sdk"
        "/usr/local/android-sdk"
        "/opt/android-sdk"
    )
    
    for path in "${POTENTIAL_ANDROID_HOMES[@]}"; do
        if [ -d "$path" ]; then
            export ANDROID_HOME="$path"
            export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
            print_step "Android SDK encontrado en: $path"
            break
        fi
    done
    
    if [ -z "$ANDROID_HOME" ]; then
        print_error "Android SDK no encontrado. Opciones:"
        echo "  1. Instala Android Studio desde https://developer.android.com/studio"
        echo "  2. O instala solo SDK usando:"
        echo "     brew install --cask android-commandlinetools"
        echo "  3. Luego configura ANDROID_HOME en tu ~/.zshrc"
        echo ""
        print_warning "Continuando sin Android SDK (se puede usar EAS Build en la nube)..."
    fi
else
    print_step "Android SDK encontrado en: $ANDROID_HOME"
fi

print_step "6. Generando archivos nativos de Android..."
npx expo prebuild --platform android --clear

print_step "7. Intentando compilar APK..."

if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    print_step "Compilando APK localmente..."
    cd android
    
    # Crear archivo local.properties si no existe
    if [ ! -f "local.properties" ]; then
        echo "sdk.dir=$ANDROID_HOME" > local.properties
        print_step "Creado local.properties con SDK path"
    fi
    
    # Compilar APK
    if ./gradlew assembleRelease; then
        print_step "✨ APK compilada exitosamente!"
        
        # Encontrar la APK generada
        APK_PATH=$(find . -name "*.apk" -path "*/outputs/apk/release/*" | head -1)
        if [ -n "$APK_PATH" ]; then
            FINAL_APK_PATH="../mecanimovil-proveedores-v1.0.0.apk"
            cp "$APK_PATH" "$FINAL_APK_PATH"
            print_step "APK copiada a: $FINAL_APK_PATH"
            print_step "Tamaño: $(ls -lh "$FINAL_APK_PATH" | awk '{print $5}')"
        fi
    else
        print_error "Error compilando APK localmente"
        print_warning "Puedes intentar usar EAS Build en la nube"
    fi
    cd ..
else
    print_warning "Sin Android SDK local, mostrando opciones alternativas..."
fi

echo ""
echo "📋 OPCIONES PARA CREAR APK:"
echo "=========================="
echo ""
echo "OPCIÓN 1: EAS Build (Recomendado - En la nube)"
echo "----------------------------------------------"
echo "1. Crea una cuenta en https://expo.dev"
echo "2. Ejecuta: eas login"
echo "3. Ejecuta: eas build --platform android --profile preview"
echo "4. Descarga la APK desde el dashboard"
echo ""
echo "OPCIÓN 2: Build Local (Requiere Android SDK)"
echo "--------------------------------------------"
echo "1. Instala Android Studio: https://developer.android.com/studio"
echo "2. Configura ANDROID_HOME en ~/.zshrc:"
echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk"
echo "   export PATH=\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools:\$PATH"
echo "3. Ejecuta este script nuevamente"
echo ""
echo "OPCIÓN 3: Expo Development Build"
echo "-------------------------------"
echo "1. Instala Expo Go en tu dispositivo"
echo "2. Ejecuta: npx expo start"
echo "3. Escanea el QR code"
echo ""

if [ -f "mecanimovil-proveedores-v1.0.0.apk" ]; then
    echo "🎉 ¡APK LISTA PARA INSTALAR!"
    echo "Archivo: mecanimovil-proveedores-v1.0.0.apk"
    echo ""
    echo "Para instalar en Android:"
    echo "1. Transfiere la APK a tu dispositivo Android"
    echo "2. Habilita 'Instalar apps de fuentes desconocidas'"
    echo "3. Toca la APK para instalar"
fi

echo ""
print_step "Script completado" 