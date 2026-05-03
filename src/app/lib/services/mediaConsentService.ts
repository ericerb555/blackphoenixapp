/**
 * Media Consent Service
 * 
 * Manages customer media consent for AI Content Studio usage
 * Handles photo/video permissions and folder organization
 */

export interface MediaConsent {
  customerId: string;
  customerName: string;
  email: string;
  consentGiven: boolean;
  consentDate: string;
  consentType: 'full' | 'limited' | 'none';
  allowedUsage: {
    aiContentGeneration: boolean;
    socialMedia: boolean;
    marketing: boolean;
    portfolio: boolean;
    beforeAfter: boolean;
  };
  restrictions?: string[];
  expirationDate?: string;
  signedBy: string;
  ipAddress?: string;
}

export interface MediaFile {
  id: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  projectName?: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'video';
  uploadDate: string;
  uploadedBy: string;
  tags: string[];
  category: 'before' | 'progress' | 'after' | 'detail' | 'general';
  isShared: boolean; // Based on customer consent
  consent: {
    hasConsent: boolean;
    consentDate?: string;
    allowedFor: string[];
  };
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    location?: string;
    capturedDate?: string;
  };
}

export interface MediaFolder {
  id: string;
  name: string;
  type: 'customer' | 'project' | 'shared' | 'ai-ready' | 'archive';
  customerId?: string;
  projectId?: string;
  fileCount: number;
  totalSize: number;
  lastUpdated: string;
  isShared: boolean;
  thumbnailUrl?: string;
}

class MediaConsentService {
  private readonly STORAGE_KEY_CONSENTS = 'media_consents';
  private readonly STORAGE_KEY_MEDIA = 'media_files';
  private readonly STORAGE_KEY_FOLDERS = 'media_folders';

  // Get all media consents
  getConsents(): MediaConsent[] {
    const data = localStorage.getItem(this.STORAGE_KEY_CONSENTS);
    return data ? JSON.parse(data) : [];
  }

  // Get consent for specific customer
  getCustomerConsent(customerId: string): MediaConsent | null {
    const consents = this.getConsents();
    return consents.find(c => c.customerId === customerId) || null;
  }

  // Save or update consent
  saveConsent(consent: MediaConsent): void {
    const consents = this.getConsents();
    const existingIndex = consents.findIndex(c => c.customerId === consent.customerId);
    
    if (existingIndex >= 0) {
      consents[existingIndex] = consent;
    } else {
      consents.push(consent);
    }
    
    localStorage.setItem(this.STORAGE_KEY_CONSENTS, JSON.stringify(consents));
    
    // Update media files sharing status based on consent
    this.updateMediaSharingStatus(consent.customerId, consent.consentGiven);
  }

  // Update media sharing status when consent changes
  private updateMediaSharingStatus(customerId: string, isShared: boolean): void {
    const mediaFiles = this.getMediaFiles();
    const updatedFiles = mediaFiles.map(file => {
      if (file.customerId === customerId) {
        return {
          ...file,
          isShared,
          consent: {
            ...file.consent,
            hasConsent: isShared
          }
        };
      }
      return file;
    });
    
    localStorage.setItem(this.STORAGE_KEY_MEDIA, JSON.stringify(updatedFiles));
  }

  // Get all media files
  getMediaFiles(): MediaFile[] {
    const data = localStorage.getItem(this.STORAGE_KEY_MEDIA);
    return data ? JSON.parse(data) : this.getDefaultMediaFiles();
  }

  // Get shared media files (for AI Content Studio)
  getSharedMediaFiles(): MediaFile[] {
    return this.getMediaFiles().filter(file => file.isShared);
  }

  // Get customer-specific media files
  getCustomerMediaFiles(customerId: string): MediaFile[] {
    return this.getMediaFiles().filter(file => file.customerId === customerId);
  }

  // Get project-specific media files
  getProjectMediaFiles(projectId: string): MediaFile[] {
    return this.getMediaFiles().filter(file => file.projectId === projectId);
  }

  // Add media file
  addMediaFile(file: MediaFile): void {
    const files = this.getMediaFiles();
    files.unshift(file);
    localStorage.setItem(this.STORAGE_KEY_MEDIA, JSON.stringify(files));
    
    // Update folder stats
    this.updateFolderStats();
  }

  // Get all folders
  getFolders(): MediaFolder[] {
    const data = localStorage.getItem(this.STORAGE_KEY_FOLDERS);
    return data ? JSON.parse(data) : this.getDefaultFolders();
  }

  // Update folder statistics
  private updateFolderStats(): void {
    const folders = this.getFolders();
    const mediaFiles = this.getMediaFiles();
    
    folders.forEach(folder => {
      let relevantFiles: MediaFile[] = [];
      
      switch (folder.type) {
        case 'shared':
        case 'ai-ready':
          relevantFiles = mediaFiles.filter(f => f.isShared);
          break;
        case 'customer':
          relevantFiles = mediaFiles.filter(f => f.customerId === folder.customerId);
          break;
        case 'project':
          relevantFiles = mediaFiles.filter(f => f.projectId === folder.projectId);
          break;
        default:
          relevantFiles = mediaFiles;
      }
      
      folder.fileCount = relevantFiles.length;
      folder.totalSize = relevantFiles.reduce((sum, f) => sum + f.metadata.size, 0);
      folder.lastUpdated = new Date().toISOString();
      
      if (relevantFiles.length > 0) {
        folder.thumbnailUrl = relevantFiles[0].fileUrl;
      }
    });
    
    localStorage.setItem(this.STORAGE_KEY_FOLDERS, JSON.stringify(folders));
  }

