/**
 * Testimonials Section - Reusable component for displaying customer reviews
 */

import { motion } from 'motion/react';
import { Testimonial } from '../../data/testimonialsData';
import { Star, Quote } from 'lucide-react';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
}

export default function TestimonialsSection({ testimonials, title, subtitle }: TestimonialsSectionProps) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              {title && (
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xl text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-orange-500/50 transition-all"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 opacity-10">
                <Quote className="w-16 h-16 text-orange-400" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-300 text-sm leading-relaxed mb-6 relative z-10">
                "{testimonial.text}"
              </p>

              {/* Project */}
              <div className="mb-4 pt-4 border-t border-[#2A2A2A]">
                <div className="text-orange-400 text-xs font-semibold uppercase tracking-wide">
                  {testimonial.project}
                </div>
              </div>

              {/* Customer Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
