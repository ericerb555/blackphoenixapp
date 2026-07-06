// Related Products and Smart Bundle Suggestions
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  Gift,
  Tag,
  Percent,
  Plus,
  Check,
  Sparkles,
  Zap,
  AlertCircle
} from 'lucide-react';
import type { Product } from '../types/ecommerce';

interface RelatedProductsBundlesProps {
  currentProduct: Product;
  allProducts: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

interface Bundle {
  id: string;
  name: string;
  products: Product[];
  savings: number;
  totalPrice: number;
  originalPrice: number;
}

export default function RelatedProductsBundles({
  currentProduct,
  allProducts,
  onProductClick,
  onAddToCart
}: RelatedProductsBundlesProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);

  // Generate related products based on category and vendor
  const relatedProducts = allProducts
    .filter(p =>
      p.id !== currentProduct.id &&
      (p.category === currentProduct.category || p.vendorId === currentProduct.vendorId)
    )
    .slice(0, 6);

  // Generate frequently bought together
  const frequentlyBought = allProducts
    .filter(p =>
      p.id !== currentProduct.id &&
      p.category === currentProduct.category
    )
    .slice(0, 4);

  // Generate smart bundles
  const bundles: Bundle[] = [
    {
      id: 'bundle_1',
      name: 'Complete Starter Kit',
      products: [currentProduct, ...frequentlyBought.slice(0, 2)],
      savings: 45,
      totalPrice: currentProduct.price + frequentlyBought.slice(0, 2).reduce((sum, p) => sum + p.price, 0) - 45,
      originalPrice: currentProduct.price + frequentlyBought.slice(0, 2).reduce((sum, p) => sum + p.price, 0)
    },
    {
      id: 'bundle_2',
      name: 'Professional Bundle',
      products: [currentProduct, ...frequentlyBought.slice(0, 3)],
      savings: 75,
      totalPrice: currentProduct.price + frequentlyBought.slice(0, 3).reduce((sum, p) => sum + p.price, 0) - 75,
      originalPrice: currentProduct.price + frequentlyBought.slice(0, 3).reduce((sum, p) => sum + p.price, 0)
    }
  ];

  return (
    <div className="space-y-8">
      {/* Smart Bundles */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Smart Bundles</h2>
            <p className="text-sm text-slate-400">Save more when you buy together</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bundles.map((bundle, index) => {
            const savingsPercent = Math.round((bundle.savings / bundle.originalPrice) * 100);

            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-slate-900/50 backdrop-blur-xl border-2 rounded-2xl p-6 transition-all ${
                  selectedBundleId === bundle.id
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-cyan-500/20 hover:border-cyan-500/40'
                }`}
              >
                {/* Savings Badge */}
                <div className="absolute -top-3 -right-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-white" />
                    <span className="text-sm font-black text-white">Save {savingsPercent}%</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4">{bundle.name}</h3>

                {/* Bundle Products */}
                <div className="space-y-3 mb-6">
                  {bundle.products.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + idx * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden">
                        {product.primaryImage ? (
                          <img
                            src={product.primaryImage}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white line-clamp-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          ${product.price.toFixed(2)}
                        </div>
                      </div>
                      {idx === 0 && (
                        <div className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs font-bold text-cyan-400">
                          Main
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="space-y-2 mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Original Price:</span>
                    <span className="text-slate-500 line-through">${bundle.originalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400 font-semibold">Bundle Savings:</span>
                    <span className="text-green-400 font-bold">-${bundle.savings.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                    <span className="text-lg font-bold text-white">Bundle Price:</span>
                    <span className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      ${bundle.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Add Bundle Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedBundleId(bundle.id)}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    selectedBundleId === bundle.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50'
                  }`}
                >
                  {selectedBundleId === bundle.id ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add Bundle to Cart
                    </>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Frequently Bought Together */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Frequently Bought Together</h2>
            <p className="text-sm text-slate-400">Customers who bought this also purchased</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {frequentlyBought.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onClick={() => onProductClick(product)}
              onAddToCart={() => onAddToCart(product)}
            />
          ))}
        </div>
      </section>

      {/* Related Products */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">You Might Also Like</h2>
            <p className="text-sm text-slate-400">Similar products in this category</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onClick={() => onProductClick(product)}
              onAddToCart={() => onAddToCart(product)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  index,
  onClick,
  onAddToCart
}: {
  product: Product;
  index: number;
  onClick: () => void;
  onAddToCart: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity" />

      <div className="relative bg-slate-900/50 backdrop-blur-xl border border-cyan-500/10 group-hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all">
        {/* Image */}
        <div className="relative aspect-square bg-gradient-to-br from-slate-800 to-slate-900">
          {product.primaryImage ? (
            <motion.img
              src={product.primaryImage}
              alt={product.name}
              className="w-full h-full object-cover"
              animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-slate-700" />
            </div>
          )}

          {/* Quick Add Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            onClick={handleAddToCart}
            className={`absolute bottom-3 left-3 right-3 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/50'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                Added!
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Quick Add
              </>
            )}
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-white line-clamp-2 text-sm leading-snug mb-2 group-hover:text-cyan-400 transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div className="text-lg font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              ${product.price.toFixed(2)}
            </div>

            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < 4 ? 'text-yellow-500 fill-current' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
