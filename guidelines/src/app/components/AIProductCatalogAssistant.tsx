/**
 * AI Product Catalog Assistant
 * State-of-the-art AI assistant for automated product catalog import
 */

import { useState } from 'react';
import {
  Upload, FileText, Sparkles, CheckCircle, AlertCircle, Edit2,
  Trash2, Save, X, Download, FileSpreadsheet, File, Image,
  Loader2, Brain, Zap, Eye, Plus, Check, RefreshCw, Package,
  DollarSign, Tag, Box, BarChart3, TrendingUp, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface ProductData {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  unit: string;
  brand?: string;
  quantity?: number;
  weight?: string;
  dimensions?: string;
  imageUrl?: string;
  aiConfidence: number;
  needsReview: boolean;
  status: 'pending' | 'verified' | 'edited';
}

interface ImportSession {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'uploading' | 'processing' | 'review' | 'completed' | 'failed';
  totalProducts: number;
  processedProducts: number;
  verifiedProducts: number;
  aiAccuracy: number;
}

export default function AIProductCatalogAssistant() {
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedProduct, setEditedProduct] = useState<ProductData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStage, setProcessingStage] = useState<'upload' | 'extract' | 'analyze' | 'structure' | 'validate' | 'complete'>('upload');

  // Simulate AI processing stages
  const simulateAIProcessing = (file: File) => {
    const session: ImportSession = {
      id: 'session-' + Date.now(),
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
      uploadDate: new Date().toLocaleDateString(),
      status: 'uploading',
      totalProducts: 0,
      processedProducts: 0,
      verifiedProducts: 0,
      aiAccuracy: 0
    };
    
    setImportSession(session);
    setProcessingStage('upload');

    // Stage 1: Upload
    setTimeout(() => {
      setProcessingStage('extract');
      setImportSession({ ...session, status: 'processing' });
    }, 1000);

    // Stage 2: Extract
    setTimeout(() => {
      setProcessingStage('analyze');
    }, 2000);

    // Stage 3: Analyze
    setTimeout(() => {
      setProcessingStage('structure');
    }, 3500);

    // Stage 4: Structure
    setTimeout(() => {
      setProcessingStage('validate');
      
      // Generate mock products
      const mockProducts: ProductData[] = [
        {
          id: 'p1',
          name: 'Professional Grade HVAC Filter - 20x25x1',
          description: 'MERV 13 pleated filter with antimicrobial coating. Captures 95% of airborne particles. Extended lifespan up to 6 months.',
          sku: 'HVAC-FLT-20X25-M13',
          category: 'HVAC Filters',
          price: 24.99,
          unit: 'each',
          brand: 'FilterPro',
          quantity: 500,
          weight: '0.8 lbs',
          dimensions: '20" x 25" x 1"',
          aiConfidence: 0.98,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p2',
          name: 'Industrial HVAC Compressor Unit',
          description: 'High-efficiency scroll compressor for commercial applications. 5-ton capacity with variable speed control.',
          sku: 'HVAC-COMP-5T-VS',
          category: 'Compressors',
          price: 2499.00,
          unit: 'each',
          brand: 'CoolTech Pro',
          quantity: 25,
          weight: '185 lbs',
          dimensions: '36" x 24" x 28"',
          aiConfidence: 0.95,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p3',
          name: 'R-410A Refrigerant Cylinder - 25lb',
          description: 'EPA-approved refrigerant for modern AC systems. High purity grade for optimal performance.',
          sku: 'REF-410A-25LB',
          category: 'Refrigerants',
          price: 389.99,
          unit: 'cylinder',
          brand: 'ChillMax',
          quantity: 150,
          weight: '25 lbs',
          dimensions: '12" diameter x 24" height',
          aiConfidence: 0.97,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p4',
          name: 'Copper Tubing Type L - 3/4 inch',
          description: 'Premium copper tubing for refrigeration and HVAC applications. 50ft coil.',
          sku: 'TUBE-CU-L-34-50',
          category: 'Piping & Tubing',
          price: 125.50,
          unit: 'coil',
          brand: 'CopperLine',
          quantity: 200,
          weight: '45 lbs',
          dimensions: 'Coil diameter 24"',
          aiConfidence: 0.92,
          needsReview: true,
          status: 'pending'
        },
        {
          id: 'p5',
          name: 'Digital Thermostat - Programmable WiFi',
          description: 'Smart thermostat with 7-day programming and mobile app control. Energy Star certified.',
          sku: 'THERM-WIFI-7D',
          category: 'Controls & Thermostats',
          price: 149.99,
          unit: 'each',
          brand: 'SmartClimate',
          quantity: 300,
          weight: '0.5 lbs',
          dimensions: '4.5" x 4.5" x 1"',
          aiConfidence: 0.96,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p6',
          name: 'Insulated Ductwork - 6 inch diameter',
          description: 'Pre-insulated flexible ductwork with R-6 insulation value. 25ft length.',
          sku: 'DUCT-INS-6-25',
          category: 'Ductwork',
          price: 67.50,
          unit: 'length',
          brand: 'DuctMaster',
          quantity: 175,
          weight: '12 lbs',
          dimensions: '6" diameter x 25ft',
          aiConfidence: 0.89,
          needsReview: true,
          status: 'pending'
        },
        {
          id: 'p7',
          name: 'Condensate Drain Pan Tablets - 12 Pack',
          description: 'Bio-enzymatic tablets prevent algae and slime buildup. Safe for all systems.',
          sku: 'DRAIN-TAB-BIO-12',
          category: 'Maintenance Supplies',
          price: 18.99,
          unit: 'pack',
          brand: 'PanClear',
          quantity: 450,
          weight: '0.3 lbs',
          dimensions: '4" x 6" x 2"',
          aiConfidence: 0.94,
          needsReview: false,
          status: 'verified'
        },
        {
          id: 'p8',
          name: 'Capacitor Dual Run 45/5 MFD 370V',
          description: 'Heavy-duty oval capacitor for AC and heat pump applications. Extended lifespan.',
          sku: 'CAP-DR-45-5-370',
          category: 'Electrical Components',
          price: 32.99,
          unit: 'each',
          brand: 'PowerMax',
          quantity: 350,
          weight: '0.6 lbs',
          dimensions: '2.5" x 4" x 2.5"',
          aiConfidence: 0.91,
          needsReview: true,
          status: 'pending'
        }
      ];
      
      setProducts(mockProducts);
    }, 5000);

    // Stage 5: Validate
    setTimeout(() => {
      setProcessingStage('complete');
      setImportSession({
        ...session,
        status: 'review',
        totalProducts: 8,
        processedProducts: 8,
        verifiedProducts: 5,
        aiAccuracy: 94
      });
      toast.success('AI processing complete! Review imported products.');
    }, 6500);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    
    const validTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, CSV, Excel, or JSON file');
      return;
    }

    simulateAIProcessing(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleEditProduct = (product: ProductData) => {
    setSelectedProduct(product);
    setEditedProduct({ ...product });
    setShowEditModal(true);
  };

  const handleSaveProduct = () => {
    if (!editedProduct) return;
    
    setProducts(products.map(p => 
      p.id === editedProduct.id 
        ? { ...editedProduct, status: 'edited', needsReview: false }
        : p
    ));
    
    setShowEditModal(false);
    setEditedProduct(null);
    setSelectedProduct(null);
    toast.success('Product updated successfully');
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
    toast.success('Product removed');
  };

  const handleVerifyProduct = (productId: string) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, status: 'verified', needsReview: false }
        : p
    ));
    toast.success('Product verified');
  };

  const handleImportAll = () => {
    const unverified = products.filter(p => p.needsReview);
    if (unverified.length > 0) {
      toast.error(`Please review ${unverified.length} products marked for review`);
      return;
    }
    
    // Simulate saving to database
    toast.success(`Successfully imported ${products.length} products to your catalog!`);
    setImportSession(null);
    setProducts([]);
    setProcessingStage('upload');
  };

  const columns: DataTableColumn<ProductData>[] = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: (row) => (
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white">{row.name}</p>
            {row.aiConfidence > 0.95 && (
              <Sparkles className="w-3 h-3 text-yellow-400" />
            )}
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">{row.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded font-semibold">
              {row.brand}
            </span>
            <span className="text-xs text-gray-500">SKU: {row.sku}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (row) => <span className="text-sm text-gray-300">{row.category}</span>,
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: (row) => (
        <div>
          <p className="font-semibold text-white">${row.price.toFixed(2)}</p>
          <p className="text-xs text-gray-400">per {row.unit}</p>
        </div>
      ),
      headerClassName: 'text-right',
    },
    {
      header: 'Stock',
      accessorKey: 'quantity',
      cell: (row) => (
        <span className="font-medium text-white">{row.quantity}</span>
      ),
      headerClassName: 'text-center',
    },
    {
      header: 'AI Confidence',
      accessorKey: 'aiConfidence',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[80px]">
            <div className="h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  row.aiConfidence >= 0.95 ? 'bg-green-500' :
                  row.aiConfidence >= 0.90 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${row.aiConfidence * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-300">
            {(row.aiConfidence * 100).toFixed(0)}%
          </span>
        </div>
      ),
      headerClassName: 'text-center',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.needsReview ? (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-600 text-white flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Review
            </span>
          ) : row.status === 'verified' ? (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-600 text-white flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white flex items-center gap-1">
              <Edit2 className="w-3 h-3" />
              Edited
            </span>
          )}
        </div>
      ),
      headerClassName: 'text-center',
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditProduct(row)}
            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {row.needsReview && (
            <button
              onClick={() => handleVerifyProduct(row.id)}
              className="p-1.5 bg-green-600/20 hover:bg-green-600/30 rounded text-green-400 transition"
              title="Verify"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDeleteProduct(row.id)}
            className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded text-red-400 transition"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      headerClassName: 'text-right',
    },
  ];

  const processingStages = [
    { id: 'upload', label: 'Uploading File', icon: Upload, color: 'blue' },
    { id: 'extract', label: 'Extracting Data', icon: FileText, color: 'purple' },
    { id: 'analyze', label: 'AI Analysis', icon: Brain, color: 'pink' },
    { id: 'structure', label: 'Structuring Data', icon: Package, color: 'cyan' },
    { id: 'validate', label: 'Validating', icon: CheckCircle, color: 'green' },
    { id: 'complete', label: 'Complete', icon: Sparkles, color: 'yellow' }
  ];

  const currentStageIndex = processingStages.findIndex(s => s.id === processingStage);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            AI Product Catalog Assistant
          </h1>
          <p className="text-gray-400">Upload your catalog and let AI handle the rest</p>
        </div>
        <a 
          href="/ai-diagnostics"
          className="px-4 py-2 bg-[#0A0A0A] border border-[#ea580c]/30 hover:border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-semibold rounded-lg transition-all flex items-center gap-2 group"
        >
          <Brain className="w-4 h-4" />
          AI Control Center
          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
        </a>
      </div>

      {/* Upload Area */}
      {!importSession && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-[#2A2A2A] hover:border-purple-500/50'
            }`}
          >
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Upload Your Product Catalog
                </h3>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Our AI will automatically extract product information, validate data, and structure it for your catalog. 
                  Supports PDF, CSV, Excel, and JSON formats.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <label className="px-6 py-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-gray-300 hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102 transition-all duration-300 rounded-xl font-bold cursor-pointer flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.csv,.xls,.xlsx,.json"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
                <span className="text-gray-500">or drag and drop here</span>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <File className="w-4 h-4" />
                  <span>PDF</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV / Excel</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>JSON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Brain className="w-8 h-8 text-purple-400 mb-3" />
              <h4 className="font-bold text-white mb-1">AI-Powered</h4>
              <p className="text-sm text-gray-400">Advanced ML models extract product data</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <h4 className="font-bold text-white mb-1">Lightning Fast</h4>
              <p className="text-sm text-gray-400">Process hundreds of products in seconds</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <h4 className="font-bold text-white mb-1">High Accuracy</h4>
              <p className="text-sm text-gray-400">94%+ average accuracy with validation</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
              <Edit2 className="w-8 h-8 text-blue-400 mb-3" />
              <h4 className="font-bold text-white mb-1">Fully Editable</h4>
              <p className="text-sm text-gray-400">Review and adjust before importing</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {importSession && importSession.status === 'processing' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Processing Your Catalog</h3>
              <p className="text-gray-400">
                File: <span className="text-white font-semibold">{importSession.fileName}</span>
                {' '}({importSession.fileSize})
              </p>
            </div>

            {/* Progress Stages */}
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                {processingStages.map((stage, index) => {
                  const StageIcon = stage.icon;
                  const isActive = index === currentStageIndex;
                  const isCompleted = index < currentStageIndex;
                  
                  return (
                    <div key={stage.id} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isActive
                              ? `bg-${stage.color}-600 shadow-lg shadow-${stage.color}-500/50 scale-110`
                              : isCompleted
                              ? `bg-${stage.color}-600/30`
                              : 'bg-[#2A2A2A]'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-6 h-6 text-green-400" />
                          ) : (
                            <StageIcon
                              className={`w-6 h-6 ${
                                isActive ? 'text-white animate-pulse' : 'text-gray-600'
                              }`}
                            />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-2 font-semibold ${
                            isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {stage.label}
                        </p>
                      </div>
                      {index < processingStages.length - 1 && (
                        <div className="flex-1 h-0.5 bg-[#2A2A2A] mx-2">
                          <div
                            className={`h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500 ${
                              isCompleted ? 'w-full' : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-semibold">
                {processingStages[currentStageIndex]?.label}...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Review Products */}
      {importSession && importSession.status === 'review' && products.length > 0 && (
        <>
          {/* Session Info */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-12 h-12" />
                <div>
                  <h3 className="text-2xl font-bold mb-1">AI Processing Complete!</h3>
                  <p className="opacity-90">
                    Extracted {importSession.totalProducts} products from {importSession.fileName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold mb-1">{importSession.aiAccuracy}%</div>
                <p className="text-sm opacity-90">Average Accuracy</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <Package className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">{importSession.totalProducts}</p>
              <p className="text-sm text-gray-400">Total Products</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{importSession.verifiedProducts}</p>
              <p className="text-sm text-gray-400">Auto-Verified</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <AlertCircle className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-2xl font-bold text-white">
                {products.filter(p => p.needsReview).length}
              </p>
              <p className="text-sm text-gray-400">Need Review</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <DollarSign className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-white">
                ${products.reduce((sum, p) => sum + p.price, 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-400">Total Value</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="px-6 py-4 bg-[#0F0F0F] border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Review Products</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setImportSession(null);
                    setProducts([]);
                    setProcessingStage('upload');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600/10 to-gray-700/10 text-gray-300 hover:from-gray-600/20 hover:to-gray-700/20 hover:text-white border-2 border-gray-500/30 hover:border-gray-400/50 transition-all duration-300 rounded-lg font-semibold flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleImportAll}
                  className="px-6 py-2 bg-gradient-to-r from-green-600/10 to-green-700/10 text-gray-300 hover:from-green-600/20 hover:to-green-700/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102 transition-all duration-300 rounded-lg font-bold flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Import All Products
                </button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={products}
              emptyMessage="No products"
              containerClassName="bg-transparent border-none"
              headerClassName="bg-[#0A0A0A] border-[#2A2A2A]"
            />
          </div>
        </>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-blue-400" />
                Edit Product
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedProduct(null);
                  setSelectedProduct(null);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editedProduct.name}
                    onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={editedProduct.description}
                    onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={editedProduct.sku}
                    onChange={(e) => setEditedProduct({ ...editedProduct, sku: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={editedProduct.brand || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, brand: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={editedProduct.category}
                    onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editedProduct.price}
                      onChange={(e) => setEditedProduct({ ...editedProduct, price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={editedProduct.unit}
                    onChange={(e) => setEditedProduct({ ...editedProduct, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="each, box, pack, etc."
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={editedProduct.quantity || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={editedProduct.weight || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, weight: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="e.g., 5 lbs"
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={editedProduct.dimensions || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, dimensions: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder='e.g., 12" x 8" x 4"'
                  />
                </div>
              </div>

              {/* AI Confidence Indicator */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-300">
                      AI Confidence: {(editedProduct.aiConfidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-blue-400">
                      {editedProduct.aiConfidence >= 0.95
                        ? 'High confidence - data extracted with high accuracy'
                        : editedProduct.aiConfidence >= 0.90
                        ? 'Good confidence - please verify important fields'
                        : 'Low confidence - please review all fields carefully'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedProduct(null);
                  setSelectedProduct(null);
                }}
                className="px-6 py-2 bg-gradient-to-r from-gray-600/10 to-gray-700/10 text-gray-300 hover:from-gray-600/20 hover:to-gray-700/20 hover:text-white border-2 border-gray-500/30 hover:border-gray-400/50 transition-all duration-300 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-6 py-2 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102 transition-all duration-300 rounded-lg font-bold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
