export interface ProductDraftSnapshot {
  description: string;
  dirty: boolean;
  name: string;
  productId: string | null;
  slug: string;
}

export interface VariantDraftSnapshot {
  clientId: string;
  currency: string;
  denomination: string;
  dirty: boolean;
  intent: 'delete' | 'upsert';
  name: string;
  platform: string;
  price: string;
  region: string;
  sku: string;
  status: 'archived' | 'draft' | 'published';
  variantId: string | null;
}

export interface AdminWorkspaceDraft {
  product: ProductDraftSnapshot;
  savedAt: string;
  variants: VariantDraftSnapshot[];
  version: 2;
}

interface DraftStorage {
  getItem(key: string): string | null;
  removeItem(key: string): unknown;
  setItem(key: string, value: string): unknown;
}

const WORKSPACE_DRAFT_PREFIX = 'dinoxo-admin-workspace-draft-v2';

interface AccessUser {
  id: string;
}

interface AccessMembership {
  active: boolean;
  user_id: string;
}

export type AdminAccessState = 'admin' | 'logged-out' | 'unauthorized';

export function resolveAdminAccess(
  user: AccessUser | null,
  membership: AccessMembership | null,
): AdminAccessState {
  if (!user) return 'logged-out';
  if (!membership?.active || membership.user_id !== user.id) {
    return 'unauthorized';
  }
  return 'admin';
}

export function createAdminWorkspaceDraft(fields: {
  product: ProductDraftSnapshot;
  variants: VariantDraftSnapshot[];
}): AdminWorkspaceDraft {
  return {
    product: fields.product,
    savedAt: new Date().toISOString(),
    variants: fields.variants,
    version: 2,
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isProductDraft(value: unknown): value is ProductDraftSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProductDraftSnapshot>;
  return (
    isString(candidate.description) &&
    typeof candidate.dirty === 'boolean' &&
    isString(candidate.name) &&
    (candidate.productId === null || isString(candidate.productId)) &&
    isString(candidate.slug)
  );
}

function isVariantDraft(value: unknown): value is VariantDraftSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VariantDraftSnapshot>;
  return (
    isString(candidate.clientId) &&
    isString(candidate.currency) &&
    isString(candidate.denomination) &&
    typeof candidate.dirty === 'boolean' &&
    (candidate.intent === 'delete' || candidate.intent === 'upsert') &&
    isString(candidate.name) &&
    isString(candidate.platform) &&
    isString(candidate.price) &&
    isString(candidate.region) &&
    isString(candidate.sku) &&
    (candidate.status === 'archived' ||
      candidate.status === 'draft' ||
      candidate.status === 'published') &&
    (candidate.variantId === null || isString(candidate.variantId))
  );
}

export function parseAdminWorkspaceDraft(
  value: string | null,
): AdminWorkspaceDraft | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<AdminWorkspaceDraft>;
    if (
      candidate.version !== 2 ||
      !isProductDraft(candidate.product) ||
      !isString(candidate.savedAt) ||
      Number.isNaN(Date.parse(candidate.savedAt)) ||
      !Array.isArray(candidate.variants) ||
      !candidate.variants.every(isVariantDraft)
    ) {
      return null;
    }
    return candidate as AdminWorkspaceDraft;
  } catch {
    return null;
  }
}

export function workspaceDraftStorageKey(productId: string | null): string {
  return `${WORKSPACE_DRAFT_PREFIX}:${productId ?? 'new'}`;
}

export function saveAdminWorkspaceDraft(
  storage: DraftStorage,
  draft: AdminWorkspaceDraft,
): void {
  storage.setItem(
    workspaceDraftStorageKey(draft.product.productId),
    JSON.stringify(draft),
  );
}

export function loadAdminWorkspaceDraft(
  storage: DraftStorage,
  productId: string | null,
): AdminWorkspaceDraft | null {
  const draft = parseAdminWorkspaceDraft(
    storage.getItem(workspaceDraftStorageKey(productId)),
  );
  return draft?.product.productId === productId ? draft : null;
}

export function removeAdminWorkspaceDraft(
  storage: DraftStorage,
  productId: string | null,
): void {
  storage.removeItem(workspaceDraftStorageKey(productId));
}

export function formatAdminError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : undefined;
    const hint =
      'hint' in error && typeof error.hint === 'string'
        ? error.hint
        : undefined;
    if (message && hint) return `${message} · ${hint}`;
    if (message) return message;
  }
  return 'Ocurrió un error inesperado.';
}
