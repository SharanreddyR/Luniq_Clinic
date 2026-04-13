/** Trim and uppercase card numbers for display consistency */
export function formatCardDisplay(cardNumber: string): string {
  return cardNumber.trim().toUpperCase();
}
