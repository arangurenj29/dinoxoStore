import { createWhatsAppHref } from './contact';

export interface DemoProduct {
  denomination: string;
  delivery: string;
  id: string;
  platform: string;
  region: string;
}

export const demoProducts: readonly DemoProduct[] = [
  {
    id: 'platform-01',
    platform: 'Plataforma demo 01',
    region: 'Región por confirmar',
    denomination: 'USD 10',
    delivery: 'Disponibilidad por confirmar',
  },
  {
    id: 'platform-02',
    platform: 'Plataforma demo 02',
    region: 'Región por confirmar',
    denomination: 'USD 10',
    delivery: 'Disponibilidad por confirmar',
  },
  {
    id: 'platform-03',
    platform: 'Plataforma demo 03',
    region: 'Región por confirmar',
    denomination: 'USD 10',
    delivery: 'Disponibilidad por confirmar',
  },
];

export function productWhatsAppHref(product: DemoProduct) {
  return createWhatsAppHref(
    `Hola, quiero consultar por ${product.platform}, ${product.denomination}.`,
  );
}
