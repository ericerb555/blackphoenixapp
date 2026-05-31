/**
 * Featured Projects Section - Reusable component for displaying portfolio projects
 */

import { motion } from 'motion/react';
import { FeaturedProject } from '../../data/projectsData';
import { Eye } from 'lucide-react';

interface FeaturedProjectsSectionProps {
  projects: FeaturedProject[];
  title?: string;
  subtitle?: string;
}

export default function FeaturedProjectsSection({ projects, title, subtitle }: FeaturedProjectsSectionProps) {
  return (
    <section className="py-20 px-4 bg-[#0F0F0F]">
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-16">
            {title && (
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all"
            >
              {/* Project Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-60" />

                {/* View Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5" />
                    <span className="font-semibold">View Project</span>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1 bg-orange-600/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                    {project.category}
                  </div>
                </div>
              </div>

              {/* Project Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {project.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {project.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
