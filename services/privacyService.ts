import api from './api';

export const exportMyData = async () => {
  const { data } = await api.get('/usuarios/mis-datos/export/');
  return data;
};

export const getNotificationPreferences = async () => {
  const { data } = await api.get('/usuarios/preferencias-notificacion/');
  return data;
};

export const updateNotificationPreferences = async (payload: Record<string, boolean>) => {
  const { data } = await api.patch('/usuarios/preferencias-notificacion/', payload);
  return data;
};

export const getDeleteAccountStatus = async () => {
  const { data } = await api.get('/usuarios/eliminar-cuenta/estado/');
  return data;
};

export const deleteAccount = async (password: string) => {
  const { data } = await api.post('/usuarios/eliminar-cuenta/', {
    password,
    confirmacion: 'ELIMINAR',
  });
  return data;
};

export const getConsentStatus = async () => {
  const { data } = await api.get('/usuarios/consentimiento/estado/');
  return data;
};

export const registerLegalConsent = async () => {
  const { data } = await api.post('/usuarios/consentimiento/registrar/', {
    acepta_terminos: true,
    acepta_privacidad: true,
    canal: 'app_prov',
  });
  return data;
};

export const getLocationConsentStatus = async () => {
  const { data } = await api.get('/usuarios/consentimiento/ubicacion/estado/');
  return data as { tiene_consentimiento_ubicacion: boolean; version_documento: string };
};

export const registerLocationConsent = async () => {
  const { data } = await api.post('/usuarios/consentimiento/ubicacion/registrar/', {
    acepta_ubicacion: true,
    canal: 'app_prov',
  });
  return data;
};
