/**
 * Debug Logo Upload Component
 * Test component to identify logo upload issues
 */

import { useState } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function DebugLogoUpload() {
  const [status, setStatus] = useState<string[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log('🔍 DEBUG:', msg);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addStatus('File input onChange triggered');
    
    const files = e.target.files;
    addStatus(`Files object: ${files ? 'exists' : 'null'}`);
    
    if (!files || files.length === 0) {
      addStatus('❌ No files selected');
      return;
    }
    
    const file = files[0];
    addStatus(`✅ File selected: ${file.name}`);
    addStatus(`   Type: ${file.type}`);
    addStatus(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      addStatus('❌ Invalid file type (not an image)');
      toast.error('Please upload an image file');
      return;
    }
    
    addStatus('✅ File type validation passed');
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      addStatus('❌ File too large (>5MB)');
      toast.error('File must be less than 5MB');
      return;
    }
    
    addStatus('✅ File size validation passed');
    addStatus('🔄 Starting FileReader...');
    
    // Convert to base64
    const reader = new FileReader();
    
    reader.onloadstart = () => {
      addStatus('📖 FileReader started reading');
    };
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = ((e.loaded / e.total) * 100).toFixed(0);
        addStatus(`📊 Reading progress: ${percent}%`);
      }
    };
    
    reader.onload = (e) => {
      addStatus('✅ FileReader onload event fired');
      const result = e.target?.result;
      
      if (typeof result === 'string') {
        addStatus(`✅ Base64 conversion successful (${result.length} chars)`);
        setLogoPreview(result);
        toast.success('Logo uploaded successfully!');
        
        // Test localStorage
        try {
          localStorage.setItem('debug_logo_test', result);
          addStatus('✅ Saved to localStorage successfully');
          
          const retrieved = localStorage.getItem('debug_logo_test');
          if (retrieved === result) {
            addStatus('✅ Retrieved from localStorage matches');
          } else {
            addStatus('❌ Retrieved data does not match!');
          }
        } catch (err) {
          addStatus(`❌ localStorage error: ${err}`);
        }
      } else {
        addStatus('❌ Result is not a string');
      }
    };
    
    reader.onerror = () => {
      addStatus('❌ FileReader error occurred');
      toast.error('Failed to read file');
    };
    
    reader.onloadend = () => {
      addStatus('🏁 FileReader completed');
    };
    
    reader.readAsDataURL(file);
    addStatus('📝 Called readAsDataURL()');
  };

  return (
    <div className="fixed bottom-4 left-4 w-96 bg-[#0A0A0A] border-2 border-orange-500 rounded-xl p-4 max-h-[600px] flex flex-col z-50">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Upload className="w-5 h-5 text-orange-400" />
        Logo Upload Debug Panel
      </h3>
      
      {/* Upload Button */}
      <label className="cursor-pointer mb-4">
        <div className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-center font-semibold transition">
          Click to Test Logo Upload
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      
      {/* Preview */}
      {logoPreview && (
        <div className="mb-4 p-2 bg-[#1A1A1A] rounded-lg">
          <p className="text-xs text-green-400 mb-2">Preview:</p>
          <img 
            src={logoPreview} 
            alt="Preview" 
            className="w-full h-32 object-contain rounded"
          />
        </div>
      )}
      
      {/* Status Log */}
      <div className="flex-1 overflow-y-auto bg-black/50 rounded-lg p-2 space-y-1">
        <p className="text-xs text-gray-400 mb-2">Event Log:</p>
        {status.length === 0 ? (
          <p className="text-xs text-gray-500">Waiting for file selection...</p>
        ) : (
          status.map((msg, i) => (
            <div key={i} className="text-xs font-mono flex items-start gap-1">
              {msg.includes('✅') ? (
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
              ) : msg.includes('❌') ? (
                <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <span className="w-3 text-gray-400">•</span>
              )}
              <span className={
                msg.includes('✅') ? 'text-green-400' :
                msg.includes('❌') ? 'text-red-400' :
                'text-gray-300'
              }>{msg}</span>
            </div>
          ))
        )}
      </div>
      
      {/* Clear Button */}
      <button
        onClick={() => {
          setStatus([]);
          setLogoPreview(null);
          localStorage.removeItem('debug_logo_test');
        }}
        className="mt-3 px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 rounded-lg text-xs transition"
      >
        Clear Log
      </button>
    </div>
  );
}
