import { CheckCircle } from 'lucide-react';

export function LogoUploadInfo() {
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        <p className="text-xs text-green-400">
          <strong>Logo uploads work offline!</strong> Your logos are converted to base64 and saved locally. 
          No server deployment needed for this feature.
        </p>
      </div>
    </div>
  );
}
