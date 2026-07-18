/**
 * Services Grid - Reusable component for displaying services
 * Can be filtered by category
 */

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Service } from '../../data/servicesData';

interface ServicesGridProps {
  services: Service[];
  title?: string;
  subtitle?: string;
}

export default function ServicesGrid({ services, title, subtitle }: ServicesGridProps) {
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
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all"
              >
                {/* Service Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/50 to-transparent" />

                  {/* Icon */}
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Service Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {service.description}
                  </p>

                  {/* Learn More Link */}
                  <div className="mt-4 flex items-center gap-2 text-orange-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Learn More</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
