#!/bin/bash

echo "🚀 Creando APK Simple de MecaniMóvil Proveedores"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Método 1: Intentar usar EAS Build local
print_step "Método 1: Intentando EAS Build local..."

if command -v eas &> /dev/null; then
    print_step "EAS CLI encontrado, creando build..."
    
    # Crear build sin necesidad de login específico
    if eas build --platform android --profile preview --local --non-interactive; then
        print_step "✨ ¡APK creada exitosamente con EAS!"
        
        # Buscar la APK generada
        find . -name "*.apk" -type f 2>/dev/null | head -1 | while read apk_path; do
            if [ -n "$apk_path" ]; then
                final_path="./mecanimovil-proveedores-v1.0.0.apk"
                cp "$apk_path" "$final_path"
                print_step "APK copiada a: $final_path"
                print_step "Tamaño: $(ls -lh "$final_path" | awk '{print $5}')"
                
                echo ""
                echo "🎉 ¡APK LISTA!"
                echo "📍 Ubicación: $(pwd)/$final_path"
                echo ""
                echo "Para instalar en Android:"
                echo "1. Conecta tu dispositivo Android por USB"
                echo "2. Habilita 'Depuración USB' y 'Fuentes desconocidas'"
                echo "3. Transfiere la APK al dispositivo"
                echo "4. Toca la APK para instalar"
                echo ""
                echo "🔑 Credenciales de prueba:"
                echo "   Usuario: jeferson"
                echo "   Contraseña: 123456"
                
                exit 0
            fi
        done
    else
        print_warning "EAS Build local falló, intentando método 2..."
    fi
else
    print_warning "EAS CLI no encontrado, intentando método 2..."
fi

# Método 2: Usar Expo export y create manual APK
print_step "Método 2: Creando bundle web y APK manual..."

print_step "Exportando proyecto Expo..."
if npx expo export --platform android --output-dir ./dist; then
    print_step "Export exitoso"
    
    # Crear estructura APK básica
    mkdir -p ./apk-build/assets
    cp -r ./dist/* ./apk-build/assets/
    
    print_step "Archivos exportados a ./apk-build/"
    
    echo ""
    echo "📋 OPCIONES DISPONIBLES:"
    echo "======================"
    echo ""
    echo "OPCIÓN 1: APK Web (Híbrida)"
    echo "---------------------------"
    echo "Los archivos están en: ./apk-build/"
    echo "Puedes usar tools online como 'APK Builder' para crear APK"
    echo ""
    echo "OPCIÓN 2: EAS Build en la Nube (Recomendado)"
    echo "--------------------------------------------"
    echo "1. Ve a: https://expo.dev (crea cuenta gratis)"
    echo "2. Ejecuta: eas login"
    echo "3. Ejecuta: eas build --platform android --profile preview"
    echo "4. Descarga APK en 5-10 minutos"
    echo ""
    echo "OPCIÓN 3: Usar Expo Go (Testing Inmediato)"
    echo "-------------------------------------------"
    echo "1. Instala 'Expo Go' en tu teléfono Android"
    echo "2. Ejecuta: npx expo start"
    echo "3. Escanea el QR code con Expo Go"
    echo "4. La app se ejecutará directamente"
    
else
    print_error "Export falló"
fi

# Método 3: Expo development mode
print_step "Método 3: Expo Development Mode (Testing Inmediato)"

echo ""
echo "🔥 OPCIÓN MÁS RÁPIDA PARA TESTING:"
echo "=================================="
echo ""
echo "1. Instala 'Expo Go' desde Google Play Store"
echo "2. Ejecuta en otra terminal: npx expo start"
echo "3. Escanea el QR code con Expo Go"
echo "4. ¡La app funcionará inmediatamente!"
echo ""
echo "Esta opción no requiere APK y permite testing inmediato."

echo ""
print_step "Script completado"
echo ""
echo "Para generar APK oficial, recomiendo usar EAS Build:"
echo "eas build --platform android --profile preview" 