import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="tipo-cuenta" 
        options={{ 
          title: 'Tipo de Cuenta',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="informacion-basica" 
        options={{ 
          title: 'Información Básica',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="especialidades" 
        options={{ 
          title: 'Especialidades',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="marcas" 
        options={{ 
          title: 'Marcas de Vehículos',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="documentacion" 
        options={{ 
          title: 'Documentación',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="finalizar" 
        options={{ 
          title: 'Finalizar Registro',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="revision" 
        options={{ 
          title: 'En Revisión',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="subir-documentos" 
        options={{ 
          title: 'Subir Documentos',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="cuenta-en-revision" 
        options={{ 
          title: 'Cuenta en Revisión',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="finalizar-basico" 
        options={{ 
          title: 'Finalizar Onboarding Básico',
          headerShown: false 
        }} 
      />
    </Stack>
  );
} 