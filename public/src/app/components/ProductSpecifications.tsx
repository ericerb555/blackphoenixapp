// Detailed Product Specifications and Downloadable Datasheets
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Download,
  Clipboard,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  Ruler,
  Weight,
  Zap,
  Shield,
  Award,
  Info,
  AlertCircle,
  FileDown,
  Share2
} from 'lucide-react';

interface Specification {
  category: string;
  icon: any;
  items: { label: string; value: string; important?: boolean }[];
}

interface ProductSpecificationsProps {
  productName: string;
  productId: string;
}

export default function ProductSpecifications({ productName, productId }: ProductSpecificationsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['General']));
  const [copied, setCopied] = useState(false);

  // Demo specifications
  const specifications: Specification[] = [
    {
      category: 'General',
      icon: Package,
      items: [
        { label: 'Model Number', value: 'DRL-20V-PRO', important: true },
        { label: 'Brand', value: 'ProTech Industrial' },
        { label: 'Country of Origin', value: 'USA' },
        { label: 'Warranty', value: '3 Years Limited', important: true },
        { label: 'UPC', value: '123456789012' }
      ]
    },
    {
      category: 'Performance',
      icon: Zap,
      items: [
        { label: 'Motor Power', value: '750W Brushless', important: true },
        { label: 'Max Torque', value: '500 in-lbs' },
        { label: 'Speed Range', value: '0-450 / 0-1,500 RPM' },
        { label: 'Chuck Size', value: '1/2" (13mm)' },
        { label: 'Max Drilling Capacity (Wood)', value: '2-1/2"' },
        { label: 'Max Drilling Capacity (Steel)', value: '1/2"' }
      ]
    },
    {
      category: 'Battery & Runtime',
      icon: Zap,
      items: [
        { label: 'Battery Type', value: '20V Li-Ion', important: true },
        { label: 'Battery Capacity', value: '4.0 Ah' },
        { label: 'Runtime (Typical)', value: '2-4 hours' },
        { label: 'Charge Time', value: '45 minutes (Fast Charge)' },
        { label: 'Batteries Included', value: '2' }
      ]
    },
    {
      category: 'Dimensions & Weight',
      icon: Ruler,
      items: [
        { label: 'Length', value: '8.5 inches' },
        { label: 'Width', value: '3.2 inches' },
        { label: 'Height', value: '9.5 inches' },
        { label: 'Weight (with battery)', value: '4.2 lbs', important: true },
        { label: 'Shipping Weight', value: '12 lbs' }
      ]
    },
    {
      category: 'Features',
      icon: Award,
      items: [
        { label: 'LED Work Light', value: 'Yes - 20 LED Array' },
        { label: 'Variable Speed Trigger', value: 'Yes' },
        { label: 'Reverse Function', value: 'Yes' },
        { label: 'Belt Clip', value: 'Yes' },
        { label: 'Carrying Case', value: 'Hard Case Included' },
        { label: 'Bit Set', value: '20-Piece Included' }
      ]
    },
    {
      category: 'Safety & Compliance',
      icon: Shield,
      items: [
        { label: 'UL Listed', value: 'Yes' },
        { label: 'OSHA Compliant', value: 'Yes' },
        { label: 'CE Certified', value: 'Yes' },
        { label: 'RoHS Compliant', value: 'Yes' },
        { label: 'Safety Features', value: 'Electronic Brake, Overload Protection' }
      ]
    }
  ];

  const datasheets = [
    {
      name: 'Product Datasheet',
      type: 'PDF',
      size: '2.4 MB',
      icon: FileText,
      description: 'Complete technical specifications and features'
    },
    {
      name: 'User Manual',
      type: 'PDF',
      size: '5.1 MB',
      icon: FileText,
      description: 'Operating instructions and safety guidelines'
    },
    {
      name: 'Quick Start Guide',
      type: 'PDF',
      size: '850 KB',
      icon: FileDown,
      description: 'Get started in minutes'
    },
    {
      name: 'CAD Drawings (DWG)',
      type: 'ZIP',
      size: '1.2 MB',
      icon: FileDown,
      description: 'AutoCAD compatible 3D models'
    }
  ];

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const copyAllSpecs = () => {
    const allSpecs = specifications
      .map(cat =>
        `${cat.category}:\n${cat.items.map(item => `  ${item.label}: ${item.value}`).join('\n')}`
      )
      .join('\n\n');

    navigator.clipboard.writeText(allSpecs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDatasheet = (sheet: typeof datasheets[0]) => {
    // In production, trigger actual download
    console.log(`Downloading ${sheet.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Technical Specifications</h2>
            <p className="text-sm text-slate-400">Detailed product information</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyAllSpecs}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Clipboard className="w-4 h-4" />
              Copy All
            </>
          )}
        </motion.button>
      </div>

      {/* Specifications Grid */}
      <div className="space-y-3">
        {specifications.map((spec, index) => {
          const Icon = spec.icon;
          const isExpanded = expandedCategories.has(spec.category);

          return (
            <motion.div
              key={spec.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/10 rounded-2xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(spec.category)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-lg font-bold text-white">{spec.category}</h3>
                  <p className="text-sm text-slate-400">{spec.items.length} specifications</p>
                </div>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </motion.div>
              </button>

              {/* Expandable Content */}
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-2 space-y-2">
                  {spec.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        item.important
                          ? 'bg-cyan-500/10 border border-cyan-500/20'
                          : 'bg-slate-800/30 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.important && (
                          <AlertCircle className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className={`font-semibold ${
                          item.important ? 'text-cyan-400' : 'text-slate-400'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-white font-bold">{item.value}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Downloadable Datasheets */}
      <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Download Documentation</h3>
            <p className="text-sm text-slate-400">Get detailed product information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasheets.map((sheet, index) => {
            const Icon = sheet.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-slate-900/50 hover:bg-slate-900 border border-cyan-500/10 hover:border-cyan-500/30 rounded-xl p-4 transition-all cursor-pointer"
                onClick={() => downloadDatasheet(sheet)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {sheet.name}
                      </h4>
                      <div className="px-2 py-0.5 bg-slate-800 rounded text-xs font-bold text-slate-400">
                        {sheet.type}
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-2 line-clamp-1">
                      {sheet.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{sheet.size}</span>
                      <motion.div
                        className="flex items-center gap-2 text-cyan-400 font-semibold text-sm"
                        whileHover={{ x: 4 }}
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Share Specs */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-5 h-5" />
            Share Specifications
          </motion.button>
        </div>
      </div>

      {/* Important Notes */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-400 mb-1">Product Information</h4>
            <p className="text-sm text-blue-300 leading-relaxed">
              Specifications are subject to change without notice. For the most up-to-date information, please refer to the official product documentation. Contact customer service for specific technical questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
