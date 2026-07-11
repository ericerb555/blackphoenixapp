/**
 * Seeds all photos from blackphoenixbuilds.com into the app media library.
 * Writes to localStorage key 'media_library_items' using the same format
 * as MediaLibraryManager so they appear immediately on next load.
 */

const WEBSITE_PHOTOS = [
  // Completed Projects Gallery (12 photos)
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a82c7c1f9.png', name: 'Completed Project 01', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a84a22004.png', name: 'Completed Project 02', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8546216e.png', name: 'Completed Project 03', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a869665c3.png', name: 'Completed Project 04', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a879c442e.png', name: 'Completed Project 05', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8a8d7da8.png', name: 'Completed Project 06', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8ced9b05.png', name: 'Completed Project 07', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8e65a066.png', name: 'Completed Project 08', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8ee8db98.png', name: 'Completed Project 09', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775a8fb34129.png', name: 'Completed Project 10', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775aaac03c62.png', name: 'Completed Project 11', folder: 'Completed Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6775aabd78e29.png', name: 'Completed Project 12', folder: 'Completed Projects' },

  // Recent Projects Gallery (23 photos)
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e6389bf133.jpg', name: 'Recent Project 01', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e638c5f5eb.jpg', name: 'Recent Project 02', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63889d810.jpg', name: 'Recent Project 03', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e6395f0110.jpg', name: 'Recent Project 04', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e639b38397.jpg', name: 'Recent Project 05', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63e523aa1.jpg', name: 'Recent Project 06', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63a256d83.jpg', name: 'Recent Project 07', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63a5392fd.jpg', name: 'Recent Project 08', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63aa5ac5a.jpg', name: 'Recent Project 09', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63a94792d.jpg', name: 'Recent Project 10', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691fa30f6a796.jpg', name: 'Recent Project 11', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d15d350aa.jpg', name: 'Recent Project 12', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d1599e608.jpg', name: 'Recent Project 13', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d15209552.jpg', name: 'Recent Project 14', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d14c0c3d7.jpg', name: 'Recent Project 15', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d25be0970.jpg', name: 'Recent Project 16', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d1676d044.jpg', name: 'Recent Project 17', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d26731c36.jpg', name: 'Recent Project 18', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d1dd2f3cd.jpg', name: 'Recent Project 19', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d1df2bd0d.jpg', name: 'Recent Project 20', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63bc8ba8e.jpg', name: 'Recent Project 21', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e63b5a26e9.jpg', name: 'Recent Project 22', folder: 'Recent Projects' },
  { url: 'https://files.cdn-files-a.com/uploads/10153532/2000_691e638af2acc.jpg', name: 'Recent Project 23', folder: 'Recent Projects' },

  // Logo
  { url: 'https://files.cdn-files-a.com/uploads/10153532/400_696706d24b3b0.png', name: 'Black Phoenix Builds Logo', folder: 'Brand Assets' },
];

export function seedWebsitePhotos(): number {
  try {
    const existing: any[] = JSON.parse(localStorage.getItem('media_library_items') || '[]');
    const existingUrls = new Set(existing.map((i: any) => i.url));

    const newItems = WEBSITE_PHOTOS
      .filter(p => !existingUrls.has(p.url))
      .map((p, idx) => ({
        id: `MEDIA-WEB-${Date.now()}-${idx}`,
        type: 'image' as const,
        name: p.name,
        url: p.url,
        thumbnail: p.url,
        size: 800000,
        dimensions: { width: 2000, height: 1500 },
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Website Import',
        tags: ['website', p.folder.toLowerCase().replace(/\s+/g, '-'), 'black-phoenix-builds'],
        folder: p.folder,
        favorite: false,
        description: `Imported from blackphoenixbuilds.com — ${p.folder}`,
      }));

    if (newItems.length === 0) return 0;

    const merged = [...existing, ...newItems];
    localStorage.setItem('media_library_items', JSON.stringify(merged));
    return newItems.length;
  } catch (e) {
    console.error('Failed to seed website photos:', e);
    return 0;
  }
}

export const WEBSITE_PHOTO_URLS = WEBSITE_PHOTOS;
