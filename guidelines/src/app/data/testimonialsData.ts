/**
 * Testimonials Data - Customer reviews and feedback
 */

export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  project: string;
  avatar: string;
  category?: 'construction' | 'handyman' | 'demolition' | 'property-management' | 'all';
}

export const ALL_TESTIMONIALS: Testimonial[] = [
  {
    name: 'Jennifer Martinez',
    location: 'Nashua, NH',
    rating: 5,
    text: 'The team did an amazing job on our kitchen remodel. Professional, on-time, and the quality exceeded our expectations. Highly recommend!',
    project: 'Kitchen Remodel',
    avatar: 'JM',
    category: 'construction'
  },
  {
    name: 'Robert Thompson',
    location: 'Manchester, NH',
    rating: 5,
    text: 'Outstanding craftsmanship on our bathroom renovation. They handled everything from plumbing to tile work perfectly. Worth every penny.',
    project: 'Bathroom Renovation',
    avatar: 'RT',
    category: 'construction'
  },
  {
    name: 'Susan Chen',
    location: 'Salem, NH',
    rating: 5,
    text: 'Built a beautiful deck for us last summer. The attention to detail and quality materials used really shows. We love spending time outdoors now!',
    project: 'Deck Construction',
    avatar: 'SC',
    category: 'construction'
  },
  {
    name: 'Michael Davis',
    location: 'Derry, NH',
    rating: 5,
    text: 'Quick and professional handyman service. Fixed multiple issues around the house in one visit. Very fair pricing!',
    project: 'General Repairs',
    avatar: 'MD',
    category: 'handyman'
  },
  {
    name: 'Patricia Wilson',
    location: 'Londonderry, NH',
    rating: 5,
    text: 'The electrical work was done perfectly and passed inspection the first time. Licensed and knowledgeable team!',
    project: 'Electrical Upgrade',
    avatar: 'PW',
    category: 'handyman'
  },
  {
    name: 'James Rodriguez',
    location: 'Bedford, NH',
    rating: 5,
    text: 'Demolished our old garage quickly and safely. Clean-up was thorough and they hauled everything away. Great service!',
    project: 'Garage Demolition',
    avatar: 'JR',
    category: 'demolition'
  },
  {
    name: 'Lisa Anderson',
    location: 'Merrimack, NH',
    rating: 5,
    text: 'Estate clean out after my parents passed. They were respectful, efficient, and made a difficult time easier. Thank you!',
    project: 'Estate Clean Out',
    avatar: 'LA',
    category: 'demolition'
  },
  {
    name: 'David Park',
    location: 'Nashua, NH',
    rating: 5,
    text: 'Managing 12 rental units is so much easier with their property management services. Responsive and professional!',
    project: 'Property Management',
    avatar: 'DP',
    category: 'property-management'
  },
];

// Helper function to filter testimonials by category
export const getTestimonialsByCategory = (category: Testimonial['category']) => {
  if (category === 'all') return ALL_TESTIMONIALS;
  return ALL_TESTIMONIALS.filter(testimonial => testimonial.category === category);
};
