import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize2, ExternalLink } from 'lucide-react';

interface VideoReel {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook';
  category: string;
}

interface VideoReelsShowcaseProps {
  primaryColor?: string;
}

export default function VideoReelsShowcase({ primaryColor = '#ea580c' }: VideoReelsShowcaseProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoReel | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Sample video reels - these would typically come from the backend or localStorage
  const videoReels: VideoReel[] = [
    {
      id: 'reel-1',
      title: 'Kitchen Renovation Time-Lapse',
      thumbnail: 'https://images.unsplash.com/photo-1749704647283-3ad79f4acc6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwcmVub3ZhdGlvbiUyMG1vZGVybnxlbnwxfHx8fDE3NzE3ODQ4MTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '0:45',
      platform: 'instagram',
      category: 'Kitchen Remodel'
    },
    {
      id: 'reel-2',
      title: 'Bathroom Transformation',
      thumbnail: 'https://images.unsplash.com/photo-1758448018619-4cbe2250b9ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXRocm9vbSUyMHJlbW9kZWwlMjBsdXh1cnl8ZW58MXx8fHwxNzcxODY2NDYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '0:30',
      platform: 'tiktok',
      category: 'Bathroom Renovation'
    },
    {
      id: 'reel-3',
      title: 'Flooring Installation Process',
      thumbnail: 'https://images.unsplash.com/photo-1693948568453-a3564f179a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vcmluZyUyMGluc3RhbGxhdGlvbiUyMGhhcmR3b29kfGVufDF8fHx8MTc3MTc4MTY1MXww&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '1:00',
      platform: 'youtube',
      category: 'Flooring'
    },
    {
      id: 'reel-4',
      title: 'Before & After: Complete Home Makeover',
      thumbnail: 'https://images.unsplash.com/photo-1759406066673-f76869a4e6db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZXh0ZXJpb3IlMjBwYWludGluZ3xlbnwxfHx8fDE3NzE4NjY0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '1:20',
      platform: 'facebook',
      category: 'Painting & Finishing'
    },
    {
      id: 'reel-5',
      title: 'Deck Construction Showcase',
      thumbnail: 'https://images.unsplash.com/photo-1630807284621-9c1e13de79ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWNrJTIwY29uc3RydWN0aW9uJTIwYmFja3lhcmR8ZW58MXx8fHwxNzcxODY2NDkyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '0:55',
      platform: 'instagram',
      category: 'Deck Building'
    },
    {
      id: 'reel-6',
      title: 'Custom Tile Work Process',
      thumbnail: 'https://images.unsplash.com/photo-1664227430687-9299c593e3da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aWxlJTIwaW5zdGFsbGF0aW9uJTIwYmF0aHJvb218ZW58MXx8fHwxNzcxODY2NDk0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      videoUrl: 'https://player.vimeo.com/video/76979871',
      duration: '0:40',
      platform: 'tiktok',
      category: 'Tile Installation'
    }
  ];

  const platformColors = {
    instagram: 'from-pink-600 to-purple-600',
    tiktok: 'from-black to-gray-800',
    youtube: 'from-red-600 to-red-700',
    facebook: 'from-blue-600 to-blue-700'
  };

  const platformLabels = {
    instagram: 'Instagram Reel',
    tiktok: 'TikTok',
    youtube: 'YouTube Short',
    facebook: 'Facebook Video'
  };

  return (
    <section className="py-20 px-4 bg-[#0A0A0A] flex justify-center">
      <div className="w-full max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-full mb-6"
              style={{ 
                backgroundColor: `${primaryColor}20`,
                borderColor: `${primaryColor}30`
              }}
            >
              <Play className="w-4 h-4" style={{ color: primaryColor, fill: primaryColor }} />
              <span className="font-semibold text-sm" style={{ color: primaryColor }}>
                Watch Our Work in Action
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Video <span style={{ color: primaryColor }}>Showcase & Reels</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl">
              See our craftsmanship come to life through short-form videos and social media content
            </p>
          </motion.div>
        </div>

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {videoReels.map((reel, index) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer transition-all hover:border-opacity-100"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
              onClick={() => setSelectedVideo(reel)}
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] sm:aspect-[16/9] overflow-hidden relative">
                <img 
                  src={reel.thumbnail}
                  alt={reel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm border-2 group-hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: `${primaryColor}40`,
                      borderColor: primaryColor
                    }}
                  >
                    <Play className="w-8 h-8 text-white" style={{ fill: 'white' }} />
                  </div>
                </div>

                {/* Platform Badge */}
                <div 
                  className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${platformColors[reel.platform]}`}
                >
                  {platformLabels[reel.platform]}
                </div>

                {/* Duration */}
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded text-xs font-bold text-white">
                  {reel.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="text-xs font-semibold mb-1" style={{ color: primaryColor }}>
                  {reel.category}
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-opacity-90">
                  {reel.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-400 mb-6">
              Follow us on social media for daily updates, tips, and behind-the-scenes content
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map((platform) => (
                <button
                  key={platform}
                  className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  style={{ 
                    borderColor: '#2a2a2a'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                    e.currentTarget.style.backgroundColor = `${primaryColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Follow on {platform}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Modal (if needed for playback) */}
      {selectedVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#2a2a2a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all"
            >
              <span className="text-white text-2xl">&times;</span>
            </button>

            {/* Video Player */}
            <div className="aspect-video bg-black">
              <iframe
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={selectedVideo.title}
              />
            </div>

            {/* Video Info */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${platformColors[selectedVideo.platform]}`}
                >
                  {platformLabels[selectedVideo.platform]}
                </div>
                <div className="text-xs font-semibold" style={{ color: primaryColor }}>
                  {selectedVideo.category}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedVideo.title}
              </h3>
              <p className="text-gray-400">
                Duration: {selectedVideo.duration}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}