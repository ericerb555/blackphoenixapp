/**
 * Vendor Priority Placement Info Component
 * Shows benefits and pricing for priority placement subscriptions
 */

import { Crown, Medal, Award, Check, TrendingUp, Eye, Star, Zap, Target } from 'lucide-react';

interface PriorityTier {
  name: string;
  level: 'bronze' | 'silver' | 'gold';
  price: number;
  icon: any;
  color: string;
  features: string[];
  placement: string;
  badge: string;
}

const PRIORITY_TIERS: PriorityTier[] = [
  {
    name: 'Bronze Priority',
    level: 'bronze',
    price: 149,
    icon: Award,
    color: 'orange',
    placement: 'Top 50%',
    badge: 'Bronze Priority Badge',
    features: [
      'Materials appear in top 50% of quotes',
      'Bronze priority badge on all materials',
      'Basic analytics dashboard',
      'Quote notification alerts',
      'Priority customer support'
    ]
  },
  {
    name: 'Silver Priority',
    level: 'silver',
    price: 299,
    icon: Medal,
    color: 'gray',
    placement: 'Top 25%',
    badge: 'Silver Priority Badge',
    features: [
      'Materials appear in top 25% of quotes',
      'Silver priority badge on all materials',
      'Advanced analytics dashboard',
      'Real-time quote alerts',
      'Featured in material search results',
      'Priority customer support',
      '2x visibility boost'
    ]
  },
  {
    name: 'Gold Priority',
    level: 'gold',
    price: 599,
    icon: Crown,
    color: 'yellow',
    placement: 'First Position',
    badge: 'Gold Priority Badge',
    features: [
      'Materials appear FIRST in all quotes',
      'Gold crown badge on all materials',
      'Premium analytics dashboard',
      'Instant quote notifications',
      'Top position in all search results',
      'Exclusive "Preferred Vendor" designation',
      'Custom materials catalog integration',
      'Dedicated account manager',
      '5x visibility boost'
    ]
  }
];

export default function VendorPriorityInfo() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-3">
          <Star className="w-8 h-8 text-orange-400" />
          Priority Placement Plans
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Get your materials featured first in customer quotes and searches. 
          Higher priority = more visibility = more sales.
        </p>
      </div>

      {/* Why Priority Matters */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl border border-orange-500/30 p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          Why Priority Placement Matters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Maximum Visibility</p>
              <p className="text-sm text-gray-400">Your materials show up first when contractors search and create quotes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">More Quote Opportunities</p>
              <p className="text-sm text-gray-400">Be included in 5x more quotes compared to standard listings</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Instant Notifications</p>
              <p className="text-sm text-gray-400">Get alerted immediately when your materials are selected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRIORITY_TIERS.map((tier) => {
          const Icon = tier.icon;
          const isPopular = tier.level === 'silver';
          const isBest = tier.level === 'gold';

          return (
            <div
              key={tier.level}
              className={`relative rounded-xl border p-6 transition ${
                isBest
                  ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                  : isPopular
                  ? 'bg-gradient-to-br from-gray-400/10 to-gray-500/10 border-gray-400/50'
                  : 'bg-[#1A1A1A] border-[#2A2A2A]'
              }`}
            >
              {/* Badge */}
              {isBest && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold rounded-full shadow-lg">
                  BEST VALUE
                </div>
              )}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 rounded-xl mb-4 flex items-center justify-center ${
                tier.level === 'gold'
                  ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30'
                  : tier.level === 'silver'
                  ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/20 border border-gray-400/30'
                  : 'bg-gradient-to-br from-orange-700/20 to-orange-800/20 border border-orange-700/30'
              }`}>
                <Icon className={`w-8 h-8 ${
                  tier.level === 'gold' ? 'text-yellow-400' :
                  tier.level === 'silver' ? 'text-gray-300' :
                  'text-orange-400'
                }`} />
              </div>

              {/* Title & Price */}
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">${tier.price}</span>
                <span className="text-gray-400">/month</span>
              </div>

              {/* Placement Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 ${
                tier.level === 'gold'
                  ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                  : tier.level === 'silver'
                  ? 'bg-gray-400/20 border border-gray-400/30 text-gray-300'
                  : 'bg-orange-700/20 border border-orange-700/30 text-orange-400'
              }`}>
                <Star className="w-4 h-4" />
                <span className="text-sm font-semibold">{tier.placement} Placement</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      tier.level === 'gold' ? 'text-yellow-400' :
                      tier.level === 'silver' ? 'text-gray-300' :
                      'text-orange-400'
                    }`} />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  isBest
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700 shadow-lg shadow-yellow-500/20'
                    : isPopular
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-black hover:from-gray-500 hover:to-gray-600'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                }`}
              >
                Get Started
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden mt-8">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h3 className="text-xl font-bold text-white">Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Feature</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-orange-400">Bronze</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Silver</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-yellow-400">Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Quote Placement</td>
                <td className="px-6 py-4 text-center text-sm text-white">Top 50%</td>
                <td className="px-6 py-4 text-center text-sm text-white">Top 25%</td>
                <td className="px-6 py-4 text-center text-sm font-semibold text-yellow-400">First Position</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Visibility Boost</td>
                <td className="px-6 py-4 text-center text-sm text-white">1.5x</td>
                <td className="px-6 py-4 text-center text-sm text-white">2x</td>
                <td className="px-6 py-4 text-center text-sm font-semibold text-yellow-400">5x</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Priority Badge</td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-orange-400 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-yellow-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Analytics Dashboard</td>
                <td className="px-6 py-4 text-center text-sm text-white">Basic</td>
                <td className="px-6 py-4 text-center text-sm text-white">Advanced</td>
                <td className="px-6 py-4 text-center text-sm text-white">Premium</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Quote Notifications</td>
                <td className="px-6 py-4 text-center text-sm text-white">Daily Digest</td>
                <td className="px-6 py-4 text-center text-sm text-white">Real-time</td>
                <td className="px-6 py-4 text-center text-sm text-white">Instant</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Featured in Search</td>
                <td className="px-6 py-4 text-center"><XCircle className="w-5 h-5 text-gray-600 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-yellow-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Preferred Vendor Status</td>
                <td className="px-6 py-4 text-center"><XCircle className="w-5 h-5 text-gray-600 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><XCircle className="w-5 h-5 text-gray-600 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-yellow-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Custom Catalog Integration</td>
                <td className="px-6 py-4 text-center"><XCircle className="w-5 h-5 text-gray-600 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><XCircle className="w-5 h-5 text-gray-600 mx-auto" /></td>
                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-yellow-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-300">Dedicated Support</td>
                <td className="px-6 py-4 text-center text-sm text-white">Email</td>
                <td className="px-6 py-4 text-center text-sm text-white">Priority</td>
                <td className="px-6 py-4 text-center text-sm text-white">Account Manager</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Calculator Teaser */}
      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Average ROI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-bold text-green-400 mb-1">312%</p>
            <p className="text-sm text-gray-400">Average return on Bronze tier</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400 mb-1">487%</p>
            <p className="text-sm text-gray-400">Average return on Silver tier</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400 mb-1">823%</p>
            <p className="text-sm text-gray-400">Average return on Gold tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { XCircle } from 'lucide-react';
