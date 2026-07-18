// AI-Powered Personalized Product Recommendations
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  Heart,
  Eye,
  ShoppingCart,
  Star,
  ArrowRight,
  Package,
  Zap,
  Target,
  Brain
} from 'lucide-react';
import type { Product } from '../types/ecommerce';

interface AIRecommendationsProps {
  products: Product[];
  currentProduct?: Product;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

interface UserBehavior {
  viewedProducts: string[];
  viewedCategories: string[];
  searchQueries: string[];
  cartItems: string[];
  favorites: string[];
  timestamp: number;
}

export default function AIRecommendations({
  products,
  currentProduct,
  onProductClick,
  onAddToCart
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<{
    personalized: Product[];
    similar: Product[];
    trending: Product[];
    frequentlyBought: Product[];
  }>({
    personalized: [],
    similar: [],
    trending: [],
    frequentlyBought: []
  });

  useEffect(() => {
    generateRecommendations();
  }, [products, currentProduct]);

  const getUserBehavior = (): UserBehavior => {
    const saved = localStorage.getItem('user_behavior');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      viewedProducts: [],
      viewedCategories: [],
      searchQueries: [],
      cartItems: [],
      favorites: [],
      timestamp: Date.now()
    };
  };

  const trackProductView = (productId: string, category: string) => {
    const behavior = getUserBehavior();
    behavior.viewedProducts = [productId, ...behavior.viewedProducts.filter(id => id !== productId)].slice(0, 50);
    behavior.viewedCategories = [category, ...behavior.viewedCategories.filter(c => c !== category)].slice(0, 20);
    behavior.timestamp = Date.now();
    localStorage.setItem('user_behavior', JSON.stringify(behavior));
  };

  const generateRecommendations = () => {
    const behavior = getUserBehavior();

    // 1. Personalized Recommendations (based on browsing history)
    const personalizedRecs = getPersonalizedRecommendations(behavior);

    // 2. Similar Products (if viewing a product)
    const similarRecs = currentProduct ? getSimilarProducts(currentProduct) : [];

    // 3. Trending Products (by order count)
    const trendingRecs = products
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
      .slice(0, 8);

    // 4. Frequently Bought Together (based on category and price range)
    const frequentlyBoughtRecs = currentProduct ? getFrequentlyBoughtTogether(currentProduct) : [];

    setRecommendations({
      personalized: personalizedRecs,
      similar: similarRecs,
      trending: trendingRecs,
      frequentlyBought: frequentlyBoughtRecs
    });
  };

  const getPersonalizedRecommendations = (behavior: UserBehavior): Product[] => {
    // Score each product based on user behavior
    const scoredProducts = products.map(product => {
      let score = 0;

      // Boost products in viewed categories
      if (behavior.viewedCategories.includes(product.category)) {
        score += 10;
      }

      // Boost products from same vendor as viewed products
      const viewedProducts = products.filter(p => behavior.viewedProducts.includes(p.id));
      const viewedVendors = new Set(viewedProducts.map(p => p.vendorId));
      if (viewedVendors.has(product.vendorId)) {
        score += 5;
      }

      // Boost products with similar tags
      if (product.tags) {
        viewedProducts.forEach(vp => {
          if (vp.tags) {
            const commonTags = product.tags!.filter(tag => vp.tags!.includes(tag));
            score += commonTags.length * 2;
          }
        });
      }

      // Boost featured products
      if (product.isFeatured) {
        score += 3;
      }

      // Boost products in similar price range
      const avgPrice = viewedProducts.length > 0
        ? viewedProducts.reduce((sum, p) => sum + p.price, 0) / viewedProducts.length
        : 0;
      if (avgPrice > 0) {
        const priceDiff = Math.abs(product.price - avgPrice);
        if (priceDiff < avgPrice * 0.3) {
          score += 5;
        }
      }

      // Penalize already viewed products
      if (behavior.viewedProducts.includes(product.id)) {
        score -= 15;
      }

      // Penalize items already in cart
      if (behavior.cartItems.includes(product.id)) {
        score -= 20;
      }

      return { product, score };
    });

    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.product);
  };

