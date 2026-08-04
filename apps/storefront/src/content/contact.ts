export const whatsappNumber = '584241140038';
const whatsappMessage =
  'Hola, quiero consultar por una recarga digital en Dinoxo Store.';

export function createWhatsAppHref(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const whatsappHref = createWhatsAppHref(whatsappMessage);
