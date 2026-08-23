/**
 * Merging a catalogue product into a customer's quote request.
 *
 * This lives outside the portal component so it can be tested directly. The
 * rule it enforces is small but consequential: adding the same product twice
 * raises the quantity instead of creating a second line. Two lines for one SKU
 * become two lines on the purchase order, and the vendor picks the item twice.
 */

export interface QuoteLine {
  id: string;
  type: 'service' | 'ad' | 'product';
  title: string;
  description: string;
  price?: string;
  image: string;
  source: string;
  vendorId?: string;
  vendorName?: string;
  sku?: string;
  unit?: string;
  unitPrice?: number;
  quantity?: number;
}

export interface PickedProductLike {
  vendorId: string;
  vendorName: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  quantity: number;
}

/**
 * Identity of a catalogue product: a SKU only means anything alongside its
 * vendor, since two vendors can and do use the same SKU for different things.
 *
 * Both the picker (to show a product as already added) and the quote line use
 * this, so they cannot drift apart into a state where the picker never marks
 * anything as added.
 */
export function catalogKey(product: { vendorId?: string; sku?: string; name?: string; title?: string }): string {
  return `${product.vendorId || ''}::${product.sku || product.name || product.title || ''}`;
}

/** Identity of a product line within a quote. */
export function productLineId(product: { vendorId: string; sku?: string; name: string }): string {
  return `product::${catalogKey(product)}`;
}

export function mergeProductLine(
  items: QuoteLine[],
  product: PickedProductLike,
): { items: QuoteLine[]; merged: boolean } {
  const id = productLineId(product);
  const unitPrice = Number(product.price) || 0;
  const added = Math.max(1, Number(product.quantity) || 1);
  const existing = items.find(item => item.id === id);

  if (existing) {
    const quantity = (Number(existing.quantity) || 1) + added;
    return {
      merged: true,
      items: items.map(item =>
        item.id === id
          ? {
              ...item,
              quantity,
              description: `${quantity} × ${product.unit || 'each'} from ${product.vendorName}`,
              price: `$${(quantity * unitPrice).toFixed(2)}`,
            }
          : item,
      ),
    };
  }

  return {
    merged: false,
    items: [
      ...items,
      {
        id,
        type: 'product',
        title: product.name,
        description: `${added} × ${product.unit || 'each'} from ${product.vendorName}`,
        price: `$${(added * unitPrice).toFixed(2)}`,
        image: '',
        source: 'vendor-catalog',
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        sku: product.sku,
        unit: product.unit,
        unitPrice,
        quantity: added,
      },
    ],
  };
}
