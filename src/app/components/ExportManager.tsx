import { useState } from 'react';
import {
  exportDatabase,
  createDeploymentPackage,
  downloadExport,
  ExportOptions,
} from '../lib/export-system';
import {
  Download,
  Upload,
  Package,
  Database,
  Code,
  Settings,
  FileJson,
  FileText,
  Table,
  FileCode,
  CheckCircle,
  AlertCircle,
  Loader,
  Boxes,
  Users,
  Image,
  Folder,
  Server,
  GitBranch,
  Archive,
  Lock,
  Unlock,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Shield,
} from 'lucide-react';

export default function ExportManager() {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'deploy'>('export');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql' | 'xml'>('json');
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeAssets, setIncludeAssets] = useState(true);
  const [includeSchema, setIncludeSchema] = useState(true);

  const allTables = [
    'companies',
    'user_profiles',
    'customers',
    'quotes',
    'work_orders',
    'invoices',
    'payments',
    'projects',
    'crm_contacts',
    'crm_deals',
    'crm_activities',
    'platform_modules',
    'subscriptions',
    'transactions',
    'messages',
    'notifications',
    'activities',
    'documents',
    'settings',
  ];

  const handleExportDatabase = async () => {
    setExporting(true);
    setProgress(0);
    setStatus('Preparing export...');

    try {
      const options: ExportOptions = {
        format: {
          type: exportFormat,
          compressed: false,
          encrypted: false,
        },
        tables: selectedTables.length > 0 ? selectedTables : allTables,
        includeSchema,
        includeData: true,
        includeUsers,
        includeModules: true,
        includeSettings: true,
      };

      setProgress(30);
      setStatus('Exporting database...');

      const exportData = await exportDatabase(options);

      setProgress(80);
      setStatus('Generating file...');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `enterprise-db-export-${timestamp}.${exportFormat}`;

      downloadExport(exportData, filename, exportFormat);

      setProgress(100);
      setStatus('Export complete!');
      
      setTimeout(() => {
        setExporting(false);
        setStatus('');
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Export error:', error);
      setStatus('Export failed. Please try again.');
      setTimeout(() => {
        setExporting(false);
        setStatus('');
      }, 3000);
    }
  };

  const handleCreateDeploymentPackage = async () => {
    setDeploying(true);
    setProgress(0);
    setStatus('Creating deployment package...');

    try {
      setProgress(20);
      setStatus('Exporting database schema...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(40);
      setStatus('Exporting modules...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(60);
      setStatus('Exporting assets...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(80);
      setStatus('Creating package...');

      const pkg = await createDeploymentPackage();

      setProgress(90);
      setStatus('Compressing package...');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `enterprise-deployment-${timestamp}.json`;

      downloadExport(pkg, filename, 'json');

      setProgress(100);
      setStatus('Deployment package created!');

      setTimeout(() => {
        setDeploying(false);
        setStatus('');
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Deployment error:', error);
      setStatus('Failed to create deployment package.');
      setTimeout(() => {
        setDeploying(false);
        setStatus('');
      }, 3000);
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(allTables);
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Download className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Export & Deployment Manager</h1>
              <p className="text-blue-100 text-lg">Export data, create deployment packages, and migrate your application</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'deploy'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Deployment Package
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>
        </div>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Export Database</h2>

            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { value: 'json', label: 'JSON', icon: FileJson, desc: 'Structured data format' },
                  { value: 'csv', label: 'CSV', icon: Table, desc: 'Spreadsheet compatible' },
                  { value: 'sql', label: 'SQL', icon: Database, desc: 'Database scripts' },
                  { value: 'xml', label: 'XML', icon: FileCode, desc: 'Markup language' },
                ].map(format => (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value as any)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      exportFormat === format.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <format.icon className={`w-8 h-8 mb-2 ${
                      exportFormat === format.value ? 'text-purple-600' : 'text-gray-400'
                    }`} />
                    <p className={`font-semibold mb-1 ${
                      exportFormat === format.value ? 'text-purple-600' : 'text-gray-900'
                    }`}>
                      {format.label}
                    </p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-3">Export Options</label>
              
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSchema}
                  onChange={(e) => setIncludeSchema(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Include Database Schema</p>
                  <p className="text-sm text-gray-500">Export table structures and relationships</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUsers}
                  onChange={(e) => setIncludeUsers(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Include User Data</p>
                  <p className="text-sm text-gray-500">Export user profiles (excluding passwords)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAssets}
                  onChange={(e) => setIncludeAssets(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Include Assets</p>
                  <p className="text-sm text-gray-500">Export uploaded files and images</p>
                </div>
              </label>
            </div>

            {/* Table Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Select Tables</label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllTables}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllTables}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border border-gray-200 rounded-lg">
                {allTables.map(table => (
                  <label
                    key={table}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table) || selectedTables.length === 0}
                      onChange={() => toggleTable(table)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{table}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedTables.length > 0 
                  ? `${selectedTables.length} tables selected` 
                  : 'All tables selected'}
              </p>
            </div>

            {/* Progress */}
            {exporting && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className="text-sm font-medium text-purple-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportDatabase}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export Database
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Deployment Package Tab */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Deployment Package</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 border-2 border-blue-200 bg-blue-50 rounded-xl">
                <Database className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Database Export</h3>
                <p className="text-sm text-gray-600">Complete schema, data, and migrations</p>
              </div>

              <div className="p-6 border-2 border-purple-200 bg-purple-50 rounded-xl">
                <Code className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Module Export</h3>
                <p className="text-sm text-gray-600">All React components and dependencies</p>
              </div>

              <div className="p-6 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                <Image className="w-10 h-10 text-emerald-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Asset Export</h3>
                <p className="text-sm text-gray-600">Images, files, and media</p>
              </div>

              <div className="p-6 border-2 border-amber-200 bg-amber-50 rounded-xl">
                <Settings className="w-10 h-10 text-amber-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Configuration</h3>
                <p className="text-sm text-gray-600">Environment and service configs</p>
              </div>
            </div>

            {/* Progress */}
            {deploying && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className="text-sm font-medium text-purple-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">Deployment Package Contents</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Complete database schema and data</li>
                    <li>• All React components and modules</li>
                    <li>• Assets and media files</li>
                    <li>• Configuration files</li>
                    <li>• Migration scripts</li>
                    <li>• API endpoints configuration</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateDeploymentPackage}
              disabled={deploying}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {deploying ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating Package...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Create Deployment Package
                </>
              )}
            </button>
          </div>

          {/* Deployment Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Deployment Instructions</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Download Package</p>
                  <p className="text-sm text-gray-600">Click the button above to create and download the deployment package</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Upload to Server</p>
                  <p className="text-sm text-gray-600">Transfer the package to your production server</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Run Migration</p>
                  <p className="text-sm text-gray-600">Execute the included migration scripts to set up the database</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <p className="font-medium text-gray-900">Configure Environment</p>
                  <p className="text-sm text-gray-600">Set up environment variables and service credentials</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <p className="font-medium text-gray-900">Deploy Application</p>
                  <p className="text-sm text-gray-600">Build and deploy the application to your hosting platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Data</h2>

            <div className="text-center py-12">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Database or Package</h3>
              <p className="text-gray-600 mb-6">Upload a previously exported file to restore data</p>
              
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                <Upload className="w-5 h-5" />
                Choose File to Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