  // Get media files by folder
  getMediaFilesByFolder(folderId: string): MediaFile[] {
    const folders = this.getFolders();
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) return [];
    
    const mediaFiles = this.getMediaFiles();
    
    switch (folder.type) {
      case 'shared':
      case 'ai-ready':
        return mediaFiles.filter(f => f.isShared);
      case 'customer':
        return mediaFiles.filter(f => f.customerId === folder.customerId);
      case 'project':
        return mediaFiles.filter(f => f.projectId === folder.projectId);
      default:
        return mediaFiles;
    }
  }

  // Get consent statistics
  getConsentStats() {
    const consents = this.getConsents();
    const mediaFiles = this.getMediaFiles();
    
    return {
      totalCustomers: consents.length,
      withConsent: consents.filter(c => c.consentGiven).length,
      withoutConsent: consents.filter(c => !c.consentGiven).length,
      totalMediaFiles: mediaFiles.length,
      sharedMediaFiles: mediaFiles.filter(f => f.isShared).length,
      privateMediaFiles: mediaFiles.filter(f => !f.isShared).length,
      consentRate: consents.length > 0 
        ? Math.round((consents.filter(c => c.consentGiven).length / consents.length) * 100)
        : 0
    };
  }

  // Default media files for demo
  private getDefaultMediaFiles(): MediaFile[] {
    return [
      {
        id: 'MEDIA-001',
        customerId: 'CUST-001',
        customerName: 'John Smith',
        projectId: 'PROJ-001',
        projectName: 'Kitchen Renovation',
        fileName: 'kitchen-after-001.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800',
        fileType: 'image',
        uploadDate: '2024-01-20T10:00:00Z',
        uploadedBy: 'admin',
        tags: ['kitchen', 'after', 'renovation', 'modern'],
        category: 'after',
        isShared: true,
        consent: {
          hasConsent: true,
          consentDate: '2024-01-15T09:00:00Z',
          allowedFor: ['ai-content', 'social-media', 'portfolio']
        },
        metadata: {
          width: 1920,
          height: 1080,
          size: 2456789,
          location: 'New York, NY',
          capturedDate: '2024-01-19T14:30:00Z'
        }
      },
      {
        id: 'MEDIA-002',
        customerId: 'CUST-001',
        customerName: 'John Smith',
        projectId: 'PROJ-001',
        projectName: 'Kitchen Renovation',
        fileName: 'kitchen-before-001.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800',
        fileType: 'image',
        uploadDate: '2024-01-15T10:00:00Z',
        uploadedBy: 'admin',
        tags: ['kitchen', 'before', 'renovation'],
        category: 'before',
        isShared: true,
        consent: {
          hasConsent: true,
          consentDate: '2024-01-15T09:00:00Z',
          allowedFor: ['ai-content', 'social-media', 'portfolio']
        },
        metadata: {
          width: 1920,
          height: 1080,
          size: 2145678,
          location: 'New York, NY',
          capturedDate: '2024-01-10T10:00:00Z'
        }
      },
      {
        id: 'MEDIA-003',
        customerId: 'CUST-002',
        customerName: 'Sarah Johnson',
        projectId: 'PROJ-002',
        projectName: 'Bathroom Remodel',
        fileName: 'bathroom-after-001.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
        fileType: 'image',
        uploadDate: '2024-01-22T14:00:00Z',
        uploadedBy: 'admin',
        tags: ['bathroom', 'after', 'modern', 'luxury'],
        category: 'after',
        isShared: false,
        consent: {
          hasConsent: false,
          allowedFor: []
        },
        metadata: {
          width: 1920,
          height: 1080,
          size: 2678901,
          location: 'Los Angeles, CA',
          capturedDate: '2024-01-21T16:00:00Z'
        }
      },
      {
        id: 'MEDIA-004',
        customerId: 'CUST-003',
        customerName: 'Mike Wilson',
        projectId: 'PROJ-003',
        projectName: 'Living Room Update',
        fileName: 'living-room-after-001.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        fileType: 'image',
        uploadDate: '2024-01-25T11:00:00Z',
        uploadedBy: 'admin',
        tags: ['living-room', 'after', 'renovation', 'cozy'],
        category: 'after',
        isShared: true,
        consent: {
          hasConsent: true,
          consentDate: '2024-01-20T10:00:00Z',
          allowedFor: ['ai-content', 'portfolio', 'marketing']
        },
        metadata: {
          width: 1920,
          height: 1080,
          size: 2890123,
          location: 'Chicago, IL',
          capturedDate: '2024-01-24T13:00:00Z'
        }
      }
    ];
  }

  // Default folders for demo
  private getDefaultFolders(): MediaFolder[] {
    return [
      {
        id: 'FOLDER-SHARED',
        name: 'Shared Media - AI Ready',
        type: 'ai-ready',
        fileCount: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        isShared: true
      },
      {
        id: 'FOLDER-CUST-001',
        name: 'John Smith - Kitchen Renovation',
        type: 'customer',
        customerId: 'CUST-001',
        fileCount: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        isShared: true
      },
      {
        id: 'FOLDER-CUST-002',
        name: 'Sarah Johnson - Bathroom Remodel',
        type: 'customer',
        customerId: 'CUST-002',
        fileCount: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        isShared: false
      },
      {
        id: 'FOLDER-CUST-003',
        name: 'Mike Wilson - Living Room',
        type: 'customer',
        customerId: 'CUST-003',
        fileCount: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        isShared: true
      }
    ];
  }
}

export const mediaConsentService = new MediaConsentService();
