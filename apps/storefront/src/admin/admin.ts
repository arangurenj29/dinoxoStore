import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import {
  createAdminWorkspaceDraft,
  formatAdminError,
  loadAdminWorkspaceDraft,
  removeAdminWorkspaceDraft,
  saveAdminWorkspaceDraft,
  type VariantDraftSnapshot,
} from './admin-state';
import {
  deleteVariant,
  inspectAdminSession,
  persistProduct,
  persistVariant,
  signInWithPassword,
} from './admin-operations';
import { validateImageFile } from './image-validation';

type AdminMembership = Pick<
  Database['public']['Tables']['admin_users']['Row'],
  'active' | 'role' | 'user_id'
>;
type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductStatus = Database['public']['Enums']['catalog_status'];
type ProductMedia = Database['public']['Tables']['product_media']['Row'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type VariantInsert = Database['public']['Tables']['product_variants']['Insert'];

interface ProductWithRelations extends Product {
  product_media: ProductMedia[];
  product_variants: ProductVariant[];
}

const PRODUCT_SELECT = `
  id,
  slug,
  name,
  description,
  status,
  archived_at,
  created_at,
  updated_at,
  product_variants (
    id,
    product_id,
    sku,
    name,
    platform,
    region,
    denomination,
    price_minor,
    currency,
    status,
    archived_at,
    created_at,
    updated_at
  ),
  product_media (
    id,
    product_id,
    storage_path,
    alt_text,
    position,
    mime_type,
    width,
    height,
    created_at,
    updated_at
  )
`;
const statusLabels: Record<ProductStatus, string> = {
  archived: 'Archivado',
  draft: 'Borrador',
  published: 'Publicado',
};
const mimeExtensions: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function element<T extends HTMLElement>(id: string): T {
  const match = document.getElementById(id);
  if (!match) throw new Error(`No se encontró el elemento #${id}.`);
  return match as T;
}

const loginPanel = element<HTMLElement>('admin-login');
const loginForm = element<HTMLFormElement>('login-form');
const loginEmail = element<HTMLInputElement>('login-email');
const loginPassword = element<HTMLInputElement>('login-password');
const workspace = element<HTMLElement>('admin-workspace');
const sessionLabel = element<HTMLElement>('session-label');
const signOutButton = element<HTMLButtonElement>('sign-out');
const statusRegion = element<HTMLElement>('admin-status');
const productSearch = element<HTMLInputElement>('product-search');
const productCount = element<HTMLElement>('product-count');
const productList = element<HTMLUListElement>('product-list');
const productEmpty = element<HTMLElement>('product-empty');
const productForm = element<HTMLFormElement>('product-form');
const productFormTitle = element<HTMLElement>('product-form-title');
const productState = element<HTMLElement>('product-state');
const productId = element<HTMLInputElement>('product-id');
const productName = element<HTMLInputElement>('product-name');
const productSlug = element<HTMLInputElement>('product-slug');
const productDescription = element<HTMLTextAreaElement>('product-description');
const productPrice = element<HTMLInputElement>('product-price');
const productPlatform = element<HTMLSelectElement>('product-platform');
const productRegion = element<HTMLInputElement>('product-region');
const productDelivery = element<HTMLInputElement>('product-delivery');
const publishButton = element<HTMLButtonElement>('publish-product');
const archiveButton = element<HTMLButtonElement>('archive-product');
const deleteButton = element<HTMLButtonElement>('delete-product');
const variantSection = element<HTMLElement>('variant-section');
const variantList = element<HTMLElement>('variant-list');
const variantEmpty = element<HTMLElement>('variant-empty');
const mediaSection = element<HTMLElement>('media-section');
const mediaList = element<HTMLOListElement>('media-list');
const mediaEmpty = element<HTMLElement>('media-empty');
const mediaUpload = element<HTMLInputElement>('media-upload');
const uploadProgress = element<HTMLElement>('upload-progress');
const uploadProgressBar = element<HTMLProgressElement>('upload-progress-bar');
const uploadProgressLabel = element<HTMLElement>('upload-progress-label');
const editorPlaceholder = element<HTMLElement>('editor-placeholder');

let products: ProductWithRelations[] = [];
let selectedProductId: string | undefined;
let authCheckSequence = 0;
let productFieldsAreDirty = false;
const dirtyVariantClientIds = new Set<string>();
let slugWasEdited = false;

function setStatus(
  message: string,
  level: 'error' | 'info' | 'success' = 'info',
) {
  statusRegion.textContent = message;
  statusRegion.dataset.level = level;
}

async function runAction(
  button: HTMLButtonElement,
  action: () => Promise<void>,
) {
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    setStatus(formatAdminError(error), 'error');
  } finally {
    button.disabled = false;
  }
}

