/**
 * sellableProviders — which suppliers this store may take money for.
 *
 * WHY THIS EXISTS
 *
 * Because the store once sold something it could not ship. A customer paid for
 * a Zendrop item, the forward was refused, and it turned out Zendrop's API has
 * no order-creation tool at all — it can only fulfil orders that already exist
 * inside a connected Zendrop store. No token, no retry and no amount of waiting
 * could ever have shipped it. The money was taken for goods that could not be
 * ordered.
 *
 * Eric's instruction after that: CJ only, until another provider is added.
 *
 * SO THIS IS AN ALLOWLIST, NOT A BLOCKLIST
 *
 * A blocklist would need updating every time somebody imported from a new
 * supplier, and the failure of a forgotten entry is a sale nobody can fulfil.
 * An allowlist fails the other way: a supplier nobody has vouched for simply
 * cannot be sold, which is recoverable by adding it.
 *
 * "Until we add another" is the whole reason it is configuration rather than a
 * constant. Adding a provider is a setting, not a deploy.
 */

/** Suppliers whose orders this store can actually place, out of the box. */
export const DEFAULT_SELLABLE_PROVIDERS = ['cjdropshipping'];

/**
 * Read a provider id off a product, whatever the record calls it.
 *
 * The field names differ by importer and by generation of the code, and a
 * missed spelling here reads as "unknown provider" — which, on an allowlist,
 * means refusing to sell something perfectly sellable. Worth checking every
 * name rather than the one that happens to be current.
 */
export function providerOf(product: any): string {
  const named = String(
    product?.provider
    || product?.source
    || product?.providerId
    || product?.supplier
    || '',
  ).trim().toLowerCase();
  if (named) return named;

  /**
   * Fall back to the id, which carries the provider as a prefix.
   *
   * `cj_CJYD3061696`, `zendrop_ZD-2746847`. This is how the store order that
   * could not be fulfilled was identifiable at all — the record had no
   * provider field, only the prefix.
   */
  const id = String(product?.id || '').trim().toLowerCase();
  const prefix = id.includes('_') ? id.split('_')[0] : '';
  if (prefix === 'cj') return 'cjdropshipping';
  return prefix;
}

/** Normalised, so "CJ Dropshipping" and "cjdropshipping" are one answer. */
function canon(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * May this product be sold?
 *
 * A product with NO identifiable provider is allowed. That is deliberate and it
 * is the one place this is generous: the store also sells its own goods and
 * digital products, which have no supplier to forward to and therefore cannot
 * fail to be forwarded. Refusing those would take the whole store down to solve
 * a dropshipping problem.
 */
export function providerIsSellable(
  product: any,
  allowed: string[] = DEFAULT_SELLABLE_PROVIDERS,
): boolean {
  const provider = providerOf(product);
  if (!provider) return true;
  const list = (allowed || []).map(canon).filter(Boolean);
  if (list.length === 0) return true;  // nothing configured is not the same as nothing allowed
  return list.includes(canon(provider));
}

/**
 * What to tell a shopper, which is not what to tell an operator.
 *
 * "Unavailable" is the truth from where they are standing and it is actionable:
 * remove it and carry on. Naming the supplier and our fulfilment arrangements
 * would be noise to them and an invitation to argue about it.
 */
export function unavailableMessage(name?: string): string {
  return `${name ? `“${name}”` : 'That item'} is no longer available.`;
}
