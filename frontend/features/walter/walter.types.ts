export type WalterRol = 'cliente' | 'tecnico' | 'admin'

export interface WalterMessage {
  role: 'user' | 'assistant'
  content: string
  imageBase64?: string
  imageMimeType?: string
}

export interface WalterSuggestedAction {
  type: 'reportar_incidente'
  label: string
  url: string
}

export interface WalterResponse {
  success: boolean
  content?: string
  suggestedAction?: WalterSuggestedAction
  error?: string
}

export interface WalterQuickAction {
  id: string
  label: string
  message: string
  icon: string
}
