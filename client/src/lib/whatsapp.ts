/** Build a wa.me link from a store phone/WhatsApp string (Ghana-friendly). */
export function whatsappUrl(phone: string | undefined | null, text?: string): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  if (digits.length === 9) digits = `233${digits}`;
  if (digits.length < 10) return null;
  const base = `https://wa.me/${digits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
