import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'card',
        animation: 'slide_from_right',
        gestureDirection: 'horizontal',
      }}
    >
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