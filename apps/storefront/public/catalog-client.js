function text(value, fallback) {
  return value?.trim() || fallback;
}

function formatPrice(variant) {
  if (variant.price_minor === null)
    return text(variant.denomination, "Consultar");
  try {
    return new Intl.NumberFormat("es-VE", {
      currency: variant.currency,
      style: "currency",
    }).format(variant.price_minor / 100);
  } catch (_) {
    return `${variant.currency} ${(variant.price_minor / 100).toFixed(2)}`;
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function createIcon() {
  const icon = document.createElement("span");
  icon.className = "icon icon--whatsapp-contact";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createControls(grid) {
  const controls = document.createElement("div");
  controls.className = "catalog-carousel__controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Navegar productos");

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "catalog-carousel__button";
  previous.setAttribute("aria-label", "Producto anterior");
  previous.textContent = "‹";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "catalog-carousel__button";
  next.setAttribute("aria-label", "Siguiente producto");
  next.textContent = "›";

  const updateDisabled = () => {
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    previous.disabled = grid.scrollLeft <= 0;
    next.disabled = grid.scrollLeft >= maxScroll - 1;
  };

  const scrollByCard = () => {
    const card = grid.querySelector(".catalog-card");
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    return card ? card.offsetWidth + gap : grid.clientWidth;
  };

  previous.addEventListener("click", () => {
    grid.scrollBy({ left: -scrollByCard(), behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    grid.scrollBy({ left: scrollByCard(), behavior: "smooth" });
  });

  grid.addEventListener("scroll", updateDisabled, { passive: true });
  controls.append(previous, next);
  grid.parentElement?.append(controls);
  updateDisabled();
  return controls;
}

function createCard(product, index) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variant = variants[0];
  const media = Array.isArray(product.media) ? product.media : [];
  const cover = media.find((item) => item?.url) ?? media[0];
  const card = document.createElement("article");
  card.className = "catalog-card";
  card.dataset.reveal = "card";
  card.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 80}ms`);

  const banner = document.createElement("div");
  banner.className = "catalog-card__banner";

  if (cover) {
    const frame = document.createElement("div");
    frame.className = "catalog-card__media";
    const image = document.createElement("img");
    image.src = cover.url;
    image.alt = text(cover.alt_text, product.name);
    image.loading = "lazy";
    if (cover.width) image.width = cover.width;
    if (cover.height) image.height = cover.height;
    frame.append(image);
    banner.append(frame);
  }

  const body = document.createElement("div");
  body.className = "catalog-card__body";

  const status = document.createElement("p");
  status.className = "catalog-card__status";
  status.textContent = "Disponible para consultar";
  body.append(status);

  const heading = document.createElement("h3");
  heading.textContent = product.name;
  body.append(heading);

  const details = document.createElement("dl");
  const platforms = uniqueValues(
    variants.map((item) => text(item.platform, "Consultar")),
  );
  const regions = uniqueValues(
    variants.map((item) => text(item.region, "Consultar")),
  );
  const prices = uniqueValues(variants.map((item) => formatPrice(item)));
  const fields = [
    ["Precio", prices.length ? prices.join(" · ") : "Consultar"],
    ["Plataforma", platforms.length ? platforms.join(" · ") : "Consultar"],
    ["Región", regions.length ? regions.join(" · ") : "Consultar"],
    ["Entrega", "Atención por WhatsApp"],
  ];
  for (const [label, value] of fields) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    row.append(term, description);
    details.append(row);
  }
  body.append(details);

  const link = document.createElement("a");
  link.className = "button-link button-link--secondary";
  link.href = `https://wa.me/584268158785?text=${encodeURIComponent(`Hola, quiero consultar por ${product.name}${variant ? `, ${variant.name}` : ""}.`)}`;
  link.append(createIcon());
  const label = document.createElement("span");
  label.textContent = "Consultar producto";
  link.append(label);
  body.append(link);

  banner.append(body);
  card.append(banner);
  return card;
}

function showCatalogState(grid, message) {
  grid.dataset.catalogState = "empty";
  const state = document.createElement("p");
  state.className = "catalog-state";
  state.setAttribute("role", "status");
  state.textContent = message;
  grid.replaceChildren(state);
}

function initMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.documentElement.classList.add("motion-ready");
  const revealSelector = "[data-reveal]";
  const revealElements = (root) => root.querySelectorAll(revealSelector);

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    const observeReveal = (root) => {
      for (const element of revealElements(root)) {
        if (element.dataset.revealObserved) continue;
        element.dataset.revealObserved = "true";
        revealObserver.observe(element);
      }
    };

    observeReveal(document);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(revealSelector)) {
            node.dataset.revealObserved = "true";
            revealObserver.observe(node);
          }
          observeReveal(node);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.documentElement.classList.remove("motion-ready");
  }

  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  let framePending = false;
  const updateScrollEffects = () => {
    const scrollY = window.scrollY;
    header?.classList.toggle("is-scrolled", scrollY > 24);
    if (hero instanceof HTMLElement) {
      const progress = Math.min(scrollY / Math.max(hero.offsetHeight, 1), 1);
      hero.style.setProperty("--hero-progress", progress.toFixed(3));
    }
    framePending = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(updateScrollEffects);
    },
    { passive: true },
  );
  updateScrollEffects();

  if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener("pointermove", (event) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest(".catalog-card");
      if (!(card instanceof HTMLElement)) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    });
  }
}

