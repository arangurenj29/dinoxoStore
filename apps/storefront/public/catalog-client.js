function text(value, fallback) {
  return value?.trim() || fallback;
}

function formatPrice(variant) {
  if (variant.price_minor === null)
    return text(variant.denomination, 'Consultar');
  try {
    return new Intl.NumberFormat('es-VE', {
      currency: variant.currency,
      style: 'currency',
    }).format(variant.price_minor / 100);
  } catch {
    return `${variant.currency} ${(variant.price_minor / 100).toFixed(2)}`;
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function createIcon() {
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.setProperty(
    '--icon-source',
    "url('/brand/icons/whatsapp-contact.svg')",
  );
  return icon;
}

function createCard(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variant = variants[0];
  const card = document.createElement('article');
  card.className = 'catalog-card';

  const status = document.createElement('p');
  status.className = 'catalog-card__status';
  status.textContent = 'Disponible para consultar';
  card.append(status);

  const heading = document.createElement('h3');
  heading.textContent = product.name;
  card.append(heading);

  const details = document.createElement('dl');
  const platforms = uniqueValues(
    variants.map((item) => text(item.platform, 'Consultar')),
  );
  const regions = uniqueValues(
    variants.map((item) => text(item.region, 'Consultar')),
  );
  const prices = uniqueValues(variants.map((item) => formatPrice(item)));
  const fields = [
    ['Valores', prices.length ? prices.join(' · ') : 'Consultar'],
    ['Plataforma', platforms.length ? platforms.join(' · ') : 'Consultar'],
    ['Región', regions.length ? regions.join(' · ') : 'Consultar'],
    ['Entrega', 'Atención por WhatsApp'],
  ];
  for (const [label, value] of fields) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    row.append(term, description);
    details.append(row);
  }
  card.append(details);

  const link = document.createElement('a');
  link.className = 'button-link button-link--secondary';
  link.href = `https://wa.me/584268158785?text=${encodeURIComponent(`Hola, quiero consultar por ${product.name}${variant ? `, ${variant.name}` : ''}.`)}`;
  link.append(createIcon());
  const label = document.createElement('span');
  label.textContent = 'Consultar producto';
  link.append(label);
  card.append(link);
  return card;
}

function showCatalogState(grid, message) {
  grid.dataset.catalogState = 'empty';
  const state = document.createElement('p');
  state.className = 'catalog-state';
  state.setAttribute('role', 'status');
  state.textContent = message;
  grid.replaceChildren(state);
}

async function loadCatalog() {
  const grid = document.querySelector('[data-catalog-grid]');
  if (!grid) return;

  try {
    const response = await fetch('/api/catalog', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      showCatalogState(
        grid,
        'No pudimos cargar el catálogo. Escribinos por WhatsApp para consultar disponibilidad.',
      );
      return;
    }
    const payload = await response.json();
    const products = Array.isArray(payload.products)
      ? payload.products.filter(
          (product) =>
            typeof product?.id === 'string' &&
            typeof product?.name === 'string' &&
            Array.isArray(product.variants),
        )
      : [];
    if (products.length === 0) {
      showCatalogState(
        grid,
        'Todavía no hay productos publicados. Escribinos por WhatsApp y te ayudamos.',
      );
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const product of products) fragment.append(createCard(product));
    grid.dataset.catalogState = 'ready';
    grid.replaceChildren(fragment);
  } catch {
    showCatalogState(
      grid,
      'No pudimos cargar el catálogo. Escribinos por WhatsApp para consultar disponibilidad.',
    );
  }
}

void loadCatalog();
