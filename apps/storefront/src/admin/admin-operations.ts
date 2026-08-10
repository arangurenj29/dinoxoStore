import { resolveAdminAccess, type AdminAccessState } from './admin-state.ts';

interface PasswordSignInRequest {
  email: string;
  password: string;
}

interface OperationResult {
  error: Error | null;
}

interface SessionUser {
  email?: string;
  id: string;
}

interface SessionMembership {
  active: boolean;
  role?: string;
  user_id: string;
}

interface AdminSessionGateway {
  getMembership(userId: string): Promise<SessionMembership | null>;
  getUser(): Promise<SessionUser | null>;
}

export interface AdminSessionInspection {
  access: AdminAccessState;
  membership: SessionMembership | null;
  user: SessionUser | null;
}

interface ProductGateway<ProductPayload, ProductRow> {
  insertProduct(payload: ProductPayload): Promise<ProductRow>;
  updateProduct(id: string, payload: ProductPayload): Promise<ProductRow>;
}

interface VariantGateway<VariantPayload> {
  deleteVariant(id: string): Promise<unknown>;
  insertVariant(payload: VariantPayload): Promise<unknown>;
  updateVariant(id: string, payload: VariantPayload): Promise<unknown>;
}

export async function signInWithPassword(
  signIn: (request: PasswordSignInRequest) => Promise<OperationResult>,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await signIn({ email, password });
  if (error) throw error;
}

export async function inspectAdminSession(
  gateway: AdminSessionGateway,
): Promise<AdminSessionInspection> {
  const user = await gateway.getUser();
  if (!user) return { access: 'logged-out', membership: null, user: null };
  const membership = await gateway.getMembership(user.id);
  return {
    access: resolveAdminAccess(user, membership),
    membership,
    user,
  };
}

export function persistProduct<ProductPayload, ProductRow>(
  gateway: ProductGateway<ProductPayload, ProductRow>,
  productId: string | null,
  payload: ProductPayload,
): Promise<ProductRow> {
  return productId
    ? gateway.updateProduct(productId, payload)
    : gateway.insertProduct(payload);
}

export function persistVariant<VariantPayload>(
  gateway: VariantGateway<VariantPayload>,
  variantId: string | null,
  payload: VariantPayload,
): Promise<unknown> {
  return variantId
    ? gateway.updateVariant(variantId, payload)
    : gateway.insertVariant(payload);
}

export function deleteVariant<VariantPayload>(
  gateway: VariantGateway<VariantPayload>,
  variantId: string,
): Promise<unknown> {
  return gateway.deleteVariant(variantId);
}
