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
  icon.className = 'icon icon--whatsapp-contact';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createCard(product, index) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variant = variants[0];
  const media = Array.isArray(product.media) ? product.media : [];
  const cover = media.find((item) => item?.url) ?? media[0];
  const card = document.createElement('article');
  card.className = 'catalog-card';
  card.dataset.reveal = 'card';
  card.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 80}ms`);

  const banner = document.createElement('div');
  banner.className = 'catalog-card__banner';

  if (cover) {
    const frame = document.createElement('div');
    frame.className = 'catalog-card__media';
    const image = document.createElement('img');
    image.src = cover.url;
    image.alt = text(cover.alt_text, product.name);
    image.loading = 'lazy';
    if (cover.width) image.width = cover.width;
    if (cover.height) image.height = cover.height;
    frame.append(image);
    banner.append(frame);
  }

  const body = document.createElement('div');
  body.className = 'catalog-card__body';

  const status = document.createElement('p');
  status.className = 'catalog-card__status';
  status.textContent = 'Disponible para consultar';
  body.append(status);

  const heading = document.createElement('h3');
  heading.textContent = product.name;
  body.append(heading);

  const details = document.createElement('dl');
  const platforms = uniqueValues(
    variants.map((item) => text(item.platform, 'Consultar')),
  );
  const regions = uniqueValues(
    variants.map((item) => text(item.region, 'Consultar')),
  );
  const prices = uniqueValues(variants.map((item) => formatPrice(item)));
  const fields = [
    ['Precio', prices.length ? prices.join(' · ') : 'Consultar'],
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
  body.append(details);

  const link = document.createElement('a');
  link.className = 'button-link button-link--secondary';
  link.href = `https://wa.me/584268158785?text=${encodeURIComponent(`Hola, quiero consultar por ${product.name}${variant ? `, ${variant.name}` : ''}.`)}`;
  link.append(createIcon());
  const label = document.createElement('span');
  label.textContent = 'Consultar producto';
  link.append(label);
  body.append(link);

  banner.append(body);
  card.append(banner);
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

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('motion-ready');
  const revealSelector = '[data-reveal]';
  const revealElements = (root) => root.querySelectorAll(revealSelector);

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );

    const observeReveal = (root) => {
      for (const element of revealElements(root)) {
        if (element.dataset.revealObserved) continue;
        element.dataset.revealObserved = 'true';
        revealObserver.observe(element);
      }
    };

    observeReveal(document);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(revealSelector)) {
            node.dataset.revealObserved = 'true';
            revealObserver.observe(node);
          }
          observeReveal(node);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.documentElement.classList.remove('motion-ready');
  }

  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  let framePending = false;
  const updateScrollEffects = () => {
    const scrollY = window.scrollY;
    header?.classList.toggle('is-scrolled', scrollY > 24);
    if (hero instanceof HTMLElement) {
      const progress = Math.min(scrollY / Math.max(hero.offsetHeight, 1), 1);
      hero.style.setProperty('--hero-progress', progress.toFixed(3));
    }
    framePending = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(updateScrollEffects);
    },
    { passive: true },
  );
  updateScrollEffects();

  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', (event) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest('.catalog-card');
      if (!(card instanceof HTMLElement)) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    });
  }
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
    for (const [index, product] of products.entries()) {
      fragment.append(createCard(product, index));
    }
    grid.dataset.catalogState = 'ready';
    grid.replaceChildren(fragment);
  } catch {
    showCatalogState(
      grid,
      'No pudimos cargar el catálogo. Escribinos por WhatsApp para consultar disponibilidad.',
    );
  }
}

initMotion();
void loadCatalog();
