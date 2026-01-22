import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Iniciar Sesión',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="registro" 
        options={{ 
          title: 'Registro',
          headerShown: false 
        }} 
      />
    </Stack>
  );
} 