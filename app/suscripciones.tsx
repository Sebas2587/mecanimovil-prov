/**
 * suscripciones.tsx — redirect a /creditos (tab Suscripción)
 *
 * La pantalla de suscripciones fue unificada con la pantalla de créditos.
 * Este archivo se mantiene para compatibilidad de rutas existentes.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function SuscripcionesRedirect() {
    useEffect(() => {
        // Redirigir inmediatamente a la pantalla unificada
        router.replace('/creditos');
    }, []);

    return null;
}
