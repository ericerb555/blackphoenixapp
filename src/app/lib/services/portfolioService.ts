/**
 * Portfolio Service
 * 
 * Automatically pulls completed work request media for landing page portfolio
 * Features:
 * - Fetch completed/contracted work requests with media
 * - Filter by project type
 * - Auto-generate portfolio items from real project data
 * - Marketing approval workflow
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { saveDual, loadDual } from '../database';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  videoUrl?: string;
  workRequestId: string;
  completedDate: string;
  customerName?: string;
  location?: string;
  beforeImage?: string;
  afterImage?: string;
  additionalImages?: string[];
  featured: boolean;
  approvedForMarketing: boolean;
  tags?: string[];
}

export interface WorkRequestMedia {
  id: string;
  workRequestId: string;
  title: string;
  description: string;
  serviceType: string;
  status: string;
  completedDate?: string;
  customerName?: string;
  location?: string;
  videoUrl?: string;
  photos: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  approvedForMarketing?: boolean;
}

/**
 * Fetch all completed work requests with media
 */
export async function getCompletedProjectsWithMedia(): Promise<WorkRequestMedia[]> {
  try {
    // Clean up any corrupted localStorage data first
    const keysToClean = ['work_requests', 'work_requests_anonymous'];
    keysToClean.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored === 'undefined' || stored === 'null' || stored === '') {
          console.warn(`Clearing corrupted ${key} from localStorage`);
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // First check database for work requests
    const workRequests = await loadDual('work_requests');
    if (workRequests && Array.isArray(workRequests)) {
      
      // Filter for completed/contracted work with media
      const completed = workRequests.filter((wr: any) => 
        (wr.status === 'completed' || wr.status === 'contracted' || wr.status === 'in_progress') &&
        (wr.videoUrl || (wr.files && wr.files.length > 0) || (wr.photos && wr.photos.length > 0))
      );

      return completed.map((wr: any) => ({
        id: wr.id,
        workRequestId: wr.id,
        title: wr.title || wr.serviceTitle || `${wr.serviceType} Project`,
        description: wr.description || wr.details || '',
        serviceType: wr.serviceType || wr.category || 'General',
        status: wr.status,
        completedDate: wr.completedDate || wr.updated_at,
        customerName: wr.customerName || wr.clientName,
        location: wr.location || wr.propertyAddress,
        videoUrl: wr.videoUrl,
        photos: extractPhotos(wr),
        beforePhotos: wr.beforePhotos || [],
        afterPhotos: wr.afterPhotos || [],
        approvedForMarketing: wr.approvedForMarketing !== false, // Default true unless explicitly false
      }));
    }

    // Fallback: Try to fetch from server
    const response = await fetch(`${SERVER_URL}/work-requests?status=completed`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      console.log('No server data available, using defaults');
      return [];
    }

    const data = await response.json();
    return data.map((wr: any) => ({
      id: wr.id,
      workRequestId: wr.id,
      title: wr.title || `${wr.serviceType} Project`,
      description: wr.description || '',
      serviceType: wr.serviceType || 'General',
      status: wr.status,
      completedDate: wr.completedDate,
      customerName: wr.customerName,
      location: wr.location,
      videoUrl: wr.videoUrl,
      photos: extractPhotos(wr),
      beforePhotos: wr.beforePhotos || [],
      afterPhotos: wr.afterPhotos || [],
      approvedForMarketing: wr.approvedForMarketing !== false,
    }));
  } catch (error) {
    console.error('Error fetching completed projects:', error);
    return [];
  }
}

/**
 * Extract photo URLs from various work request formats
 */