function confirmAction(button: HTMLElement): boolean {
  const action = button.dataset.confirm;
  return !action || window.confirm(`${action}. Esta acción quedará auditada.`);
}

function currentProduct(): ProductWithRelations | undefined {
  return products.find((product) => product.id === selectedProductId);
}

function variantField(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | HTMLSelectElement {
  const field = form.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-variant-field="${name}"]`,
  );
  if (!field) throw new Error(`No se encontró el campo de variante ${name}.`);
  return field;
}

function collectVariantDrafts(): VariantDraftSnapshot[] {
  return [...variantList.querySelectorAll<HTMLFormElement>('form.variant-row')]
    .map((form) => {
      const clientId = form.dataset.clientId;
      if (!clientId) return null;
      return {
        clientId,
        currency: variantField(form, 'currency').value,
        denomination: variantField(form, 'denomination').value,
        dirty: dirtyVariantClientIds.has(clientId),
        intent: form.dataset.intent === 'delete' ? 'delete' : 'upsert',
        name: variantField(form, 'name').value,
        platform: variantField(form, 'platform').value,
        price: variantField(form, 'price').value,
        region: variantField(form, 'region').value,
        sku: variantField(form, 'sku').value,
        status: variantField(form, 'status').value as ProductStatus,
        variantId: form.dataset.variantId || null,
      } satisfies VariantDraftSnapshot;
    })
    .filter((draft): draft is VariantDraftSnapshot => draft !== null);
}

function workspaceIsDirty(): boolean {
  return productFieldsAreDirty || dirtyVariantClientIds.size > 0;
}

function persistWorkspaceDraft() {
  if (!workspaceIsDirty() || productForm.hidden) return;
  const draft = createAdminWorkspaceDraft({
    product: {
      description: productDescription.value,
      dirty: productFieldsAreDirty,
      name: productName.value,
      productId: productId.value || null,
      slug: productSlug.value,
    },
    variants: collectVariantDrafts(),
  });
  saveAdminWorkspaceDraft(localStorage, draft);
}

function markProductDirty() {
  productFieldsAreDirty = true;
  persistWorkspaceDraft();
}

function syncDraftStorage() {
  if (workspaceIsDirty()) persistWorkspaceDraft();
  else removeAdminWorkspaceDraft(localStorage, productId.value || null);
}

function resetWorkspaceDirtyState() {
  productFieldsAreDirty = false;
  dirtyVariantClientIds.clear();
}

function restoreWorkspaceDraft(targetProductId: string | null) {
  const draft = loadAdminWorkspaceDraft(localStorage, targetProductId);
  if (!draft) return false;
  if (targetProductId && !products.some(({ id }) => id === targetProductId)) {
    return false;
  }
  if (targetProductId) {
    selectedProductId = targetProductId;
    renderProductList();
    renderSelectedProduct();
    const product = currentProduct();
    if (product) renderVariants(product, draft.variants);
  } else {
    showNewProduct();
  }
  productName.value = draft.product.name;
  productSlug.value = draft.product.slug;
  productDescription.value = draft.product.description;
  productFieldsAreDirty = draft.product.dirty;
  dirtyVariantClientIds.clear();
  for (const variant of draft.variants) {
    if (variant.dirty) dirtyVariantClientIds.add(variant.clientId);
  }
  slugWasEdited = true;
  setStatus(
    `Borrador local recuperado (${new Date(draft.savedAt).toLocaleString('es')}). Guarda para sincronizarlo.`,
  );
  return true;
}

function selectProduct(productIdToSelect: string) {
  if (selectedProductId === productIdToSelect) return;
  persistWorkspaceDraft();
  resetWorkspaceDirtyState();
  selectedProductId = productIdToSelect;
  renderProductList();
  renderSelectedProduct();
  if (!restoreWorkspaceDraft(productIdToSelect)) {
    setStatus('Producto seleccionado.');
  }
}

function selectNewProduct() {
  persistWorkspaceDraft();
  resetWorkspaceDirtyState();
  showNewProduct();
  if (!restoreWorkspaceDraft(null)) setStatus('Nuevo producto sin guardar.');
}

function showLoggedOut(message = 'Inicia sesión para continuar.') {
  loginPanel.hidden = false;
  workspace.hidden = true;
  signOutButton.hidden = true;
  sessionLabel.textContent = 'Sin sesión';
  setStatus(message);
}

function showUnauthorized(email: string | undefined) {
  loginPanel.hidden = true;
  workspace.hidden = true;
  signOutButton.hidden = false;
  sessionLabel.textContent = email ?? 'Identidad autenticada';
  setStatus(
    'La identidad fue autenticada, pero PostgreSQL no la reconoce como administradora activa.',
    'error',
  );
}

async function refreshAccess() {
  persistWorkspaceDraft();
  const sequence = ++authCheckSequence;
  setStatus('Verificando identidad y permisos…');

  let inspection;
  try {
    inspection = await inspectAdminSession({
      getMembership: async (userId) => {
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id, role, active')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data as AdminMembership | null;
      },
      getUser: async () => {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return null;
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
      },
    });
  } catch (error) {
    if (sequence === authCheckSequence) {
      showUnauthorized(undefined);
      setStatus(formatAdminError(error), 'error');
    }
    return;
  }
  if (sequence !== authCheckSequence) return;
  if (inspection.access === 'logged-out' || !inspection.user) {
    showLoggedOut();
    return;
  }
  if (inspection.access !== 'admin' || !inspection.membership) {
    showUnauthorized(inspection.user.email);
    return;
  }

  loginPanel.hidden = true;
  workspace.hidden = false;
  signOutButton.hidden = false;
  sessionLabel.textContent = `${inspection.user.email ?? 'Administrador'} · ${inspection.membership.role ?? 'admin'}`;
  setStatus('Sesión administrativa verificada por RLS.', 'success');
  await loadProducts();
}

async function loadProducts(preferredProductId = selectedProductId) {
  persistWorkspaceDraft();
  setStatus('Cargando catálogo…');
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  products = (data ?? []) as unknown as ProductWithRelations[];
  for (const product of products) {
    product.product_variants.sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    product.product_media.sort((a, b) => a.position - b.position);
  }

  selectedProductId = products.some(
    (product) => product.id === preferredProductId,
  )
    ? preferredProductId
    : undefined;
  renderProductList();
  if (selectedProductId) renderSelectedProduct();
  else showEditorPlaceholder();
  if (!restoreWorkspaceDraft(selectedProductId ?? null)) {
    setStatus('Catálogo actualizado.', 'success');
  }
}

function renderProductList() {
  const query = productSearch.value.trim().toLocaleLowerCase('es');
  const filtered = products.filter((product) =>
    `${product.name} ${product.slug} ${product.status}`
      .toLocaleLowerCase('es')
      .includes(query),
  );

  productList.replaceChildren();
  productCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}`;
  productEmpty.hidden = filtered.length > 0;

  for (const product of filtered) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    const slug = document.createElement('small');
    const state = document.createElement('span');

    button.type = 'button';
    button.ariaCurrent = product.id === selectedProductId ? 'true' : 'false';
    button.addEventListener('click', () => selectProduct(product.id));
    name.textContent = product.name;
    slug.textContent = `${product.slug} · ${statusLabels[product.status]}`;
    state.className = 'state-dot';
    state.dataset.state = product.status;
    state.title = statusLabels[product.status];
    copy.append(name, slug);
    button.append(copy, state);
    item.append(button);
    productList.append(item);
  }
}

