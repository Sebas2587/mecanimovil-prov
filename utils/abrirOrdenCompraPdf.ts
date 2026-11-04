import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Guarda el PDF en caché y abre la hoja de compartir. */
export async function abrirOrdenCompraPdf(bytes: Uint8Array, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(bytes);
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('sharing-unavailable');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'PDF para casa de repuestos',
  });
}
