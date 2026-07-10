// Customer Reviews with Sentiment Analysis and AI Summaries
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter,
  TrendingUp,
  Award,
  CheckCircle,
  AlertCircle,
  Smile,
  Meh,
  Frown,
  Sparkles,
  BarChart3,
  Calendar,
  User,
  Image as ImageIcon
} from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  images?: string[];
  pros?: string[];
  cons?: string[];
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [showAISummary, setShowAISummary] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  // Demo reviews with sentiment analysis
  const demoReviews: Review[] = [
    {
      id: '1',
      customerName: 'John Smith',
      rating: 5,
      title: 'Excellent quality and performance!',
      content: 'This drill exceeded my expectations. The power is incredible and the battery lasts for hours. Used it for a major renovation project and it handled everything perfectly. Highly recommend!',
      date: '2025-02-20',
      verified: true,
      helpful: 24,
      sentiment: 'positive',
      images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'],
      pros: ['Great battery life', 'Powerful motor', 'Comfortable grip'],
      cons: []
    },
    {
      id: '2',
      customerName: 'Sarah Johnson',
      rating: 4,
      title: 'Good product, minor issues',
      content: 'Overall a solid drill. Does the job well for most tasks. The only downside is that it\'s a bit heavier than I expected, which can be tiring during extended use. Otherwise, very satisfied with the purchase.',
      date: '2025-02-18',
      verified: true,
      helpful: 18,
      sentiment: 'positive',
      pros: ['Good power', 'Reliable'],
      cons: ['Heavier than expected']
    },
    {
      id: '3',
      customerName: 'Mike Davis',
      rating: 5,
      title: 'Professional grade tool',
      content: 'Been using this for 3 months in my construction business. It\'s held up perfectly and has the power to handle tough jobs. The quick-charge feature is a game changer. Worth every penny!',
      date: '2025-02-15',
      verified: true,
      helpful: 31,
      sentiment: 'positive',
      images: ['https://images.unsplash.com/photo-1581092918484-8313e1f7e00c?w=400', 'https://images.unsplash.com/photo-1581092160607-ee67e8c6b42f?w=400'],
      pros: ['Professional quality', 'Fast charging', 'Durable'],
      cons: []
    },
    {
      id: '4',
      customerName: 'Emily Chen',
      rating: 3,
      title: 'Average performance',
      content: 'It works fine for basic home projects, but I feel like there are better options at this price point. The build quality is decent but nothing exceptional.',
      date: '2025-02-12',
      verified: false,
      helpful: 7,
      sentiment: 'neutral',
      pros: ['Does the job'],
      cons: ['Price vs performance', 'Build quality']
    },
    {
      id: '5',
      customerName: 'David Wilson',
      rating: 5,
      title: 'Best drill I\'ve owned',
      content: 'Upgraded from my old drill and the difference is night and day. This has so much more power and the battery technology is impressive. Can\'t imagine going back to anything else.',
      date: '2025-02-10',
      verified: true,
      helpful: 42,
      sentiment: 'positive',
      pros: ['Powerful', 'Modern battery tech', 'Ergonomic design'],
      cons: []
    },
  ];

  useEffect(() => {
    // In production, fetch from API
    setReviews(demoReviews);
  }, [productId]);

  // Calculate statistics
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }));

  const sentimentDistribution = {
    positive: reviews.filter(r => r.sentiment === 'positive').length,
    neutral: reviews.filter(r => r.sentiment === 'neutral').length,
    negative: reviews.filter(r => r.sentiment === 'negative').length
  };

  // AI-generated summary
  const aiSummary = {
    overall: 'Based on customer reviews, this product receives overwhelmingly positive feedback. Users particularly praise its powerful performance, battery life, and professional-grade build quality.',
    keyInsights: [
      { icon: TrendingUp, text: 'Customers love the powerful motor and consistent performance', sentiment: 'positive' },
      { icon: Award, text: 'Battery life exceeds expectations with fast charging capability', sentiment: 'positive' },
      { icon: AlertCircle, text: 'Some users mention the weight during extended use', sentiment: 'neutral' }
    ],
    recommendationRate: 92
  };

  // Filter reviews
  const filteredReviews = reviews
    .filter(r => filter === 'all' || r.rating === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'helpful':
          return b.helpful - a.helpful;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return Smile;
      case 'neutral': return Meh;
      case 'negative': return Frown;
    }
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'neutral': return 'text-yellow-400';
      case 'negative': return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center lg:border-r border-slate-800">
            <div className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(averageRating)
                      ? 'text-yellow-500 fill-current'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-slate-400 text-sm">Based on {reviews.length} reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-semibold text-white">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                </div>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: rating * 0.1 }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                  />
                </div>
                <span className="text-sm text-slate-400 w-8">{count}</span>
              </div>
            ))}
          </div>

          {/* Sentiment Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white">Sentiment Analysis</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300">Positive</span>
                </div>
                <span className="text-sm font-bold text-green-400">
                  {Math.round((sentimentDistribution.positive / reviews.length) * 100)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Meh className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-slate-300">Neutral</span>
                </div>
                <span className="text-sm font-bold text-yellow-400">
                  {Math.round((sentimentDistribution.neutral / reviews.length) * 100)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Frown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-slate-300">Negative</span>
                </div>
                <span className="text-sm font-bold text-red-400">
                  {Math.round((sentimentDistribution.negative / reviews.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Generated Summary */}
      <AnimatePresence>
        {showAISummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">AI-Generated Summary</h3>
              </div>
              <button
                onClick={() => setShowAISummary(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <p className="text-slate-300 mb-4 leading-relaxed">{aiSummary.overall}</p>

            <div className="space-y-3 mb-4">
              {aiSummary.keyInsights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl"
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getSentimentColor(insight.sentiment)}`} />
                    <span className="text-sm text-slate-300">{insight.text}</span>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <span className="text-2xl font-black text-green-400">{aiSummary.recommendationRate}%</span>
                <span className="text-sm text-green-300 ml-2">of customers recommend this product</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Filter:</span>
        </div>

        {['all', 5, 4, 3, 2, 1].map((rating) => (
          <motion.button
            key={rating}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(rating as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === rating
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            {rating === 'all' ? 'All' : (
              <div className="flex items-center gap-1">
                <span>{rating}</span>
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
          </motion.button>
        ))}

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-cyan-500/50"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => {
          const SentimentIcon = getSentimentIcon(review.sentiment);
          
          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {review.customerName.charAt(0)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{review.customerName}</span>
                      {review.verified && (
                        <div className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">Verified</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      
                      <span className="text-xs text-slate-500">
                        {new Date(review.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <SentimentIcon className={`w-4 h-4 ${getSentimentColor(review.sentiment)}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-lg font-bold text-white mb-2">{review.title}</h4>

              {/* Content */}
              <p className="text-slate-300 leading-relaxed mb-4">{review.content}</p>

              {/* Pros and Cons */}
              {(review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0) ? (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {review.pros && review.pros.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-400">Pros</span>
                      </div>
                      <ul className="space-y-1">
                        {review.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="text-green-400">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {review.cons && review.cons.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">Cons</span>
                      </div>
                      <ul className="space-y-1">
                        {review.cons.map((con, i) => (
                          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="text-red-400">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {review.images.map((img, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedReview(review)}
                      className="w-20 h-20 rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
                    >
                      <img src={img} alt={`Review ${i + 1}`} className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-slate-300 hover:text-white transition-all"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpful})</span>
                </motion.button>

                <button className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                  Report
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No reviews found</h3>
          <p className="text-slate-400">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