function extractPhotos(workRequest: any): string[] {
  const photos: string[] = [];

  // Direct photos array
  if (workRequest.photos && Array.isArray(workRequest.photos)) {
    photos.push(...workRequest.photos);
  }

  // Files array (filter for images)
  if (workRequest.files && Array.isArray(workRequest.files)) {
    const imageFiles = workRequest.files
      .filter((f: any) => f.type === 'image' || f.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .map((f: any) => f.url || f.path || f.src);
    photos.push(...imageFiles);
  }

  // Media array
  if (workRequest.media && Array.isArray(workRequest.media)) {
    const imageMedia = workRequest.media
      .filter((m: any) => m.type === 'image')
      .map((m: any) => m.url);
    photos.push(...imageMedia);
  }

  // Attachments
  if (workRequest.attachments && Array.isArray(workRequest.attachments)) {
    const imageAttachments = workRequest.attachments
      .filter((a: any) => a.type?.startsWith('image/') || a.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .map((a: any) => a.url);
    photos.push(...imageAttachments);
  }

  return [...new Set(photos)]; // Remove duplicates
}

/**
 * Convert work request media to portfolio projects
 */
export async function getPortfolioProjects(options?: {
  featured?: boolean;
  limit?: number;
  category?: string;
}): Promise<PortfolioProject[]> {
  const mediaData = await getCompletedProjectsWithMedia();

  let projects = mediaData
    .filter(m => m.approvedForMarketing !== false) // Only approved projects
    .map((media, index) => {
      // Use after photo if available, otherwise use first photo, otherwise video thumbnail
      const mainImage = media.afterPhotos?.[0] || media.photos[0] || generateVideoThumbnail(media.videoUrl);
      
      return {
        id: media.id,
        title: media.title,
        category: formatCategory(media.serviceType),
        description: media.description || `Professional ${media.serviceType.toLowerCase()} completed ${formatDate(media.completedDate)}`,
        image: mainImage || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1080',
        videoUrl: media.videoUrl,
        workRequestId: media.workRequestId,
        completedDate: media.completedDate || new Date().toISOString(),
        customerName: media.customerName,
        location: media.location,
        beforeImage: media.beforePhotos?.[0],
        afterImage: media.afterPhotos?.[0],
        additionalImages: media.photos.slice(1),
        featured: index < 6, // First 6 are featured by default
        approvedForMarketing: true,
        tags: generateTags(media),
      };
    });

  // Apply filters
  if (options?.category) {
    projects = projects.filter(p => 
      p.category.toLowerCase().includes(options.category!.toLowerCase())
    );
  }

  if (options?.featured !== undefined) {
    projects = projects.filter(p => p.featured === options.featured);
  }

  if (options?.limit) {
    projects = projects.slice(0, options.limit);
  }

  return projects;
}

/**
 * Toggle marketing approval for a work request
 */
export async function toggleMarketingApproval(workRequestId: string, approved: boolean): Promise<void> {
  try {
    // Update in database
    const workRequests = await loadDual('work_requests');
    if (workRequests && Array.isArray(workRequests)) {
      const updated = workRequests.map((wr: any) =>
        wr.id === workRequestId ? { ...wr, approvedForMarketing: approved } : wr
      );
      await saveDual('work_requests', updated);
    }

    // Also save to server
    await fetch(`${SERVER_URL}/work-requests/${workRequestId}/marketing-approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ approvedForMarketing: approved }),
    });
  } catch (error) {
    console.error('Error toggling marketing approval:', error);
    throw error;
  }
}

/**
 * Set project as featured
 */
export async function setProjectFeatured(workRequestId: string, featured: boolean): Promise<void> {
  try {
    const featuredProjects = (await loadDual('featured_projects')) || [];

    if (featured) {
      if (!featuredProjects.includes(workRequestId)) {
        featuredProjects.push(workRequestId);
      }
    } else {
      const index = featuredProjects.indexOf(workRequestId);
      if (index > -1) {
        featuredProjects.splice(index, 1);
      }
    }

    await saveDual('featured_projects', featuredProjects);
  } catch (error) {
    console.error('Error setting project featured status:', error);
    throw error;
  }
}

// Helper functions
function formatCategory(serviceType: string): string {
  const categoryMap: { [key: string]: string } = {
    'kitchen': 'Kitchen Remodel',
    'bathroom': 'Bathroom Remodel',
    'flooring': 'Flooring Installation',
    'painting': 'Interior/Exterior Painting',
    'roofing': 'Roofing Services',
    'plumbing': 'Plumbing Services',
    'electrical': 'Electrical Work',
    'hvac': 'HVAC Installation',
    'deck': 'Deck Construction',
    'landscaping': 'Landscaping',
    'basement': 'Basement Finishing',
    'addition': 'Home Addition',
    'general': 'General Contracting',
  };

  const key = serviceType.toLowerCase();
  return categoryMap[key] || serviceType;
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'recently';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return 'this week';
  if (diffDays < 30) return 'this month';
  if (diffDays < 90) return 'recently';
  
  return `in ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

function generateVideoThumbnail(videoUrl?: string): string | undefined {
  if (!videoUrl) return undefined;
  // In production, this would generate actual thumbnails
  // For now, return a placeholder
  return undefined;
}

function generateTags(media: WorkRequestMedia): string[] {
  const tags: string[] = [];
  
  if (media.beforePhotos && media.beforePhotos.length > 0 && media.afterPhotos && media.afterPhotos.length > 0) {
    tags.push('Before & After');
  }
  
  if (media.videoUrl) {
    tags.push('Video Tour');
  }
  
  if (media.photos.length > 5) {
    tags.push('Photo Gallery');
  }
  
  tags.push(media.serviceType);
  
  return tags;
}
