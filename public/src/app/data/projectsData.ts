/**
 * Featured Projects Data - Portfolio showcase
 */

export interface FeaturedProject {
  title: string;
  category: string;
  image: string;
  description: string;
  projectCategory: 'construction' | 'handyman' | 'demolition' | 'property-management' | 'all';
}

export const ALL_PROJECTS: FeaturedProject[] = [
  {
    title: 'Modern Kitchen Transformation',
    category: 'Kitchen Remodel',
    image: 'https://images.unsplash.com/photo-1749704647283-3ad79f4acc6a?w=800&q=80',
    description: 'Complete kitchen renovation with custom cabinetry and quartz countertops',
    projectCategory: 'construction'
  },
  {
    title: 'Luxury Bathroom Renovation',
    category: 'Bathroom Remodel',
    image: 'https://images.unsplash.com/photo-1758448018619-4cbe2250b9ad?w=800&q=80',
    description: 'Spa-like bathroom with premium tile work and modern fixtures',
    projectCategory: 'construction'
  },
  {
    title: 'Outdoor Deck Construction',
    category: 'Deck Building',
    image: 'https://images.unsplash.com/photo-1630807284621-9c1e13de79ef?w=800&q=80',
    description: 'Custom outdoor living space with composite decking',
    projectCategory: 'construction'
  },
  {
    title: 'Hardwood Flooring Installation',
    category: 'Flooring',
    image: 'https://images.unsplash.com/photo-1693948568453-a3564f179a84?w=800&q=80',
    description: 'Beautiful oak hardwood flooring throughout main living areas',
    projectCategory: 'handyman'
  },
  {
    title: 'Custom Tile Work',
    category: 'Tile Installation',
    image: 'https://images.unsplash.com/photo-1664227430687-9299c593e3da?w=800&q=80',
    description: 'Precision tile installation with custom pattern design',
    projectCategory: 'handyman'
  },
  {
    title: 'Exterior Painting Project',
    category: 'Painting',
    image: 'https://images.unsplash.com/photo-1759406066673-f76869a4e6db?w=800&q=80',
    description: 'Complete exterior painting with premium weather-resistant paint',
    projectCategory: 'handyman'
  },
];

// Helper function to filter projects by category
export const getProjectsByCategory = (category: FeaturedProject['projectCategory']) => {
  if (category === 'all') return ALL_PROJECTS;
  return ALL_PROJECTS.filter(project => project.projectCategory === category);
};
