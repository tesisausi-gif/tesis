'use server'

/**
 * Servicio de Documentos y Fotos
 * Gestiona uploads a Supabase Storage (bucket: documentos)
 */

import { STORAGE_BUCKET, STORAGE_PATHS } from './documentos.types'
import type { ActionResult } from '@/shared/types'

/**
 * Sube una foto de inspección al bucket 'documentos' y guarda la URL en la DB.
 * Recibe FormData porque los archivos solo pueden enviarse desde el browser.
 */
export async function subirFotoInspeccion(
  idInspeccion: number,
  formData: FormData
): Promise<ActionResult<string>> {
  try {
    const archivo = formData.get('archivo') as File | null

    if (!archivo || archivo.size === 0) {
      return { success: false, error: 'No se recibió ningún archivo' }
    }

    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: 'El archivo supera el límite de 10 MB' }
    }

    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    const ext = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `${STORAGE_PATHS.inspecciones(idInspeccion)}/${nombreArchivo}`

    const buffer = await archivo.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: archivo.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)

    // Guardar URL en la base de datos
    const { agregarFotosAInspeccion } = await import('@/features/inspecciones/inspecciones.service')
    const result = await agregarFotosAInspeccion(idInspeccion, [publicUrl])

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: publicUrl }
  } catch (error) {
    return { success: false, error: 'Error inesperado al subir foto' }
  }
}

/**
 * Elimina una foto de una inspección (del Storage y de la DB).
 */
export async function eliminarFotoInspeccion(
  idInspeccion: number,
  fotoUrl: string
): Promise<ActionResult> {
  try {
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    // Extraer el path relativo del bucket desde la URL pública
    const url = new URL(fotoUrl)
    const pathSegments = url.pathname.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`)
    const storagePath = pathSegments[1]

    // Eliminar del Storage
    if (storagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    }

    // NOTA: la columna fotos_url no existe en el esquema actual de producción.
    // La URL solo se elimina del Storage. Aplicar migración para habilitar persistencia en DB.
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al eliminar foto' }
  }
}
