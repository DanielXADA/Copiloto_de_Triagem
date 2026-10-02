/**
 * Utilitários de Máscaras Brasileiras (Nativas, sem dependências legadas)
 * Compatíveis com React 19, SSR e TanStack Start
 */

/**
 * Remove qualquer caractere não numérico da string
 */
export function normalizeDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Máscara de CPF: 000.000.000-00 (máximo 11 dígitos)
 */
export function formatCpf(value: string | null | undefined): string {
  const digits = normalizeDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Máscara de CNPJ: 00.000.000/0000-00 (máximo 14 dígitos)
 */
export function formatCnpj(value: string | null | undefined): string {
  const digits = normalizeDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Máscara dinâmica de Telefone/WhatsApp:
 * Fixo (10 dígitos): (00) 0000-0000
 * Celular (11 dígitos): (00) 00000-0000
 */
export function formatPhone(value: string | null | undefined): string {
  const digits = normalizeDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Máscara de CEP: 00000-000 (máximo 8 dígitos)
 */
export function formatCep(value: string | null | undefined): string {
  const digits = normalizeDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export type MaskType = "cpf" | "cnpj" | "phone" | "cep";

/**
 * Aplica máscara de acordo com o tipo especificado
 */
export function applyMask(value: string, mask: MaskType): string {
  switch (mask) {
    case "cpf":
      return formatCpf(value);
    case "cnpj":
      return formatCnpj(value);
    case "phone":
      return formatPhone(value);
    case "cep":
      return formatCep(value);
    default:
      return value;
  }
}