function showEditorPlaceholder() {
  productForm.hidden = true;
  variantSection.hidden = true;
  mediaSection.hidden = true;
  editorPlaceholder.hidden = false;
}

function showNewProduct() {
  selectedProductId = undefined;
  renderProductList();
  editorPlaceholder.hidden = true;
  productForm.hidden = false;
  variantSection.hidden = true;
  mediaSection.hidden = true;
  productForm.reset();
  productId.value = '';
  productFormTitle.textContent = 'Nuevo producto';
  productState.textContent = statusLabels.draft;
  productState.dataset.state = 'draft';
  publishButton.hidden = true;
  archiveButton.hidden = true;
  deleteButton.hidden = true;
  productPrice.value = '';
  productPlatform.value = '';
  productRegion.value = 'Consultar';
  productDelivery.value = 'Atención por WhatsApp';
  slugWasEdited = false;
  productFieldsAreDirty = false;
  dirtyVariantClientIds.clear();
  productName.focus();
}

function renderSelectedProduct() {
  const product = currentProduct();
  if (!product) {
    showEditorPlaceholder();
    return;
  }

  editorPlaceholder.hidden = true;
  productForm.hidden = false;
  variantSection.hidden = true;
  mediaSection.hidden = false;
  productId.value = product.id;
  productName.value = product.name;
  productSlug.value = product.slug;
  productDescription.value = product.description;
  const firstVariant = product.product_variants?.[0];
  productPrice.value = firstVariant
    ? (firstVariant.price_minor / 100).toString()
    : '';
  productPlatform.value = firstVariant?.platform ?? '';
  productRegion.value = firstVariant?.region ?? 'Consultar';
  productDelivery.value = 'Atención por WhatsApp';
  productFormTitle.textContent = product.name;
  productState.textContent = statusLabels[product.status];
  productState.dataset.state = product.status;
  publishButton.hidden = product.status === 'published';
  archiveButton.hidden = product.status === 'archived';
  deleteButton.hidden = false;
  slugWasEdited = true;
  renderVariants(product);
  void renderMedia(product);
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function saveProduct() {
  if (!productForm.reportValidity()) return;
  const existing = currentProduct();
  const previousDraftProductId = existing?.id ?? null;
  const payload: ProductInsert = {
    archived_at: existing?.archived_at ?? null,
    description: productDescription.value.trim(),
    name: productName.value.trim(),
    slug: productSlug.value.trim(),
    status: existing?.status ?? 'draft',
  };

  const data = await persistProduct(
    {
      insertProduct: async (nextPayload) => {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert(nextPayload)
          .select()
          .single();
        if (error) throw error;
        return inserted;
      },
      updateProduct: async (id, nextPayload) => {
        const { data: updated, error } = await supabase
          .from('products')
          .update(nextPayload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      },
    },
    existing?.id ?? null,
    payload,
  );

  productFieldsAreDirty = false;
  removeAdminWorkspaceDraft(localStorage, previousDraftProductId);
  selectedProductId = data.id;
  productId.value = data.id;

  const priceValue = productPrice.value.trim();
  const priceMinor = priceValue ? Math.round(parseFloat(priceValue) * 100) : 0;
  const platform = productPlatform.value.trim() || 'Consultar';
  const region = productRegion.value.trim() || 'Consultar';
  const slug = data.slug;
  const sku = `SKU-${slug}`
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 64);

  const { data: existingVariant } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', data.id)
    .limit(1)
    .maybeSingle();
  if (existingVariant) {
    const { error: vErr } = await supabase
      .from('product_variants')
      .update({
        sku,
        name: data.name,
        platform,
        region,
        denomination: data.name,
        price_minor: priceMinor,
        currency: 'USD',
        status: data.status,
      })
      .eq('id', existingVariant.id);
    if (vErr) throw vErr;
  } else {
    const { error: vErr } = await supabase.from('product_variants').insert({
      product_id: data.id,
      sku,
      name: data.name,
      platform,
      region,
      denomination: data.name,
      price_minor: priceMinor,
      currency: 'USD',
      status: data.status,
    });
    if (vErr) throw vErr;
  }

  syncDraftStorage();
  await loadProducts(data.id);
  setStatus(existing ? 'Producto actualizado.' : 'Producto creado.', 'success');
}

async function changeProductStatus(
  status: Extract<ProductStatus, 'archived' | 'published'>,
) {
  const product = currentProduct();
  if (!product)
    throw new Error('Guarda el producto antes de cambiar su estado.');

  const { error } = await supabase
    .from('products')
    .update({
      archived_at: status === 'archived' ? new Date().toISOString() : null,
      status,
    })
    .eq('id', product.id);
  if (error) throw error;

  await loadProducts(product.id);
  setStatus(
    status === 'published' ? 'Producto publicado.' : 'Producto archivado.',
    'success',
  );
}

async function deleteProduct() {
  const product = currentProduct();
  if (!product) return;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', product.id);
  if (error) throw error;

  selectedProductId = undefined;
  await loadProducts();
  showEditorPlaceholder();
  setStatus('Producto eliminado.', 'success');
}

function labeledInput(
  labelText: string,
  value: string,
  options: {
    inputMode?: HTMLInputElement['inputMode'];
    min?: string;
    pattern?: string;
    required?: boolean;
    step?: string;
    type?: string;
  } = {},
) {
  const label = document.createElement('label');
  const caption = document.createElement('span');
  const input = document.createElement('input');
  caption.textContent = labelText;
  input.value = value;
  input.type = options.type ?? 'text';
  input.required = options.required ?? true;
  if (options.inputMode) input.inputMode = options.inputMode;
  if (options.min) input.min = options.min;
  if (options.pattern) input.pattern = options.pattern;
  if (options.step) input.step = options.step;
  label.append(caption, input);
  return { input, label };
}

function variantEditor(variant?: ProductVariant, draft?: VariantDraftSnapshot) {
  const form = document.createElement('form');
  const primary = document.createElement('div');
  const secondary = document.createElement('div');
  const actions = document.createElement('div');
  const save = document.createElement('button');
  const remove = document.createElement('button');
  const statusLabel = document.createElement('label');
  const statusCaption = document.createElement('span');
  const status = document.createElement('select');
  const clientId =
    draft?.clientId ??
    (variant ? `variant:${variant.id}` : `variant:new:${crypto.randomUUID()}`);

  form.className = 'variant-row';
  form.dataset.clientId = clientId;
  form.dataset.intent = draft?.intent ?? 'upsert';
  form.dataset.variantId = variant?.id ?? draft?.variantId ?? '';
  primary.className = 'variant-fields';
  secondary.className = 'variant-fields variant-fields--secondary';
  actions.className = 'variant-actions';
  save.className = 'button button--small button--primary';
  save.type = 'submit';
  save.textContent = variant ? 'Guardar variante' : 'Crear variante';
  remove.className = 'button button--small button--danger';
  remove.type = 'button';
  remove.textContent = variant ? 'Eliminar' : 'Cancelar';
  remove.dataset.confirm = variant ? 'Eliminar esta variante' : '';

  const name = labeledInput('Nombre', draft?.name ?? variant?.name ?? '', {
    required: true,
  });
  const sku = labeledInput('SKU', draft?.sku ?? variant?.sku ?? '', {
    pattern: '[A-Z0-9][A-Z0-9_-]{2,63}',
    required: true,
  });
  const platform = labeledInput(
    'Plataforma',
    draft?.platform ?? variant?.platform ?? '',
    {
      required: true,
    },
  );
  const region = labeledInput(
    'Región',
    draft?.region ?? variant?.region ?? '',
    {
      required: true,
    },
  );
  const denomination = labeledInput(
    'Denominación',
    draft?.denomination ?? variant?.denomination ?? '',
    {
      required: true,
    },
  );
  const price = labeledInput(
    'Precio',
    draft?.price ?? (variant ? (variant.price_minor / 100).toFixed(2) : ''),
    {
      inputMode: 'decimal',
      min: '0',
      required: true,
      step: '0.01',
      type: 'number',
    },
  );
  const currency = labeledInput(
    'Moneda',
    draft?.currency ?? variant?.currency.trim() ?? 'USD',
    {
      pattern: '[A-Z]{3}',
      required: true,
    },
  );

  for (const [field, input] of [
    ['name', name.input],
    ['sku', sku.input],
    ['platform', platform.input],
    ['region', region.input],
    ['denomination', denomination.input],
    ['price', price.input],
    ['currency', currency.input],
  ] as const) {
    input.dataset.variantField = field;
  }
  status.dataset.variantField = 'status';

  for (const value of [
    'draft',
    'published',
    'archived',
  ] satisfies ProductStatus[]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = statusLabels[value];
    option.selected = value === (draft?.status ?? variant?.status ?? 'draft');
    status.append(option);
  }
  statusCaption.textContent = 'Estado';
  statusLabel.append(statusCaption, status);

  sku.input.addEventListener('input', () => {
    sku.input.value = sku.input.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  });
  currency.input.addEventListener('input', () => {
    currency.input.value = currency.input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
  });

  primary.append(
    name.label,
    sku.label,
    platform.label,
    region.label,
    denomination.label,
  );
  secondary.append(price.label, currency.label, statusLabel);
  actions.append(save, remove);
  form.append(primary, secondary, actions);

  const showPendingDelete = (pending: boolean) => {
    form.dataset.intent = pending ? 'delete' : 'upsert';
    for (const field of form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >('input, select')) {
      field.disabled = pending;
    }
    save.textContent = pending
      ? 'Aplicar eliminación'
      : variant
        ? 'Guardar variante'
        : 'Crear variante';
    remove.textContent = pending
      ? 'Deshacer eliminación'
      : variant
        ? 'Eliminar'
        : 'Cancelar';
    remove.dataset.confirm = pending
      ? ''
      : variant
        ? 'Preparar la eliminación de esta variante'
        : '';
  };
  showPendingDelete(draft?.intent === 'delete');

  form.addEventListener('input', () => {
    dirtyVariantClientIds.add(clientId);
    persistWorkspaceDraft();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void runAction(save, async () => {
      const product = currentProduct();
      if (!product) throw new Error('Selecciona un producto guardado.');
      if (form.dataset.intent === 'delete') {
        if (!variant) throw new Error('La variante todavía no existe.');
        await deleteVariant(
          {
            deleteVariant: async (id) => {
              const { error } = await supabase
                .from('product_variants')
                .delete()
                .eq('id', id);
              if (error) throw error;
            },
            insertVariant: async () => undefined,
            updateVariant: async () => undefined,
          },
          variant.id,
        );
        dirtyVariantClientIds.delete(clientId);
        syncDraftStorage();
        await loadProducts(variant.product_id);
        setStatus('Variante eliminada.', 'success');
        return;
      }
      const nextStatus = status.value as ProductStatus;
      const payload: VariantInsert = {
        archived_at:
          nextStatus === 'archived' ? new Date().toISOString() : null,
        currency: currency.input.value,
        denomination: denomination.input.value.trim(),
        name: name.input.value.trim(),
        platform: platform.input.value.trim(),
        price_minor: Math.round(Number(price.input.value) * 100),
        product_id: product.id,
        region: region.input.value.trim(),
        sku: sku.input.value,
        status: nextStatus,
      };
      await persistVariant(
        {
          deleteVariant: async () => undefined,
          insertVariant: async (nextPayload) => {
            const { error } = await supabase
              .from('product_variants')
              .insert(nextPayload);
            if (error) throw error;
          },
          updateVariant: async (id, nextPayload) => {
            const { error } = await supabase
              .from('product_variants')
              .update(nextPayload)
              .eq('id', id);
            if (error) throw error;
          },
        },
        variant?.id ?? null,
        payload,
      );
      dirtyVariantClientIds.delete(clientId);
      syncDraftStorage();
      await loadProducts(product.id);
      setStatus(
        variant ? 'Variante actualizada.' : 'Variante creada.',
        'success',
      );
    });
  });

  remove.addEventListener('click', () => {
    if (!variant) {
      dirtyVariantClientIds.delete(clientId);
      form.remove();
      variantEmpty.hidden = variantList.childElementCount > 0;
      syncDraftStorage();
      return;
    }
    if (form.dataset.intent === 'delete') {
      showPendingDelete(false);
      dirtyVariantClientIds.add(clientId);
      persistWorkspaceDraft();
      setStatus('Eliminación deshecha. La variante sigue sin guardar.');
      return;
    }
    if (!confirmAction(remove)) return;
    showPendingDelete(true);
    dirtyVariantClientIds.add(clientId);
    persistWorkspaceDraft();
    setStatus(
      'Eliminación preparada. Usa “Aplicar eliminación” para confirmarla.',
    );
  });

  return form;
}

function renderVariants(
  product: ProductWithRelations,
  drafts: VariantDraftSnapshot[] = [],
) {
  const draftsByVariantId = new Map(
    drafts
      .filter((draft) => draft.variantId)
      .map((draft) => [draft.variantId, draft]),
  );
  const existing = product.product_variants.map((variant) =>
    variantEditor(variant, draftsByVariantId.get(variant.id)),
  );
  const created = drafts
    .filter((draft) => !draft.variantId)
    .map((draft) => variantEditor(undefined, draft));
  variantList.replaceChildren(...existing, ...created);
  variantEmpty.hidden = existing.length + created.length > 0;
}

async function renderMedia(product: ProductWithRelations) {
  mediaList.replaceChildren();
  mediaEmpty.hidden = product.product_media.length > 0;

  for (const [index, media] of product.product_media.entries()) {
    const row = document.createElement('li');
    const image = document.createElement('img');
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const path = document.createElement('small');
    const actions = document.createElement('div');
    const up = document.createElement('button');
    const down = document.createElement('button');
    const remove = document.createElement('button');

    row.className = 'media-row';
    image.alt = media.alt_text;
    image.width = 96;
    image.height = 80;
    image.loading = 'lazy';
    title.textContent = media.alt_text;
    path.textContent = media.storage_path;
    actions.className = 'media-actions';
    for (const button of [up, down, remove]) {
      button.className = 'button button--small button--quiet';
      button.type = 'button';
    }
    up.textContent = 'Subir';
    up.disabled = index === 0;
    down.textContent = 'Bajar';
    down.disabled = index === product.product_media.length - 1;
    remove.textContent = 'Eliminar';
    remove.className = 'button button--small button--danger';
    remove.dataset.confirm = 'Eliminar esta imagen';

    const { data, error } = await supabase.storage
      .from('products')
      .createSignedUrl(media.storage_path, 60 * 15);
    if (currentProduct()?.id !== product.id) return;
    if (error) {
      setStatus(
        `No se pudo generar la vista previa de ${media.storage_path}: ${formatAdminError(error)}. Verifica la membresía y la política SELECT de Storage.`,
        'error',
      );
    } else if (data?.signedUrl) {
      image.src = data.signedUrl;
    }

    up.addEventListener('click', () => void moveMedia(media, -1));
    down.addEventListener('click', () => void moveMedia(media, 1));
    remove.addEventListener('click', () => {
      if (!confirmAction(remove)) return;
      void runAction(remove, () => deleteMedia(media));
    });

    copy.append(title, path);
    actions.append(up, down, remove);
    row.append(image, copy, actions);
    mediaList.append(row);
  }
}

async function moveMedia(media: ProductMedia, offset: -1 | 1) {
  const product = currentProduct();
  if (!product) return;
  const index = product.product_media.findIndex((item) => item.id === media.id);
  const other = product.product_media[index + offset];
  if (!other) return;

  const orderedMediaIds = product.product_media.map((item) => item.id);
  const targetIndex = index + offset;
  const currentId = orderedMediaIds[index];
  const targetId = orderedMediaIds[targetIndex];
  if (!currentId || !targetId) return;
  orderedMediaIds[index] = targetId;
  orderedMediaIds[targetIndex] = currentId;
  const { error } = await supabase.rpc('reorder_product_media', {
    ordered_media_ids: orderedMediaIds,
  });
  if (error) {
    setStatus(formatAdminError(error), 'error');
    return;
  }
  await loadProducts(product.id);
  setStatus('Orden de imágenes actualizado.', 'success');
}

async function deleteMedia(media: ProductMedia) {
  const { error: databaseError } = await supabase
    .from('product_media')
    .delete()
    .eq('id', media.id);
  if (databaseError) throw databaseError;

  const { error: storageError } = await supabase.storage
    .from('products')
    .remove([media.storage_path]);
  await loadProducts(media.product_id);
  if (storageError) {
    setStatus(
      'La referencia fue eliminada, pero el archivo no pudo retirarse. Revisa Storage.',
      'error',
    );
    return;
  }
  setStatus('Imagen eliminada.', 'success');
}

async function uploadMedia(files: File[]) {
  const product = currentProduct();
  if (!product) throw new Error('Selecciona un producto guardado.');
  const validatedFiles = await Promise.all(
    files.map(async (file) => ({
      file,
      metadata: await validateImageFile(file),
    })),
  );

  uploadProgress.hidden = false;
  uploadProgressBar.max = files.length;
  uploadProgressBar.value = 0;
  const failures: string[] = [];
  let nextPosition =
    Math.max(-1, ...product.product_media.map((media) => media.position)) + 1;

  for (const [index, { file, metadata }] of validatedFiles.entries()) {
    uploadProgressLabel.textContent = `Subiendo ${index + 1} de ${files.length}: ${file.name}`;
    const storagePath = `${product.id}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      failures.push(`${file.name}: ${uploadError.message}`);
      uploadProgressBar.value = index + 1;
      continue;
    }

    const { error: databaseError } = await supabase
      .from('product_media')
      .insert({
        alt_text: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        height: metadata.height,
        mime_type: metadata.mimeType,
        position: nextPosition++,
        product_id: product.id,
        storage_path: storagePath,
        width: metadata.width,
      });
    if (databaseError) {
      await supabase.storage.from('products').remove([storagePath]);
      failures.push(`${file.name}: ${databaseError.message}`);
    }
    uploadProgressBar.value = index + 1;
  }

  uploadProgressLabel.textContent = failures.length
    ? `Carga terminada con ${failures.length} error(es).`
    : 'Carga completada.';
  await loadProducts(product.id);
  if (failures.length) {
    setStatus(failures.join(' · '), 'error');
  } else {
    setStatus('Imágenes cargadas.', 'success');
  }
  window.setTimeout(() => {
    uploadProgress.hidden = true;
  }, 2500);
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  if (!submit) return;
  void runAction(submit, async () => {
    const email = loginEmail.value.trim();
    await signInWithPassword(
      (request) => supabase.auth.signInWithPassword(request),
      email,
      loginPassword.value,
    );
    loginPassword.value = '';
    setStatus('Credenciales correctas. Verificando permisos…', 'success');
    await refreshAccess();
  });
});

signOutButton.addEventListener('click', () => {
  void runAction(signOutButton, async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    products = [];
    selectedProductId = undefined;
    showLoggedOut('Sesión cerrada.');
  });
});

productSearch.addEventListener('input', renderProductList);
element<HTMLButtonElement>('refresh-products').addEventListener(
  'click',
  (event) => {
    void runAction(event.currentTarget as HTMLButtonElement, () =>
      loadProducts(),
    );
  },
);
element<HTMLButtonElement>('new-product').addEventListener(
  'click',
  selectNewProduct,
);
productName.addEventListener('input', () => {
  if (!slugWasEdited) productSlug.value = slugify(productName.value);
});
productForm.addEventListener('input', markProductDirty);
productSlug.addEventListener('input', () => {
  slugWasEdited = true;
  productSlug.value = slugify(productSlug.value);
});
productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const submit = productForm.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  if (submit) void runAction(submit, saveProduct);
});
publishButton.addEventListener('click', () => {
  if (!confirmAction(publishButton)) return;
  void runAction(publishButton, () => changeProductStatus('published'));
});
archiveButton.addEventListener('click', () => {
  if (!confirmAction(archiveButton)) return;
  void runAction(archiveButton, () => changeProductStatus('archived'));
});
deleteButton.addEventListener('click', () => {
  if (!confirmAction(deleteButton)) return;
  void runAction(deleteButton, deleteProduct);
});
mediaUpload.addEventListener('change', () => {
  const files = [...(mediaUpload.files ?? [])];
  mediaUpload.value = '';
  if (files.length)
    void uploadMedia(files).catch((error) =>
      setStatus(formatAdminError(error), 'error'),
    );
});

window.addEventListener('beforeunload', (event) => {
  if (!workspaceIsDirty()) return;
  persistWorkspaceDraft();
  event.preventDefault();
});

supabase.auth.onAuthStateChange(() => {
  queueMicrotask(() => void refreshAccess());
});

void refreshAccess();
