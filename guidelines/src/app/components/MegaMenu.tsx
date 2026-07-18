// Advanced Mega Menu with Dynamic Filters and Featured Products
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Grid3x3,
  Layers,
  Zap,
  TrendingUp,
  Star,
  Tag,
  Package,
  Wrench,
  HardHat,
  Hammer,
  Drill,
  PaintBucket,
  Lightbulb,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { Product } from '../types/ecommerce';

interface MegaMenuProps {
  products: Product[];
  onCategorySelect: (category: string) => void;
  onProductClick: (product: Product) => void;
}

interface Category {
  name: string;
  icon: any;
  subcategories: string[];
  color: string;
}

const categories: Category[] = [
  {
    name: 'Power Tools',
    icon: Drill,
    subcategories: ['Drills & Drivers', 'Saws', 'Sanders', 'Grinders', 'Impact Drivers'],
    color: 'from-[#ea580c] to-orange-600'
  },
  {
    name: 'Hand Tools',
    icon: Hammer,
    subcategories: ['Hammers', 'Wrenches', 'Screwdrivers', 'Pliers', 'Measuring Tools'],
    color: 'from-orange-600 to-amber-600'
  },
  {
    name: 'Safety Equipment',
    icon: HardHat,
    subcategories: ['Hard Hats', 'Gloves', 'Safety Glasses', 'Vests', 'Ear Protection'],
    color: 'from-[#ea580c] to-orange-700'
  },
  {
    name: 'Materials',
    icon: Package,
    subcategories: ['Lumber', 'Concrete', 'Drywall', 'Insulation', 'Roofing'],
    color: 'from-orange-500 to-red-600'
  },
  {
    name: 'Electrical',
    icon: Lightbulb,
    subcategories: ['Wire & Cable', 'Lighting', 'Outlets', 'Circuit Breakers', 'Conduit'],
    color: 'from-yellow-500 to-amber-500'
  },
  {
    name: 'Paint & Supplies',
    icon: PaintBucket,
    subcategories: ['Interior Paint', 'Exterior Paint', 'Brushes', 'Rollers', 'Tape'],
    color: 'from-indigo-500 to-violet-500'
  }
];

export default function MegaMenu({ products, onCategorySelect, onProductClick }: MegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFeaturedProducts = (categoryName: string) => {
    return products
      .filter(p => p.category === categoryName && p.isFeatured)
      .slice(0, 3);
  };

  const getTrendingProducts = () => {
    return products
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
      .slice(0, 4);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Main Menu Bar */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveMenu(activeMenu === 'categories' ? null : 'categories')}
          className={`px-5 py-3 bg-slate-900/50 backdrop-blur-xl border rounded-xl font-semibold flex items-center gap-2 transition-all ${
            activeMenu === 'categories'
              ? 'border-[#ea580c]/50 text-[#ea580c]'
              : 'border-[#ea580c]/20 text-slate-300 hover:border-[#ea580c]/40 hover:text-white'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          All Categories
          <ChevronDown className={`w-4 h-4 transition-transform ${activeMenu === 'categories' ? 'rotate-180' : ''}`} />
        </motion.button>

        {/* Quick Links */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setActiveMenu(activeMenu === 'deals' ? null : 'deals')}
            className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              activeMenu === 'deals'
                ? 'text-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            Hot Deals
          </button>

          <button
            onClick={() => setActiveMenu(activeMenu === 'trending' ? null : 'trending')}
            className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              activeMenu === 'trending'
                ? 'text-[#ea580c]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>

          <button
            onClick={() => setActiveMenu(activeMenu === 'featured' ? null : 'featured')}
            className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              activeMenu === 'featured'
                ? 'text-amber-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            Featured
          </button>
        </div>
      </div>

      {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {activeMenu === 'categories' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-3 w-screen max-w-6xl z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-[#ea580c]/20 rounded-3xl p-8 shadow-2xl shadow-[#ea580c]/10">
              <div className="grid grid-cols-12 gap-8">
                {/* Categories List */}
                <div className="col-span-4 space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-[#ea580c]" />
                    <h3 className="text-lg font-bold text-white">Browse by Category</h3>
                  </div>
                  
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <motion.button
                        key={category.name}
                        whileHover={{ x: 4 }}
                        onClick={() => {
                          onCategorySelect(category.name);
                          setActiveMenu(null);
                        }}
                        onMouseEnter={() => setHoveredSubcategory(category.name)}
                        className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all group ${
                          hoveredSubcategory === category.name
                            ? 'bg-gradient-to-r ' + category.color + ' text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          hoveredSubcategory === category.name
                            ? 'bg-white/20'
                            : 'bg-slate-700/50'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{category.name}</div>
                          <div className={`text-xs ${
                            hoveredSubcategory === category.name
                              ? 'text-white/70'
                              : 'text-slate-500'
                          }`}>
                            {category.subcategories.length} subcategories
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Subcategories */}
                <div className="col-span-3 space-y-2">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
                    Subcategories
                  </h3>
                  
                  {hoveredSubcategory && categories.find(c => c.name === hoveredSubcategory)?.subcategories.map((sub) => (
                    <motion.button
                      key={sub}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        onCategorySelect(sub);
                        setActiveMenu(null);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
                    >
                      {sub}
                    </motion.button>
                  ))}
                  
                  {!hoveredSubcategory && (
                    <div className="text-sm text-slate-500 text-center py-8">
                      Hover over a category to see subcategories
                    </div>
                  )}
                </div>

                {/* Featured Products */}
                <div className="col-span-5 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-bold text-white">Featured Products</h3>
                  </div>

                  {(hoveredSubcategory 
                    ? getFeaturedProducts(hoveredSubcategory)
                    : products.filter(p => p.isFeatured).slice(0, 3)
                  ).map((product) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        onProductClick(product);
                        setActiveMenu(null);
                      }}
                      className="w-full bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-3 flex gap-3 transition-all group"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 overflow-hidden">
                        {product.primaryImage ? (
                          <img 
                            src={product.primaryImage} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold text-white text-sm line-clamp-1 group-hover:text-[#ea580c] transition-colors">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {product.vendorName}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-lg font-bold text-[#ea580c]">
                            ${product.price.toFixed(2)}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              ${product.compareAtPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}

                  {/* View All Link */}
                  <button
                    onClick={() => {
                      if (hoveredSubcategory) {
                        onCategorySelect(hoveredSubcategory);
                      }
                      setActiveMenu(null);
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#ea580c]/10 to-orange-600/10 border border-[#ea580c]/20 rounded-xl text-[#ea580c] font-semibold hover:border-[#ea580c]/40 transition-all flex items-center justify-center gap-2"
                  >
                    View All Products
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Deals Panel */}
        {activeMenu === 'deals' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-32 mt-3 w-96 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-bold text-white">Hot Deals</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Limited time offers on selected products
              </p>
              <div className="space-y-3">
                {products
                  .filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
                  .slice(0, 4)
                  .map((product) => {
                    const discount = Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100);
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          onProductClick(product);
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center">
                          <Tag className="w-6 h-6 text-pink-400" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-semibold text-white line-clamp-1 group-hover:text-pink-400 transition-colors">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-pink-400 font-bold">-{discount}%</span>
                            <span className="text-xs text-slate-500 line-through">
                              ${product.compareAtPrice!.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trending Panel */}
        {activeMenu === 'trending' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-56 mt-3 w-96 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Trending Now</h3>
              </div>
              <div className="space-y-2">
                {getTrendingProducts().map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      onProductClick(product);
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {product.orderCount || 0} sold
                      </div>
                    </div>
                    <div className="text-purple-400 font-bold">
                      ${product.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}