  const getSimilarProducts = (product: Product): Product[] => {
    return products
      .filter(p => p.id !== product.id)
      .map(p => {
        let similarity = 0;

        // Same category is very important
        if (p.category === product.category) similarity += 30;

        // Similar price range
        const priceDiff = Math.abs(p.price - product.price);
        if (priceDiff < product.price * 0.3) similarity += 20;

        // Same vendor
        if (p.vendorId === product.vendorId) similarity += 15;

        // Common tags
        if (p.tags && product.tags) {
          const commonTags = p.tags.filter(tag => product.tags!.includes(tag));
          similarity += commonTags.length * 10;
        }

        // Similar name keywords
        const productWords = new Set(product.name.toLowerCase().split(' '));
        const pWords = new Set(p.name.toLowerCase().split(' '));
        const commonWords = Array.from(productWords).filter(word => 
          pWords.has(word) && word.length > 3
        );
        similarity += commonWords.length * 5;

        return { product: p, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8)
      .map(item => item.product);
  };

  const getFrequentlyBoughtTogether = (product: Product): Product[] => {
    return products
      .filter(p => {
        if (p.id === product.id) return false;
        
        // Products from same category or complementary categories
        if (p.category === product.category) return true;
        
        // Price should be in reasonable range (not too expensive together)
        if (p.price + product.price < product.price * 2.5) return true;
        
        return false;
      })
      .slice(0, 6);
  };

  // Track views when component mounts
  useEffect(() => {
    if (currentProduct) {
      trackProductView(currentProduct.id, currentProduct.category);
    }
  }, [currentProduct]);

  if (recommendations.personalized.length === 0 && 
      recommendations.similar.length === 0 && 
      recommendations.trending.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12">
      {/* Personalized For You */}
      {recommendations.personalized.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Recommended For You</h2>
                <p className="text-sm text-slate-400">AI-powered picks based on your activity</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border border-[#ea580c]/20 rounded-full">
              <Sparkles className="w-4 h-4 text-[#ea580c] animate-pulse" />
              <span className="text-xs font-bold text-[#ea580c]">AI Powered</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.personalized.slice(0, 4).map((product, index) => (
              <RecommendationCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => onProductClick(product)}
                onAddToCart={() => onAddToCart(product)}
                badge="Recommended"
                badgeColor="from-[#ea580c] to-orange-700"
              />
            ))}
          </div>
        </section>
      )}

      {/* Similar Products */}
      {currentProduct && recommendations.similar.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Similar Products</h2>
                <p className="text-sm text-slate-400">You might also like these</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.similar.slice(0, 4).map((product, index) => (
              <RecommendationCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => onProductClick(product)}
                onAddToCart={() => onAddToCart(product)}
                badge="Similar"
                badgeColor="from-orange-600 to-amber-600"
              />
            ))}
          </div>
        </section>
      )}

      {/* Frequently Bought Together */}
      {currentProduct && recommendations.frequentlyBought.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Frequently Bought Together</h2>
                <p className="text-sm text-slate-400">Complete your purchase</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.frequentlyBought.slice(0, 3).map((product, index) => (
              <RecommendationCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => onProductClick(product)}
                onAddToCart={() => onAddToCart(product)}
                badge="Bundle Deal"
                badgeColor="from-orange-500 to-amber-500"
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Products */}
      {recommendations.trending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-red-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Trending Now</h2>
                <p className="text-sm text-slate-400">Popular with other customers</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.trending.slice(0, 4).map((product, index) => (
              <RecommendationCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => onProductClick(product)}
                onAddToCart={() => onAddToCart(product)}
                badge="Trending"
                badgeColor="from-[#ea580c] to-red-600"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({
  product,
  index,
  onClick,
  onAddToCart,
  badge,
  badgeColor
}: {
  product: Product;
  index: number;
  onClick: () => void;
  onAddToCart: () => void;
  badge: string;
  badgeColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative cursor-pointer"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity"></div>

      <div 
        className="relative bg-slate-900/50 backdrop-blur-xl border border-[#ea580c]/10 group-hover:border-[#ea580c]/30 rounded-2xl overflow-hidden transition-all"
        onClick={onClick}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
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

          {/* Badge */}
          <div className="absolute top-3 left-3">
            <div className={`px-3 py-1.5 bg-gradient-to-r ${badgeColor} backdrop-blur-xl rounded-full flex items-center gap-1.5 shadow-lg`}>
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-black text-white">{badge}</span>
            </div>
          </div>

          {/* Quick Add Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className="absolute bottom-3 left-3 right-3 py-2.5 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-[#ea580c]/50 transition-shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            Quick Add
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-white line-clamp-2 text-sm leading-snug group-hover:text-[#ea580c] transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div className="text-xl font-black bg-gradient-to-r from-[#ea580c] to-orange-400 bg-clip-text text-transparent">
              ${product.price.toFixed(2)}
            </div>

            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < 4 ? 'text-[#ea580c] fill-current' : 'text-slate-700'
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