const SUPABASE_URL = "https://yvbrvclbqmvxxtfehxxp.supabase.co";
const SUPABASE_KEY = "sb_publishable_5Osn2s-bQqLKeGm0BZ5ayA_Efh7gLjP";

async function fetchCatalogDirectly() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=*,product_media(*),product_variants(*)&status=eq.published&archived_at=is.null`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  if (!response.ok) throw new Error("Supabase fetch failed");
  const rows = await response.json();
  return {
    products: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      status: row.status,
      media: (row.product_media || []).map((m) => ({
        id: m.id,
        alt_text: m.alt_text,
        width: m.width,
        height: m.height,
        mime_type: m.mime_type,
        position: m.position,
        storage_path: m.storage_path,
        url: `${SUPABASE_URL}/storage/v1/object/public/products/${m.storage_path}`,
      })),
      variants: (row.product_variants || []).map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        platform: v.platform,
        region: v.region,
        denomination: v.denomination,
        price_minor: v.price_minor,
        currency: v.currency,
        status: v.status,
      })),
    })),
  };
}

async function loadCatalog() {
  const grid = document.querySelector("[data-catalog-grid]");
  if (!grid) return;

  try {
    let payload;
    try {
      const response = await fetch("/api/catalog", {
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        payload = await response.json();
      }
    } catch (_) {
      /* worker unavailable */
    }

    if (!payload) {
      payload = await fetchCatalogDirectly();
    }

    const products = Array.isArray(payload.products)
      ? payload.products.filter(
          (product) =>
            typeof product?.id === "string" &&
            typeof product?.name === "string" &&
            Array.isArray(product.variants),
        )
      : [];
    if (products.length === 0) {
      showCatalogState(
        grid,
        "Todavía no hay productos publicados. Escribinos por WhatsApp y te ayudamos.",
      );
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const [index, product] of products.entries()) {
      fragment.append(createCard(product, index));
    }
    grid.dataset.catalogState = "ready";
    grid.replaceChildren(fragment);
    if (products.length === 1) {
      grid.classList.add("catalog-grid--single");
    } else if (products.length > 3) {
      createControls(grid);
    }
  } catch (_) {
    showCatalogState(
      grid,
      "No pudimos cargar el catálogo. Escribinos por WhatsApp para consultar disponibilidad.",
    );
  }
}

initMotion();
void loadCatalog();
