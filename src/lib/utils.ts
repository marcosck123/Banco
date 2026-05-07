/**
 * Format a number as Brazilian Real currency
 * e.g., 1234.56 => "R$ 1.234,56"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Format a date to "dd/mm/yyyy"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

/**
 * Get month name in Portuguese
 */
export function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return months[month - 1] || ''
}

export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Moradia',
  'Outros',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_ICONS: Record<string, string> = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Lazer': '🎉',
  'Saúde': '🏥',
  'Moradia': '🏠',
  'Outros': '📦',
}
