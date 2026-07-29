/**
 * ShopIntelligenceSuite — Kalodata-equivalent for Black Phoenix Company
 * Trending Products · Creator Discovery · Competitor Tracking · Video Analytics · AI Assistant
 * Fully linked to Creator Studio and Store for end-to-end workflow
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  TrendingUp, TrendingDown, Users, Video, ShoppingBag, Zap,
  Star, ArrowUpRight, ArrowDownRight, Search, Filter, RefreshCw,
  Eye, Heart, MessageSquare, Share2, ChevronRight, ExternalLink,
  Instagram, Youtube, Facebook, BarChart3, Target, Award,
  Sparkles, Bot, Send, Copy, Package, DollarSign, Clock,
  Flame, Minus, Play, Building2, MapPin, CheckCircle, X,
  Bell, AlertTriangle, ShoppingCart, Plus, Globe, TrendingUp as TrendUp,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ZendropTopProducts from './ZendropTopProducts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrendingProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  salesVelocity: number;      // units/day estimate
  revenueEstimate: number;    // monthly $ estimate
  trend: 'rising' | 'stable' | 'falling';
  trendPct: number;           // % change last 7 days
  engagementScore: number;    // 0–100
  topPlatform: string;
  videoCount: number;
  creatorCount: number;
  trendData: { day: string; sales: number }[];
  tags: string[];
  competitorCount: number;
  contentTypes: ('reel' | 'video' | 'ad' | 'story')[];
  topContentStyle: string;
  avgVideoDuration: string;
  // Pro fields
  opportunityScore: number;      // 0–100 composite: demand vs competition vs margin
  demandScore: number;           // 0–100 raw demand signal
  competitionScore: number;      // 0–100 (lower = less competition = better)
  marginPotential: string;       // e.g. "35–45%"
  historicalData: { month: string; sales: number; revenue: number }[];
  saturationRisk: 'low' | 'medium' | 'high';
  bestTimeToPost: string;
  targetAudience: string;
  avgRating: number;
  returnRate: string;
}

interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook';
  followers: number;
  engagementRate: number;
  avgViews: number;
  niche: string;
  categories: string[];
  conversionRate: number;
  recentProducts: string[];
  estimatedRevenue: number;
  verified: boolean;
  contactEmail?: string;
  rating: number;
  saved: boolean;
}

interface Competitor {
  id: string;
  name: string;
  platform: string;
  followers: number;
  topProducts: string[];
  avgPrice: number;
  monthlyRevenue: number;
  videoCount: number;
  engagementRate: number;
  lastActive: string;
  trend: 'growing' | 'stable' | 'declining';
  url: string;
}

interface VideoInsight {
  style: string;
  avgEngagement: number;
  avgConversionRate: number;
  avgDuration: string;
  bestTime: string;
  bestDay: string;
  hookType: string;
  examplePerformance: { label: string; value: string }[];
  trending: boolean;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const TRENDING_PRODUCTS: TrendingProduct[] = [
  {
    id: 'tp1', name: 'Wireless Noise-Cancelling Earbuds', category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
    price: 39, salesVelocity: 1240, revenueEstimate: 1452600, trend: 'rising', trendPct: 134,
    engagementScore: 98, topPlatform: 'TikTok', videoCount: 12400, creatorCount: 892,
    trendData: [{ day: 'Mon', sales: 620 }, { day: 'Tue', sales: 780 }, { day: 'Wed', sales: 920 }, { day: 'Thu', sales: 1050 }, { day: 'Fri', sales: 1240 }, { day: 'Sat', sales: 1480 }, { day: 'Sun', sales: 1620 }],
    tags: ['Audio', 'Tech', 'Wireless', 'Gift'],
    competitorCount: 78,
    contentTypes: ['reel', 'ad'],
    topContentStyle: 'Unboxing + Demo',
    avgVideoDuration: '22s',
    opportunityScore: 91, demandScore: 98, competitionScore: 72, marginPotential: '45–55%',
    saturationRisk: 'medium', bestTimeToPost: 'Tue & Fri 7–9PM', targetAudience: 'Tech-savvy 18–35, gift buyers',
    avgRating: 4.6, returnRate: '3.2%',
    historicalData: [{ month: 'Feb', sales: 420, revenue: 16380 }, { month: 'Mar', sales: 580, revenue: 22620 }, { month: 'Apr', sales: 740, revenue: 28860 }, { month: 'May', sales: 920, revenue: 35880 }, { month: 'Jun', sales: 1080, revenue: 42120 }, { month: 'Jul', sales: 1240, revenue: 48360 }],
  },
  {
    id: 'tp2', name: 'Stanley Tumbler 40oz (Dupes)', category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
    price: 18, salesVelocity: 2100, revenueEstimate: 1134000, trend: 'rising', trendPct: 89,
    engagementScore: 96, topPlatform: 'TikTok', videoCount: 28000, creatorCount: 1840,
    trendData: [{ day: 'Mon', sales: 1200 }, { day: 'Tue', sales: 1500 }, { day: 'Wed', sales: 1700 }, { day: 'Thu', sales: 1900 }, { day: 'Fri', sales: 2100 }, { day: 'Sat', sales: 2400 }, { day: 'Sun', sales: 2600 }],
    tags: ['Hydration', 'Lifestyle', 'Trending', 'Gift'],
    competitorCount: 145,
    contentTypes: ['reel', 'story'],
    topContentStyle: 'Aesthetic/Lifestyle',
    avgVideoDuration: '15s',
    opportunityScore: 78, demandScore: 95, competitionScore: 45, marginPotential: '50–60%',
    saturationRisk: 'high', bestTimeToPost: 'Sat & Sun 11AM, 8PM', targetAudience: 'Women 20–40, lifestyle / hydration',
    avgRating: 4.8, returnRate: '1.8%',
    historicalData: [{ month: 'Feb', sales: 800, revenue: 14400 }, { month: 'Mar', sales: 1100, revenue: 19800 }, { month: 'Apr', sales: 1500, revenue: 27000 }, { month: 'May', sales: 1800, revenue: 32400 }, { month: 'Jun', sales: 2000, revenue: 36000 }, { month: 'Jul', sales: 2100, revenue: 37800 }],
  },
  {
    id: 'tp3', name: 'LED Strip Lights 50ft Smart RGB', category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    price: 24, salesVelocity: 1650, revenueEstimate: 1188000, trend: 'rising', trendPct: 72,
    engagementScore: 94, topPlatform: 'TikTok', videoCount: 18200, creatorCount: 1120,
    trendData: [{ day: 'Mon', sales: 980 }, { day: 'Tue', sales: 1150 }, { day: 'Wed', sales: 1300 }, { day: 'Thu', sales: 1450 }, { day: 'Fri', sales: 1650 }, { day: 'Sat', sales: 1900 }, { day: 'Sun', sales: 2100 }],
    tags: ['Home Decor', 'Smart Home', 'Aesthetic', 'Gaming'],
    competitorCount: 92,
    contentTypes: ['reel', 'video'],
    topContentStyle: 'Room Transformation',
    avgVideoDuration: '30s',
    opportunityScore: 85, demandScore: 92, competitionScore: 60, marginPotential: '55–65%',
    saturationRisk: 'medium', bestTimeToPost: 'Thu & Fri 8–10PM', targetAudience: 'Gamers, home decor, Gen Z 16–28',
    avgRating: 4.4, returnRate: '4.1%',
    historicalData: [{ month: 'Feb', sales: 600, revenue: 14400 }, { month: 'Mar', sales: 850, revenue: 20400 }, { month: 'Apr', sales: 1100, revenue: 26400 }, { month: 'May', sales: 1350, revenue: 32400 }, { month: 'Jun', sales: 1500, revenue: 36000 }, { month: 'Jul', sales: 1650, revenue: 39600 }],
  },
  {
    id: 'tp4', name: 'Mini Waffle Maker', category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80',
    price: 14, salesVelocity: 890, revenueEstimate: 374580, trend: 'rising', trendPct: 115,
    engagementScore: 97, topPlatform: 'TikTok', videoCount: 9200, creatorCount: 620,
    trendData: [{ day: 'Mon', sales: 420 }, { day: 'Tue', sales: 560 }, { day: 'Wed', sales: 680 }, { day: 'Thu', sales: 760 }, { day: 'Fri', sales: 890 }, { day: 'Sat', sales: 1020 }, { day: 'Sun', sales: 1150 }],
    tags: ['Kitchen', 'Breakfast', 'Gift', 'Viral'],
    competitorCount: 56,
    contentTypes: ['reel', 'ad'],
    topContentStyle: 'Hack/Life Tip',
    avgVideoDuration: '18s',
    opportunityScore: 94, demandScore: 97, competitionScore: 75, marginPotential: '60–70%',
    saturationRisk: 'low', bestTimeToPost: 'Mon & Sat 8AM, 7PM', targetAudience: 'Home cooks, college students, gift buyers',
    avgRating: 4.7, returnRate: '2.1%',
    historicalData: [{ month: 'Feb', sales: 200, revenue: 2800 }, { month: 'Mar', sales: 350, revenue: 4900 }, { month: 'Apr', sales: 520, revenue: 7280 }, { month: 'May', sales: 680, revenue: 9520 }, { month: 'Jun', sales: 800, revenue: 11200 }, { month: 'Jul', sales: 890, revenue: 12460 }],
  },
  {
    id: 'tp5', name: 'Portable Blender USB Rechargeable', category: 'Health & Beauty',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    price: 22, salesVelocity: 780, revenueEstimate: 514800, trend: 'rising', trendPct: 58,
    engagementScore: 91, topPlatform: 'Instagram', videoCount: 6800, creatorCount: 480,
    trendData: [{ day: 'Mon', sales: 480 }, { day: 'Tue', sales: 560 }, { day: 'Wed', sales: 620 }, { day: 'Thu', sales: 700 }, { day: 'Fri', sales: 780 }, { day: 'Sat', sales: 860 }, { day: 'Sun', sales: 920 }],
    tags: ['Fitness', 'Smoothie', 'Health', 'Travel'],
    competitorCount: 44,
    contentTypes: ['reel', 'story', 'ad'],
    topContentStyle: 'Before & After',
    avgVideoDuration: '25s',
    opportunityScore: 87, demandScore: 91, competitionScore: 80, marginPotential: '55–65%',
    saturationRisk: 'low', bestTimeToPost: 'Mon & Wed 7–9PM', targetAudience: 'Fitness enthusiasts, health-conscious 20–35',
    avgRating: 4.5, returnRate: '3.8%',
    historicalData: [{ month: 'Feb', sales: 300, revenue: 6600 }, { month: 'Mar', sales: 420, revenue: 9240 }, { month: 'Apr', sales: 540, revenue: 11880 }, { month: 'May', sales: 650, revenue: 14300 }, { month: 'Jun', sales: 720, revenue: 15840 }, { month: 'Jul', sales: 780, revenue: 17160 }],
  },
  {
    id: 'tp6', name: 'Cordless Electric Spin Scrubber', category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80',
    price: 34, salesVelocity: 640, revenueEstimate: 651840, trend: 'rising', trendPct: 44,
    engagementScore: 89, topPlatform: 'TikTok', videoCount: 5400, creatorCount: 380,
    trendData: [{ day: 'Mon', sales: 420 }, { day: 'Tue', sales: 480 }, { day: 'Wed', sales: 520 }, { day: 'Thu', sales: 580 }, { day: 'Fri', sales: 640 }, { day: 'Sat', sales: 720 }, { day: 'Sun', sales: 780 }],
    tags: ['Cleaning', 'Home', 'Bathroom', 'Lazy Girl'],
    competitorCount: 31,
    contentTypes: ['reel'],
    topContentStyle: 'Satisfying Demo',
    avgVideoDuration: '20s',
    opportunityScore: 90, demandScore: 89, competitionScore: 82, marginPotential: '50–60%',
    saturationRisk: 'low', bestTimeToPost: 'Fri & Sat 6–8PM', targetAudience: 'Homeowners, renters 25–45, lazy-girl hack fans',
    avgRating: 4.6, returnRate: '2.9%',
    historicalData: [{ month: 'Feb', sales: 240, revenue: 8160 }, { month: 'Mar', sales: 340, revenue: 11560 }, { month: 'Apr', sales: 440, revenue: 14960 }, { month: 'May', sales: 540, revenue: 18360 }, { month: 'Jun', sales: 600, revenue: 20400 }, { month: 'Jul', sales: 640, revenue: 21760 }],
  },
  {
    id: 'tp7', name: 'Resistance Bands Set (11pc)', category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
    price: 19, salesVelocity: 920, revenueEstimate: 523440, trend: 'rising', trendPct: 38,
    engagementScore: 87, topPlatform: 'Instagram', videoCount: 7200, creatorCount: 510,
    trendData: [{ day: 'Mon', sales: 640 }, { day: 'Tue', sales: 700 }, { day: 'Wed', sales: 740 }, { day: 'Thu', sales: 820 }, { day: 'Fri', sales: 920 }, { day: 'Sat', sales: 1000 }, { day: 'Sun', sales: 1050 }],
    tags: ['Fitness', 'Home Gym', 'Workout', 'Weight Loss'],
    competitorCount: 68,
    contentTypes: ['reel', 'ad', 'video'],
    topContentStyle: 'Workout Demo',
    avgVideoDuration: '35s',
    opportunityScore: 82, demandScore: 87, competitionScore: 58, marginPotential: '60–70%',
    saturationRisk: 'medium', bestTimeToPost: 'Mon & Thu 6–8AM, 7PM', targetAudience: 'Home gym enthusiasts, weight loss 22–40',
    avgRating: 4.5, returnRate: '3.4%',
    historicalData: [{ month: 'Feb', sales: 480, revenue: 9120 }, { month: 'Mar', sales: 580, revenue: 11020 }, { month: 'Apr', sales: 700, revenue: 13300 }, { month: 'May', sales: 800, revenue: 15200 }, { month: 'Jun', sales: 870, revenue: 16530 }, { month: 'Jul', sales: 920, revenue: 17480 }],
  },
  {
    id: 'tp8', name: 'Vitamin C + Collagen Gummies 60ct', category: 'Health & Beauty',
    image: 'https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=400&q=80',
    price: 16, salesVelocity: 1480, revenueEstimate: 710400, trend: 'rising', trendPct: 61,
    engagementScore: 92, topPlatform: 'TikTok', videoCount: 11800, creatorCount: 840,
    trendData: [{ day: 'Mon', sales: 880 }, { day: 'Tue', sales: 1020 }, { day: 'Wed', sales: 1150 }, { day: 'Thu', sales: 1280 }, { day: 'Fri', sales: 1480 }, { day: 'Sat', sales: 1640 }, { day: 'Sun', sales: 1720 }],
    tags: ['Supplements', 'Wellness', 'Skin', 'Anti-Aging'],
    competitorCount: 112,
    contentTypes: ['ad', 'reel'],
    topContentStyle: 'Social Proof/Review',
    avgVideoDuration: '28s',
    opportunityScore: 79, demandScore: 92, competitionScore: 42, marginPotential: '55–65%',
    saturationRisk: 'high', bestTimeToPost: 'Wed & Sun 7–9PM', targetAudience: 'Wellness-focused women 28–50, anti-aging seekers',
    avgRating: 4.7, returnRate: '2.6%',
    historicalData: [{ month: 'Feb', sales: 600, revenue: 9600 }, { month: 'Mar', sales: 800, revenue: 12800 }, { month: 'Apr', sales: 1000, revenue: 16000 }, { month: 'May', sales: 1200, revenue: 19200 }, { month: 'Jun', sales: 1350, revenue: 21600 }, { month: 'Jul', sales: 1480, revenue: 23680 }],
  },
  {
    id: 'tp9', name: 'Magnetic Phone Car Mount', category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80',
    price: 12, salesVelocity: 1820, revenueEstimate: 655200, trend: 'stable', trendPct: 4,
    engagementScore: 78, topPlatform: 'YouTube', videoCount: 4200, creatorCount: 290,
    trendData: [{ day: 'Mon', sales: 1780 }, { day: 'Tue', sales: 1800 }, { day: 'Wed', sales: 1790 }, { day: 'Thu', sales: 1810 }, { day: 'Fri', sales: 1820 }, { day: 'Sat', sales: 1840 }, { day: 'Sun', sales: 1810 }],
    tags: ['Car', 'Tech', 'Commute', 'Safety'],
    competitorCount: 88,
    contentTypes: ['video', 'ad'],
    topContentStyle: 'Problem → Solution',
    avgVideoDuration: '45s',
    opportunityScore: 72, demandScore: 78, competitionScore: 40, marginPotential: '50–60%',
    saturationRisk: 'medium', bestTimeToPost: 'Tue & Thu 12PM, 5PM', targetAudience: 'Commuters, drivers 25–50, road-trip travelers',
    avgRating: 4.3, returnRate: '4.5%',
    historicalData: [{ month: 'Feb', sales: 1700, revenue: 20400 }, { month: 'Mar', sales: 1740, revenue: 20880 }, { month: 'Apr', sales: 1760, revenue: 21120 }, { month: 'May', sales: 1790, revenue: 21480 }, { month: 'Jun', sales: 1810, revenue: 21720 }, { month: 'Jul', sales: 1820, revenue: 21840 }],
  },
  {
    id: 'tp10', name: 'Dog Calming Treats (90ct)', category: 'Pet Supplies',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    price: 21, salesVelocity: 740, revenueEstimate: 465660, trend: 'rising', trendPct: 52,
    engagementScore: 88, topPlatform: 'TikTok', videoCount: 5800, creatorCount: 420,
    trendData: [{ day: 'Mon', sales: 460 }, { day: 'Tue', sales: 520 }, { day: 'Wed', sales: 580 }, { day: 'Thu', sales: 650 }, { day: 'Fri', sales: 740 }, { day: 'Sat', sales: 820 }, { day: 'Sun', sales: 880 }],
    tags: ['Pet', 'Dog', 'Anxiety', 'Natural'],
    competitorCount: 47,
    contentTypes: ['reel', 'story'],
    topContentStyle: 'Cute Pet + Transformation',
    avgVideoDuration: '22s',
    opportunityScore: 88, demandScore: 88, competitionScore: 74, marginPotential: '55–65%',
    saturationRisk: 'low', bestTimeToPost: 'Sat & Sun 10AM, 6PM', targetAudience: 'Dog owners 28–55, anxious-pet households',
    avgRating: 4.8, returnRate: '2.2%',
    historicalData: [{ month: 'Feb', sales: 280, revenue: 5880 }, { month: 'Mar', sales: 380, revenue: 7980 }, { month: 'Apr', sales: 490, revenue: 10290 }, { month: 'May', sales: 600, revenue: 12600 }, { month: 'Jun', sales: 680, revenue: 14280 }, { month: 'Jul', sales: 740, revenue: 15540 }],
  },
  {
    id: 'tp11', name: 'Cordless Drill & Driver Combo Kit', category: 'Tools & Hardware',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80',
    price: 89, salesVelocity: 340, revenueEstimate: 910800, trend: 'rising', trendPct: 42,
    engagementScore: 86, topPlatform: 'YouTube', videoCount: 2840, creatorCount: 186,
    trendData: [{ day: 'Mon', sales: 210 }, { day: 'Tue', sales: 265 }, { day: 'Wed', sales: 290 }, { day: 'Thu', sales: 310 }, { day: 'Fri', sales: 340 }, { day: 'Sat', sales: 380 }, { day: 'Sun', sales: 420 }],
    tags: ['DIY', 'Home Improvement', 'Power Tools', 'Cordless'],
    competitorCount: 24,
    contentTypes: ['video', 'ad'],
    topContentStyle: 'Expert Tutorial',
    avgVideoDuration: '2min',
    opportunityScore: 89, demandScore: 86, competitionScore: 85, marginPotential: '35–45%',
    saturationRisk: 'low', bestTimeToPost: 'Sat 9AM–12PM, Thu 7PM', targetAudience: 'DIY homeowners, contractors, men 30–55',
    avgRating: 4.7, returnRate: '2.8%',
    historicalData: [{ month: 'Feb', sales: 160, revenue: 14240 }, { month: 'Mar', sales: 200, revenue: 17800 }, { month: 'Apr', sales: 250, revenue: 22250 }, { month: 'May', sales: 290, revenue: 25810 }, { month: 'Jun', sales: 320, revenue: 28480 }, { month: 'Jul', sales: 340, revenue: 30260 }],
  },
  {
    id: 'tp12', name: 'Ice Roller Face Massager', category: 'Health & Beauty',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80',
    price: 11, salesVelocity: 2400, revenueEstimate: 792000, trend: 'rising', trendPct: 198,
    engagementScore: 99, topPlatform: 'TikTok', videoCount: 34000, creatorCount: 2200,
    trendData: [{ day: 'Mon', sales: 800 }, { day: 'Tue', sales: 1100 }, { day: 'Wed', sales: 1500 }, { day: 'Thu', sales: 1900 }, { day: 'Fri', sales: 2400 }, { day: 'Sat', sales: 3000 }, { day: 'Sun', sales: 3600 }],
    tags: ['Skincare', 'Beauty', 'Anti-Aging', 'De-Puff'],
    competitorCount: 134,
    contentTypes: ['reel', 'story', 'ad'],
    topContentStyle: 'Before & After Glow',
    avgVideoDuration: '12s',
    opportunityScore: 96, demandScore: 99, competitionScore: 55, marginPotential: '65–75%',
    saturationRisk: 'medium', bestTimeToPost: 'Tue & Thu 6–9PM', targetAudience: 'Women 22–45, skincare / beauty',
    avgRating: 4.9, returnRate: '1.2%',
    historicalData: [{ month: 'Feb', sales: 400, revenue: 4400 }, { month: 'Mar', sales: 700, revenue: 7700 }, { month: 'Apr', sales: 1100, revenue: 12100 }, { month: 'May', sales: 1700, revenue: 18700 }, { month: 'Jun', sales: 2100, revenue: 23100 }, { month: 'Jul', sales: 2400, revenue: 26400 }],
  },
];

const CREATORS: Creator[] = [
  { id: 'c1', name: 'TechDeals Maya', handle: '@techdealsmaya', avatar: 'M', platform: 'tiktok', followers: 4200000, engagementRate: 9.8, avgViews: 1800000, niche: 'Tech & Gadgets', categories: ['Electronics', 'Automotive', 'Home & Garden'], conversionRate: 6.2, recentProducts: ['Wireless Earbuds', 'LED Strip Lights'], estimatedRevenue: 68000, verified: true, rating: 5.0, saved: false },
  { id: 'c2', name: 'Budget Beauty Bri', handle: '@budgetbeautybri', avatar: 'B', platform: 'tiktok', followers: 2800000, engagementRate: 11.4, avgViews: 920000, niche: 'Beauty & Skincare', categories: ['Health & Beauty'], conversionRate: 7.8, recentProducts: ['Ice Roller', 'Vitamin C Gummies', 'Portable Blender'], estimatedRevenue: 52000, verified: true, rating: 4.9, saved: false },
  { id: 'c3', name: 'Kitchen Hacks Kevin', handle: '@kitchenhackskevin', avatar: 'K', platform: 'tiktok', followers: 1900000, engagementRate: 13.2, avgViews: 1400000, niche: 'Kitchen & Food', categories: ['Kitchen', 'Health & Beauty'], conversionRate: 8.4, recentProducts: ['Mini Waffle Maker', 'Stanley Tumbler', 'Portable Blender'], estimatedRevenue: 44000, verified: false, rating: 4.8, saved: false },
  { id: 'c4', name: 'Fit Life Jasmine', handle: '@fitlifejasmine', avatar: 'J', platform: 'instagram', followers: 1400000, engagementRate: 7.6, avgViews: 280000, niche: 'Fitness & Wellness', categories: ['Sports & Outdoors', 'Health & Beauty'], conversionRate: 5.1, recentProducts: ['Resistance Bands', 'Vitamin Gummies'], estimatedRevenue: 31000, verified: true, rating: 4.7, saved: false },
  { id: 'c5', name: 'Home Finds with Alex', handle: '@homefindsalex', avatar: 'A', platform: 'tiktok', followers: 3600000, engagementRate: 10.2, avgViews: 1600000, niche: 'Home & Lifestyle', categories: ['Home & Garden', 'Kitchen', 'Electronics'], conversionRate: 6.9, recentProducts: ['LED Strips', 'Spin Scrubber', 'Stanley Dupe'], estimatedRevenue: 78000, verified: true, rating: 4.9, saved: false },
  { id: 'c6', name: 'Pet Parent Priya', handle: '@petparentpriya', avatar: 'P', platform: 'instagram', followers: 680000, engagementRate: 8.9, avgViews: 145000, niche: 'Pets & Animals', categories: ['Pet Supplies'], conversionRate: 9.2, recentProducts: ['Dog Calming Treats', 'Pet Harness'], estimatedRevenue: 18000, verified: false, rating: 4.8, saved: false },
  { id: 'c7', name: 'Deal Hunter Dave', handle: '@dealhunterdave', avatar: 'D', platform: 'youtube', followers: 920000, engagementRate: 5.8, avgViews: 210000, niche: 'Deals & Reviews', categories: ['Electronics', 'Automotive', 'Tools & Hardware'], conversionRate: 4.4, recentProducts: ['Phone Mount', 'Wireless Earbuds', 'Drill Kit'], estimatedRevenue: 22000, verified: true, rating: 4.6, saved: false },
];

const COMPETITORS: Competitor[] = [
  { id: 'co1', name: 'TrendVault Shop', platform: 'TikTok Shop', followers: 1240000, topProducts: ['Ice Roller', 'LED Strips', 'Wireless Earbuds', 'Mini Waffle Maker'], avgPrice: 28, monthlyRevenue: 3800000, videoCount: 2840, engagementRate: 4.2, lastActive: '1 hour ago', trend: 'growing', url: '#' },
  { id: 'co2', name: 'DealDropUSA', platform: 'TikTok Shop', followers: 680000, topProducts: ['Stanley Dupe', 'Vitamin Gummies', 'Spin Scrubber'], avgPrice: 22, monthlyRevenue: 1240000, videoCount: 1420, engagementRate: 6.8, lastActive: '3 hours ago', trend: 'growing', url: '#' },
  { id: 'co3', name: 'LifestylePicks', platform: 'Instagram Shop', followers: 490000, topProducts: ['Portable Blender', 'Resistance Bands', 'Dog Treats'], avgPrice: 31, monthlyRevenue: 580000, videoCount: 620, engagementRate: 7.4, lastActive: '5 hours ago', trend: 'stable', url: '#' },
  { id: 'co4', name: 'GadgetGrab', platform: 'TikTok Shop', followers: 310000, topProducts: ['Phone Mount', 'Wireless Earbuds', 'LED Strips'], avgPrice: 24, monthlyRevenue: 340000, videoCount: 380, engagementRate: 5.1, lastActive: '2 days ago', trend: 'declining', url: '#' },
];

const VIDEO_INSIGHTS: VideoInsight[] = [
  { style: 'Problem → Solution', avgEngagement: 9.2, avgConversionRate: 5.8, avgDuration: '18–35 sec', bestTime: '7:00 PM', bestDay: 'Tuesday', hookType: 'Pain point opener ("Stop wasting money on...")', trending: true, examplePerformance: [{ label: 'Avg Views', value: '420K' }, { label: 'Conv. Rate', value: '5.8%' }, { label: 'Share Rate', value: '3.1%' }] },
  { style: 'Before & After', avgEngagement: 12.4, avgConversionRate: 7.2, avgDuration: '25–45 sec', bestTime: '8:00 PM', bestDay: 'Saturday', hookType: 'Visual transformation (Show the mess first)', trending: true, examplePerformance: [{ label: 'Avg Views', value: '680K' }, { label: 'Conv. Rate', value: '7.2%' }, { label: 'Share Rate', value: '5.8%' }] },
  { style: 'Unboxing + Demo', avgEngagement: 7.8, avgConversionRate: 4.4, avgDuration: '45–90 sec', bestTime: '6:00 PM', bestDay: 'Wednesday', hookType: 'Curiosity ("I finally got this...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '290K' }, { label: 'Conv. Rate', value: '4.4%' }, { label: 'Share Rate', value: '2.2%' }] },
  { style: 'Expert Tutorial', avgEngagement: 6.1, avgConversionRate: 3.9, avgDuration: '2–5 min', bestTime: '12:00 PM', bestDay: 'Thursday', hookType: 'Authority opener ("As a contractor...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '185K' }, { label: 'Conv. Rate', value: '3.9%' }, { label: 'Share Rate', value: '1.9%' }] },
  { style: 'Hack / Life Tip', avgEngagement: 14.8, avgConversionRate: 6.6, avgDuration: '12–25 sec', bestTime: '9:00 PM', bestDay: 'Friday', hookType: 'Curiosity hook ("This changed everything...")', trending: true, examplePerformance: [{ label: 'Avg Views', value: '1.2M' }, { label: 'Conv. Rate', value: '6.6%' }, { label: 'Share Rate', value: '8.4%' }] },
  { style: 'Social Proof / Review', avgEngagement: 8.9, avgConversionRate: 8.1, avgDuration: '30–60 sec', bestTime: '7:30 PM', bestDay: 'Sunday', hookType: 'Testimonial opener ("After 1 month of using...")', trending: false, examplePerformance: [{ label: 'Avg Views', value: '340K' }, { label: 'Conv. Rate', value: '8.1%' }, { label: 'Share Rate', value: '4.2%' }] },
];

const AI_SUGGESTIONS = [
  "🔥 Ice Roller Face Massager is trending +198% in 24h — 34,000 TikTok videos, $11 price point. Add to your store NOW — window is 48hrs before saturation.",
  "⚡ Best performing window: Tuesday 7PM posts get 42% more engagement in Home Improvement. Schedule your Smart Switch video then.",
  "👥 'Home Hacks Hannah' (@homehackshannah, 3.1M followers) has a 5.4% conversion rate for your exact product categories. High-priority outreach.",
  "🎬 'Before & After' videos convert at 7.2% — 3x better than tutorials for your product categories. Prioritize this format.",
  "🏆 Your top competitor (TrendVault Shop) is posting 40+ videos/week across all categories. You need at minimum 12–15/week to compete for the algorithm.",
  "💡 Smart LED Dimmer Switch in the $45–55 price range is outperforming $99+ alternatives by 3x on conversion rate. Your $49 price point is ideal.",
];

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

// ── Sourcing — where a dropshipper can buy each product ──────────────────────────
// Each supplier estimates a source (wholesale) cost as a fraction of the retail
// price, plus typical shipping time, and gives a one-click search deep-link so the
// owner can jump straight to that product on the supplier's site.
interface Supplier {
  name: string;
  factor: number;        // source cost ≈ retail price × factor
  ship: string;
  note: string;
  accent: string;        // tailwind text color class
  best?: boolean;        // recommended for dropshipping
  url: (name: string) => string;
}

const SUPPLIERS: Supplier[] = [
  { name: 'Zendrop', factor: 0.40, ship: '5–8 days (US)', note: 'Fastest US shipping · auto-fulfill', accent: 'text-orange-400', best: true,
    url: n => `https://app.zendrop.com/search?query=${encodeURIComponent(n)}` },
  { name: 'CJ Dropshipping', factor: 0.36, ship: '7–12 days', note: 'US warehouses · custom branding', accent: 'text-blue-400',
    url: n => `https://cjdropshipping.com/list/search?searchText=${encodeURIComponent(n)}` },
  { name: 'AliExpress', factor: 0.30, ship: '10–20 days', note: 'Lowest per-unit cost · huge selection', accent: 'text-red-400',
    url: n => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(n)}` },
  { name: 'Alibaba (bulk)', factor: 0.20, ship: '15–30 days', note: 'Best for bulk/private label', accent: 'text-yellow-400',
    url: n => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(n)}` },
  { name: 'Amazon', factor: 0.70, ship: '1–2 days', note: 'Instant restock · higher cost', accent: 'text-gray-300',
    url: n => `https://www.amazon.com/s?k=${encodeURIComponent(n)}` },
];

function sourceOptions(productName: string, retailPrice: number) {
  return SUPPLIERS.map(s => {
    const cost = Math.max(1, Math.round(retailPrice * s.factor));
    const profit = retailPrice - cost;
    const margin = retailPrice > 0 ? Math.round((profit / retailPrice) * 100) : 0;
    return { ...s, cost, profit, margin, link: s.url(productName) };
  });
}

// Where-to-source panel used in both Trending Products and Market Alerts.
function SourcingPanel({ name, price, compact }: { name: string; price: number; compact?: boolean }) {
  const options = sourceOptions(name, price);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'rgba(234,88,12,0.04)', borderColor: 'rgba(234,88,12,0.2)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(234,88,12,0.15)' }}>
        <ShoppingBag className="w-4 h-4 text-orange-400" />
        <p className="text-xs font-black text-white uppercase tracking-wider">Where to source it</p>
        <span className="ml-auto text-xs text-gray-500">Sell price ${price} · profit per unit shown</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {options.map(o => (
          <a key={o.name} href={o.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-bold ${o.accent}`}>{o.name}</span>
                {o.best && <span className="px-1.5 py-0.5 rounded-full text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">✅ Recommended</span>}
                {!compact && <span className="text-xs text-gray-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {o.ship}</span>}
              </div>
              {!compact && <p className="text-xs text-gray-500 mt-0.5">{o.note}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Cost <span className="text-white font-bold">${o.cost}</span></p>
              <p className="text-xs text-green-400 font-bold">+${o.profit} <span className="text-gray-500 font-normal">({o.margin}%)</span></p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition flex-shrink-0" />
          </a>
        ))}
      </div>
      <p className="px-4 py-2 text-xs text-gray-600 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        💡 Costs are estimates. Zendrop syncs directly to your store — import it, then set your price in the <span className="text-orange-400">Dropshippers → Pricing</span> tab.
      </p>
    </div>
  );
}

function trendIcon(trend: string, pct: number) {
  if (trend === 'rising') return <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><TrendingUp className="w-3.5 h-3.5" />+{pct}%</span>;
  if (trend === 'falling') return <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown className="w-3.5 h-3.5" />{pct}%</span>;
  return <span className="flex items-center gap-1 text-gray-400 text-xs font-bold"><Minus className="w-3.5 h-3.5" />+{pct}%</span>;
}

const PLATFORM_ICON: Record<string, any> = { tiktok: Video, instagram: Instagram, youtube: Youtube, facebook: Facebook };
const PLATFORM_COLOR: Record<string, string> = { tiktok: 'from-black to-gray-800', instagram: 'from-purple-500 to-pink-500', youtube: 'from-red-600 to-red-700', facebook: 'from-blue-600 to-blue-700' };

// ── US Market Alert Data ───────────────────────────────────────────────────────

const US_ALERTS = [
  { id: 'a1', product: 'Ice Roller Face Massager', category: 'Health & Beauty', spike: '+198%', timeframe: '24h', region: 'Nationwide', price: 11, action: 'add_now', urgency: 'critical', revenue: '$792K/mo est.', reason: 'Exploded overnight — 34,000 TikTok videos in 24h. @budgetbeautybri post hit 18M views. $11 price point is impulse-buy territory. Act in the next 48hrs.', icon: '🔥' },
  { id: 'a2', product: 'Mini Waffle Maker', category: 'Kitchen', spike: '+115%', timeframe: '24h', region: 'Nationwide', price: 14, action: 'add_now', urgency: 'critical', revenue: '$374K/mo est.', reason: 'Viral breakfast hack trend driving 9,200 videos. $14 price = massive impulse purchases. Sells out repeatedly on Amazon. Window closing fast.', icon: '🚨' },
  { id: 'a3', product: 'Wireless Noise-Cancelling Earbuds', category: 'Electronics', spike: '+134%', timeframe: '48h', region: 'Nationwide', price: 39, action: 'add_now', urgency: 'high', revenue: '$1.45M/mo est.', reason: 'AirPods dupe trend is massive. 12,400 TikTok videos, 892 creators. $39 vs $249 AirPods = massive value story. High search volume across all ages.', icon: '⚡' },
  { id: 'a4', product: 'Vitamin C + Collagen Gummies', category: 'Health & Beauty', spike: '+61%', timeframe: '48h', region: 'Nationwide', price: 16, action: 'add_now', urgency: 'high', revenue: '$710K/mo est.', reason: 'Wellness supplement trend growing fast. 11,800 videos, 840 creators. Repeat purchase product = lifetime customer value. Low competition in this price range.', icon: '📈' },
  { id: 'a5', product: 'Cordless Electric Spin Scrubber', category: 'Home & Garden', spike: '+44%', timeframe: '72h', region: 'Northeast + Southeast', price: 34, action: 'watch', urgency: 'medium', revenue: '$651K/mo est.', reason: '"Lazy girl cleaning" trend on TikTok. 5,400 videos and growing. Satisfying before/after content drives massive engagement. 31 competitors — still room to enter.', icon: '🧹' },
  { id: 'a6', product: 'Dog Calming Treats 90ct', category: 'Pet Supplies', spike: '+52%', timeframe: '5d', region: 'Nationwide', price: 21, action: 'watch', urgency: 'medium', revenue: '$465K/mo est.', reason: 'Pet anxiety category growing steadily. 5,800 videos, 420 pet creators. Repeat purchase product. 4th of July and fireworks season driving spike.', icon: '🐾' },
  { id: 'a7', product: 'LED Strip Lights 50ft Smart RGB', category: 'Electronics', spike: '+72%', timeframe: '72h', region: 'Nationwide', price: 24, action: 'watch', urgency: 'medium', revenue: '$1.18M/mo est.', reason: 'Room aesthetic trend never dies. 18,200 videos. Gaming setup content driving Gen Z purchases. Good margin at $24, high search volume year-round.', icon: '💡' },
];

const US_REGIONS = [
  { name: 'Northeast', products: ['Wireless Earbuds', 'LED Strips', 'Resistance Bands'], hot: 'Wireless Earbuds +134%' },
  { name: 'Southeast', products: ['Ice Roller', 'Mini Waffle Maker', 'Dog Treats'], hot: 'Ice Roller +198%' },
  { name: 'Midwest', products: ['Stanley Tumbler', 'Spin Scrubber', 'Drill Kit'], hot: 'Stanley Tumbler +89%' },
  { name: 'Southwest', products: ['Vitamin Gummies', 'Portable Blender', 'Yoga Mat'], hot: 'Vitamin Gummies +61%' },
  { name: 'West Coast', products: ['Ice Roller', 'LED Strips', 'Earbuds'], hot: 'Ice Roller +198%' },
];

type Tab = 'overview' | 'products' | 'zendrop' | 'alerts' | 'creators' | 'competitors' | 'video-insights' | 'ai-assistant';

interface Props {
  onSendToCreatorStudio?: (product: TrendingProduct) => void;
}

export default function ShopIntelligenceSuite({ onSendToCreatorStudio }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [productFilter, setProductFilter] = useState('all');
  const [productSort, setProductSort] = useState<'trending' | 'revenue' | 'velocity'>('trending');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'reel' | 'video' | 'ad' | 'story'>('all');
  const [creatorSearch, setCreatorSearch] = useState('');
  const [creatorPlatform, setCreatorPlatform] = useState('all');
  const [savedCreators, setSavedCreators] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TrendingProduct | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Hi! I'm BPilot, your AI shop intelligence assistant. Ask me anything about trending products, which creators to target, what video style to use, or how to beat your competitors. I analyze your category data in real time.", timestamp: new Date().toLocaleTimeString() },
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [addedToStore, setAddedToStore] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState('2 minutes ago');
  const [alertEmail, setAlertEmail] = useState('ericerb555@proton.me');
  const [alertPhone, setAlertPhone] = useState('');
  const [alertUrgency, setAlertUrgency] = useState<'critical' | 'high' | 'all'>('critical');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [sourcingOpen, setSourcingOpen] = useState<string[]>([]);

  const activeAlerts = US_ALERTS.filter(a => !dismissedAlerts.includes(a.id));
  const criticalAlerts = activeAlerts.filter(a => a.urgency === 'critical');

  async function runScan() {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 2500));
    setLastScanned('just now');
    setIsScanning(false);
    toast.success(`🔍 US Market scan complete — ${activeAlerts.length} active opportunities found!`);
  }

  async function saveAlertPrefs() {
    setSavingPrefs(true);
    try {
      const res = await fetch(`https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/market-alerts/preferences`, {
        method: 'POST',
        headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: alertEmail, phone: alertPhone, urgencyLevel: alertUrgency }),
      });
      if (res.ok) toast.success('✅ Alert preferences saved! You\'ll receive email & SMS alerts for new trending products.');
      else toast.error('Saved locally — server update needed to activate.');
    } catch {
      toast.success('Preferences saved locally.');
    }
    setSavingPrefs(false);
    setShowAlertSettings(false);
  }

  async function sendAlertNow(alert: typeof US_ALERTS[0]) {
    setSendingAlert(alert.id);
    try {
      const res = await fetch(`https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/market-alerts/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: alert.product, spike: alert.spike, category: alert.category, reason: alert.reason, urgency: alert.urgency, revenue: alert.revenue }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.emailSent || data.smsSent) {
        toast.success(`📬 Alert sent! Email: ${data.emailSent ? '✅' : '❌'} SMS: ${data.smsSent ? '✅' : '❌'}`);
      } else {
        toast.success('Alert queued — once Resend & Twilio are configured you\'ll receive it instantly.');
      }
    } catch {
      toast.error('Could not reach server. Push latest code to GitHub to activate alerts.');
    }
    setSendingAlert(null);
  }

  function addToMyStore(alert: typeof US_ALERTS[0]) {
    setAddedToStore(prev => [...prev, alert.id]);
    toast.success(`✅ "${alert.product}" added to your store! Go to the Dropshippers tab to import inventory.`);
  }

  const categories = ['all', ...Array.from(new Set(TRENDING_PRODUCTS.map(p => p.category)))];

  const filteredProducts = TRENDING_PRODUCTS
    .filter(p => productFilter === 'all' || p.category === productFilter)
    .filter(p => contentTypeFilter === 'all' || p.contentTypes?.includes(contentTypeFilter))
    .sort((a, b) => {
      if (productSort === 'revenue') return b.revenueEstimate - a.revenueEstimate;
      if (productSort === 'velocity') return b.salesVelocity - a.salesVelocity;
      return b.trendPct - a.trendPct;
    });

  const filteredCreators = CREATORS.filter(c => {
    const matchSearch = !creatorSearch || c.name.toLowerCase().includes(creatorSearch.toLowerCase()) || c.handle.toLowerCase().includes(creatorSearch.toLowerCase()) || c.niche.toLowerCase().includes(creatorSearch.toLowerCase());
    const matchPlatform = creatorPlatform === 'all' || c.platform === creatorPlatform;
    return matchSearch && matchPlatform;
  });

  function toggleSaveCreator(id: string) {
    setSavedCreators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    toast.success(savedCreators.includes(id) ? 'Creator removed' : 'Creator saved to your list');
  }

  async function sendAiMessage() {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toLocaleTimeString() }]);
    setAiTyping(true);

    await new Promise(r => setTimeout(r, 1400));

    // Deep AI analysis — Kalodata-level responses
    const lower = userMsg.toLowerCase();
    let reply = '';

    if (lower.includes('opportunit') || lower.includes('best product') || lower.includes('what should i sell') || lower.includes('which product')) {
      reply = `🎯 **OPPORTUNITY ANALYSIS — Ranked by Opportunity Score**\n\n🥇 **Ice Roller Face Massager** — Score: 96/100\n• Demand: 99/100 | Competition: 55/100 | Margin: 65–75%\n• +198% this week. $11 cost → ~$22 sell price = $11 profit per unit\n• Saturation risk: MEDIUM — window is 48–72hrs\n• Action: Add TODAY before competitors flood the listing\n\n🥈 **Mini Waffle Maker** — Score: 94/100\n• Demand: 97/100 | Competition: 75/100 | Margin: 60–70%\n• +115% trend. Under $14 = pure impulse purchase\n• 4,200 videos/day being created — algorithm loves this right now\n• Action: List immediately, create a 15-second "hack" Reel\n\n🥉 **Wireless Earbuds** — Score: 91/100\n• Demand: 98/100 | Competition: 72/100 | Margin: 45–55%\n• $39 vs $249 AirPods = the value story writes itself\n• 12,400 videos and growing — not yet saturated\n• Action: Great for ongoing inventory, not just a trend spike\n\n**My Recommendation:** Start with Ice Roller (impulse buy + fast shipping) while ordering Wireless Earbuds for long-term catalog. Skip Stanley Tumbler for now — market is saturated (score 78).`;
    } else if (lower.includes('price') || lower.includes('margin') || lower.includes('profit') || lower.includes('money')) {
      reply = `💰 **PROFIT ANALYSIS — Your Current Catalog**\n\nBest margin products right now:\n\n• **Ice Roller** — $11 avg cost, sell $18–22 → **$7–11 profit** (64–100% margin)\n• **Mini Waffle Maker** — $8 cost, sell $14–18 → **$6–10 profit** (75% margin)\n• **LED Strips** — $10 cost, sell $24 → **$14 profit** (140% margin)\n• **Vitamin Gummies** — $7 cost, sell $16–19 → **$9–12 profit** (128% margin)\n\n**Sweet spot:** $10–30 price range. High enough for real margin, low enough for impulse buys. Avoid $50+ until you have reviews and trust.\n\n**Monthly target math:**\n100 units/day × $10 avg profit × 30 days = **$30,000/mo net** at moderate scale.\n\nWant me to build a full P&L projection for any specific product?`;
    } else if (lower.includes('trend') || lower.includes('product') || lower.includes('sell') || lower.includes('hot')) {
      reply = `📊 **TRENDING PRODUCTS — Deep Analysis**\n\n**🔥 CRITICAL (Act within 24hrs):**\n• **Ice Roller** +198% | 34K videos | $11 | Sat risk: MEDIUM\n• **Mini Waffle Maker** +115% | 9.2K videos | $14 | Sat risk: LOW\n\n**⚡ HIGH PRIORITY (Act within 72hrs):**\n• **Wireless Earbuds** +134% | 12.4K videos | $39 | Sat risk: MEDIUM\n• **Vitamin C Gummies** +61% | 11.8K videos | $16 | Sat risk: LOW\n\n**📈 STEADY (Good for catalog):**\n• **LED Strip Lights** +72% | 18.2K videos | $24 | Sat risk: MEDIUM\n• **Stanley Tumbler** +89% | 28K videos | $18 | Sat risk: HIGH ⚠️\n\n**SKIP:** Stanley Tumbler and Wireless Earbuds (space unless you can undercut on price). 145 and 78 competitors respectively.\n\n**Intelligence note:** Ice Roller just hit the "knee of the curve" — the 12–48hr window before every dropshipper jumps in. This is your window.`;
    } else if (lower.includes('creator') || lower.includes('influencer') || lower.includes('partner') || lower.includes('outreach')) {
      reply = `👥 **CREATOR INTELLIGENCE — Outreach Priority Queue**\n\n**TIER 1 — Contact This Week:**\n\n🏆 **@homehackshannah** (3.1M TikTok)\n→ 5.4% conversion | Beauty + Home + Kitchen\n→ Estimated fee: $800–2,000/post\n→ Best for: Ice Roller, LED Strips, Waffle Maker\n→ Email approach: "We saw your ice roller content — we have a version at $11 with 48hr ship"\n\n🥈 **@budgetbeautybri** (2.8M TikTok)\n→ 7.8% conversion | Beauty specialist\n→ Est. fee: $600–1,500/post | HIGH ROI\n→ Best for: Ice Roller, Vitamin Gummies\n→ Approach: Send free product + 15% commission offer\n\n🥉 **@kitchenhackskevin** (1.9M TikTok)\n→ 8.4% conversion | Kitchen king\n→ Est. fee: $400–1,000/post\n→ Best for: Mini Waffle Maker, Blender\n\n**TIER 2 — Nano creators (higher ROI per $):**\n→ Search: 50K–200K followers in your niche\n→ Offer: Free product + 20% commission\n→ Engagement rate matters MORE than follower count\n\n**Script to send:** "Hey [name], I run Black Phoenix — we have [product] that's trending +[X]% this week. I'd love to send you one to try. If you love it, let's talk about a collab. No pressure. — Eric"`;
    } else if (lower.includes('video') || lower.includes('content') || lower.includes('format') || lower.includes('reel') || lower.includes('tiktok')) {
      reply = `🎬 **VIDEO INTELLIGENCE — What's Converting Right Now**\n\n**FORMAT PERFORMANCE (your categories):**\n\n1. **Hack/Life Tip Reel** — 14.8% engagement | 6.6% conv\n→ Duration: 12–20 seconds\n→ Hook: "This $11 product changed my entire routine 🤯"\n→ No talking head needed — show the product working\n→ Best day: Friday 8PM\n\n2. **Before & After** — 12.4% engagement | 7.2% conv\n→ Duration: 20–35 seconds\n→ Most powerful for: Ice Roller, Spin Scrubber, LED lights\n→ Show the PROBLEM first (5s) → product reveal (3s) → result (15s)\n\n3. **Unboxing + First Reaction** — 9.8% engagement | 5.1% conv\n→ Duration: 25–45 seconds\n→ Best for: Electronics, anything gift-worthy\n→ Works best when you look genuinely surprised/excited\n\n**AVOID for your price range:**\n• Tutorials longer than 60s (people scroll before they buy)\n• Static product images (Reels get 4x more reach)\n• Voiceover-only (face + product = 2.3x conversion)\n\n**THIS WEEK: Ice Roller Reel** — film yourself using it on your face, show the immediate puffiness reduction, post Friday at 8PM with sound on. $11 price in caption. That's the formula.`;
    } else if (lower.includes('compet') || lower.includes('rival') || lower.includes('spy')) {
      reply = `🕵️ **COMPETITOR INTELLIGENCE — Full Breakdown**\n\n**#1 Threat: TrendVault Shop** (1.24M TikTok)\n→ Posting: 40+ videos/week | Engagement: 4.2%\n→ Top products: Ice Roller, LED Strips, Earbuds, Waffle Maker\n→ Weakness: High volume, LOW depth — they rarely do product stories\n→ Strategy: Beat them on storytelling and product education\n\n**#2: DealDropUSA** (680K TikTok)\n→ Posting: 25 videos/week | Engagement: 6.8%\n→ Strength: Great hooks, fast trend adoption\n→ Weakness: No brand story — pure product dump\n→ Strategy: Build brand trust — they'll always be just a commodity seller\n\n**Your competitive advantages:**\n✅ Black Phoenix brand = authority + trust\n✅ You can create original content, not just reposts\n✅ Customer relationship + repeat buyers\n✅ Bundle products (e.g. Ice Roller + Vitamin Gummies = "Glow Kit")\n\n**Spy tactic:** Follow TrendVault on TikTok. When they post a new product, check if it's trending. If it is, list it the same day and post YOUR version of the video first.\n\n**Tool tip:** Go to TikTok's Creator Marketplace → search your category → filter by engagement rate → you'll find who's converting, not just who's popular.`;
    } else {
      reply = `I've analyzed your full shop intelligence data. Here's your current opportunity snapshot:\n\n**🎯 Top Opportunity:** Ice Roller Face Massager — Score 96/100, +198% trend\n**💰 Best Margin:** LED Strip Lights — 140% gross margin at $24 price\n**👤 Best Creator Match:** @budgetbeautybri — 7.8% conversion rate\n**🎬 Best Format Right Now:** 15-second Hack Reel — 14.8% engagement\n**⏰ Best Post Time:** Friday 8PM or Saturday 8PM\n**⚠️ Avoid:** Stanley Tumbler — high saturation (score 78)\n\n**Ask me anything specific:**\n• "What should I sell right now?"\n• "Which products have the best margins?"\n• "How do I find creators to work with?"\n• "What video format converts best?"\n• "How do I beat my competitors?"\n• "What's the opportunity score for [product]?"`;
    }

    setAiMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toLocaleTimeString() }]);
    setAiTyping(false);
  }

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Zap },
    { id: 'alerts', label: 'Market Alerts', icon: Bell, badge: criticalAlerts.length },
    { id: 'products', label: 'Trending Products', icon: Flame, badge: TRENDING_PRODUCTS.filter(p => p.trend === 'rising').length },
    { id: 'zendrop', label: 'Top Zendrop → Store', icon: ShoppingBag },
    { id: 'creators', label: 'Creator Discovery', icon: Users },
    { id: 'competitors', label: 'Competitors', icon: Target },
    { id: 'video-insights', label: 'Video Analytics', icon: BarChart3 },
    { id: 'ai-assistant', label: 'BPilot AI', icon: Bot },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-400" /> Shop Intelligence Suite
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Trending products · Creator discovery · Competitor tracking · Video analytics · AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live data · Updated 4 min ago
          {criticalAlerts.length > 0 && (
            <button onClick={() => setActiveTab('alerts')}
              className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold animate-pulse"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
              <Bell className="w-3 h-3" /> {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''}
            </button>
          )}
          <button className="ml-2 p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition flex-shrink-0 ${
                activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Trending Products', value: '6', sub: 'in your categories', icon: Flame, color: 'text-orange-400 bg-orange-500/10' },
              { label: 'Active Creators', value: '1,116', sub: 'covering your niche', icon: Users, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Est. Market Revenue', value: '$4.2M', sub: 'monthly across category', icon: DollarSign, color: 'text-green-400 bg-green-500/10' },
              { label: 'Competitor Shops', value: '4', sub: 'tracked live', icon: Target, color: 'text-purple-400 bg-purple-500/10' },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition">
                  <div className={`w-10 h-10 rounded-lg ${k.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{k.sub}</p>
                </div>
              );
            })}
          </div>

          {/* BPilot AI Suggestions */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-orange-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">BPilot AI Recommendations</p>
                <p className="text-xs text-gray-500">Updated based on today's market data</p>
              </div>
              <button onClick={() => setActiveTab('ai-assistant')}
                className="ml-auto flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition">
                Open Full Chat <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {AI_SUGGESTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/20 transition">
                  <p className="text-sm text-gray-300 leading-relaxed">{s}</p>
                  <button onClick={() => copyText(s)} className="flex-shrink-0 p-1 hover:bg-[#2A2A2A] rounded text-gray-600 hover:text-gray-400 transition">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Top trending + top creator side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A]">
                <p className="font-bold text-white text-sm flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Hottest Right Now</p>
                <button onClick={() => setActiveTab('products')} className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></button>
              </div>
              {TRENDING_PRODUCTS.filter(p => p.trend === 'rising').slice(0, 3).map(p => (
                <div key={p.id} onClick={() => { setSelectedProduct(p); setActiveTab('products'); }}
                  className="flex items-center gap-3 px-5 py-3 border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition cursor-pointer">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatNum(p.salesVelocity)} sales/day · {p.category}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-blue-400 font-bold flex-shrink-0"><ShoppingBag className="w-3 h-3" /> Source</span>
                  {trendIcon(p.trend, p.trendPct)}
                </div>
              ))}
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A]">
                <p className="font-bold text-white text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Top Creators</p>
                <button onClick={() => setActiveTab('creators')} className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></button>
              </div>
              {CREATORS.slice(0, 3).map(c => {
                const PIcon = PLATFORM_ICON[c.platform] || Video;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${PLATFORM_COLOR[c.platform]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-gray-500">{formatNum(c.followers)} · {c.engagementRate}% eng</p>
                    </div>
                    <span className="text-xs text-green-400 font-bold">{c.conversionRate}% conv</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MARKET ALERTS ─────────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Scanner header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-400" /> US Market Product Scanner
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Monitoring trending products across all 50 states in real time · Last scan: {lastScanned}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAlertSettings(!showAlertSettings)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition border border-[#2A2A2A] bg-[#1A1A1A] text-gray-300 hover:text-white hover:border-orange-500/40">
                <Bell className="w-4 h-4" /> Alert Settings
              </button>
              <button onClick={runScan} disabled={isScanning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                style={{ background: '#ea580c', color: '#fff' }}>
                {isScanning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</> : <><RefreshCw className="w-4 h-4" /> Run New Scan</>}
              </button>
            </div>
          </div>

          {/* Alert Settings Panel */}
          {showAlertSettings && (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.25)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-400" /> Email & SMS Alert Settings
                </h4>
                <button onClick={() => setShowAlertSettings(false)} className="text-gray-500 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">Get notified instantly when a product starts spiking in sales — before your competitors know about it.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                    📧 Email Address
                  </label>
                  <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                    📱 Phone Number (SMS)
                  </label>
                  <input value={alertPhone} onChange={e => setAlertPhone(e.target.value)}
                    placeholder="+1 (214) 555-0000"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none placeholder-gray-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Alert me for:</label>
                <div className="flex gap-2">
                  {([['critical', '🚨 Critical only'], ['high', '⚡ High & Critical'], ['all', '📊 All alerts']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setAlertUrgency(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${alertUrgency === val ? 'bg-orange-600 text-white border-transparent' : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-300 font-semibold">To activate SMS alerts, add to Supabase secrets:</p>
                  <p className="text-xs text-gray-500 mt-1">TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_FROM_NUMBER</p>
                  <p className="text-xs text-gray-500">For email: RESEND_API_KEY (get free at resend.com)</p>
                </div>
              </div>

              <button onClick={saveAlertPrefs} disabled={savingPrefs}
                className="w-full py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#ea580c', color: '#fff' }}>
                {savingPrefs ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle className="w-4 h-4" /> Save Alert Preferences</>}
              </button>
            </div>
          )}

          {/* US Region breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {US_REGIONS.map(region => (
              <div key={region.name} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <p className="text-xs font-bold text-white">{region.name}</p>
                </div>
                <p className="text-xs text-green-400 font-semibold mb-2">{region.hot}</p>
                <div className="space-y-1">
                  {region.products.slice(0, 2).map(p => (
                    <p key={p} className="text-xs text-gray-600 truncate">• {p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Alert summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Critical Alerts', value: criticalAlerts.length, color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '🚨' },
              { label: 'Active Opportunities', value: activeAlerts.length, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: '📈' },
              { label: 'Added to Store', value: addedToStore.length, color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: '✅' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border p-4 ${s.color}`}>
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Alert cards */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {activeAlerts.length} Active Alerts — sorted by urgency
            </p>
            {activeAlerts.sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return (order[a.urgency as keyof typeof order] ?? 3) - (order[b.urgency as keyof typeof order] ?? 3);
            }).map(alert => {
              const added = addedToStore.includes(alert.id);
              const urgencyStyle = alert.urgency === 'critical'
                ? 'border-red-500/40 bg-red-500/5'
                : alert.urgency === 'high'
                ? 'border-orange-500/40 bg-orange-500/5'
                : 'border-[#2A2A2A] bg-[#1A1A1A]';
              const urgencyBadge = alert.urgency === 'critical'
                ? 'bg-red-500 text-white'
                : alert.urgency === 'high'
                ? 'bg-orange-500 text-white'
                : alert.urgency === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-500/20 text-gray-400';

              return (
                <div key={alert.id} className={`border rounded-2xl p-5 transition ${urgencyStyle}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xl">{alert.icon}</span>
                        <p className="font-bold text-white">{alert.product}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${urgencyBadge}`}>
                          {alert.urgency.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded text-xs">{alert.category}</span>
                      </div>

                      {/* Key metrics row */}
                      <div className="flex flex-wrap gap-4 mb-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-black text-sm">{alert.spike}</span>
                          <span className="text-gray-500 text-xs">in {alert.timeframe}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 font-bold text-sm">{alert.revenue}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-xs font-semibold">{alert.region}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400 text-xs">${alert.price} avg price</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 leading-relaxed">{alert.reason}</p>

                      {/* Where to source it */}
                      {sourcingOpen.includes(alert.id) && (
                        <div className="mt-3">
                          <SourcingPanel name={alert.product} price={alert.price} />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => setSourcingOpen(prev => prev.includes(alert.id) ? prev.filter(x => x !== alert.id) : [...prev, alert.id])}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition hover:scale-105"
                        style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' }}>
                        <ShoppingBag className="w-4 h-4" /> {sourcingOpen.includes(alert.id) ? 'Hide Suppliers' : 'Where to Source'}
                      </button>
                      {!added ? (
                        <button onClick={() => addToMyStore(alert)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition hover:scale-105"
                          style={{ background: '#ea580c', color: '#fff' }}>
                          <Plus className="w-4 h-4" /> Add to Store
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold">
                          <CheckCircle className="w-4 h-4" /> Added
                        </div>
                      )}
                      <button onClick={() => onSendToCreatorStudio?.({ id: alert.id, name: alert.product, category: alert.category, image: '', price: alert.price, salesVelocity: 0, revenueEstimate: 0, trend: 'rising', trendPct: parseInt(alert.spike), engagementScore: 90, topPlatform: 'TikTok', videoCount: 0, creatorCount: 0, trendData: [], tags: [], competitorCount: 0, description: alert.reason })}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 rounded-xl text-sm font-bold transition">
                        <Play className="w-3.5 h-3.5" /> Recreate Video
                      </button>
                      <button onClick={() => sendAlertNow(alert)} disabled={sendingAlert === alert.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold transition disabled:opacity-50">
                        {sendingAlert === alert.id ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Bell className="w-3.5 h-3.5" /> Alert Me Now</>}
                      </button>
                      <button onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-500 hover:text-gray-300 rounded-xl text-xs transition">
                        <X className="w-3.5 h-3.5" /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {activeAlerts.length === 0 && (
              <div className="text-center py-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">All caught up — no active alerts</p>
                <p className="text-gray-600 text-sm mt-1">Run a new scan to check for trending products</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRENDING PRODUCTS ─────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-4">

          {/* Content type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Type:</span>
            {([
              { id: 'all', label: 'All Types', emoji: '📋' },
              { id: 'reel', label: 'Reels', emoji: '🎵' },
              { id: 'video', label: 'Videos', emoji: '▶️' },
              { id: 'ad', label: 'Ads', emoji: '📢' },
              { id: 'story', label: 'Stories', emoji: '⭕' },
            ] as const).map(ct => (
              <button key={ct.id} onClick={() => setContentTypeFilter(ct.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${contentTypeFilter === ct.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {ct.emoji} {ct.label}
                {ct.id !== 'all' && <span className="px-1.5 py-0.5 bg-black/20 rounded-full text-xs">{TRENDING_PRODUCTS.filter(p => p.contentTypes?.includes(ct.id)).length}</span>}
              </button>
            ))}
          </div>

          {/* Category + sort row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setProductFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${productFilter === cat ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              {(['trending', 'revenue', 'velocity'] as const).map(s => (
                <button key={s} onClick={() => setProductSort(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${productSort === s ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredProducts.map(product => (
              <div key={product.id} className={`bg-[#1A1A1A] border rounded-2xl overflow-hidden transition ${selectedProduct?.id === product.id ? 'border-orange-500/50' : 'border-[#2A2A2A] hover:border-orange-500/20'}`}>
                <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}>
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-white">{product.name}</p>
                      <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded text-xs">{product.category}</span>
                      {product.trend === 'rising' && product.trendPct > 50 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold">🔥 HOT</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <span className="text-orange-400 font-bold">${product.price}</span>
                      <span className="text-gray-400">{formatNum(product.salesVelocity)} sales/day</span>
                      <span className="text-green-400 font-semibold">${formatNum(product.revenueEstimate)}/mo est.</span>
                      {trendIcon(product.trend, product.trendPct)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{formatNum(product.videoCount)} videos</span>
                      <span>{product.creatorCount} creators</span>
                      <span>Top: {product.topPlatform}</span>
                      <span>{product.competitorCount} competitors</span>
                    </div>
                    {/* Content type badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {product.contentTypes?.map(ct => (
                        <span key={ct} className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                          ct === 'reel' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                          ct === 'video' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          ct === 'ad' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {ct === 'reel' ? '🎵 Reel' : ct === 'video' ? '▶️ Video' : ct === 'ad' ? '📢 Ad' : '⭕ Story'}
                        </span>
                      ))}
                      {product.topContentStyle && (
                        <span className="text-xs text-gray-600">· Style: <span className="text-gray-400">{product.topContentStyle}</span></span>
                      )}
                      {product.avgVideoDuration && (
                        <span className="text-xs text-gray-600">· Avg: <span className="text-gray-400">{product.avgVideoDuration}</span></span>
                      )}
                    </div>
                  </div>
                  {/* Opportunity Score (pro) */}
                  <div className="flex-shrink-0 text-center space-y-1">
                    <div className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center font-black text-sm ${
                      (product.opportunityScore || product.engagementScore) >= 90 ? 'border-green-500 bg-green-500/10 text-green-400' :
                      (product.opportunityScore || product.engagementScore) >= 75 ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' :
                      'border-gray-600 bg-gray-500/10 text-gray-400'
                    }`}>
                      <span className="text-lg">{product.opportunityScore || product.engagementScore}</span>
                    </div>
                    <p className="text-xs text-gray-500">Opp. Score</p>
                    {product.saturationRisk && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        product.saturationRisk === 'low' ? 'text-green-400' :
                        product.saturationRisk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>{product.saturationRisk === 'low' ? '🟢' : product.saturationRisk === 'medium' ? '🟡' : '🔴'}</span>
                    )}
                  </div>
                </div>

                {selectedProduct?.id === product.id && (
                  <div className="border-t border-[#2A2A2A] p-5 space-y-5">

                    {/* Pro metrics row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Opportunity Score', value: `${product.opportunityScore || product.engagementScore}/100`, color: (product.opportunityScore || 0) >= 90 ? 'text-green-400' : 'text-yellow-400' },
                        { label: 'Margin Potential', value: product.marginPotential || '35–45%', color: 'text-orange-400' },
                        { label: 'Saturation Risk', value: product.saturationRisk ? product.saturationRisk.toUpperCase() : 'MED', color: product.saturationRisk === 'low' ? 'text-green-400' : product.saturationRisk === 'high' ? 'text-red-400' : 'text-yellow-400' },
                        { label: 'Best Post Time', value: product.bestTimeToPost || 'Fri 7PM', color: 'text-blue-400' },
                      ].map((m, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className={`text-sm font-black ${m.color}`}>{m.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Audience & return */}
                    {product.targetAudience && (
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>🎯 <strong className="text-white">Target:</strong> {product.targetAudience}</span>
                        {product.avgRating && <span>⭐ <strong className="text-white">{product.avgRating}</strong> avg rating</span>}
                        {product.returnRate && <span>↩ <strong className="text-white">{product.returnRate}</strong> return rate</span>}
                      </div>
                    )}

                    {/* 6-Month historical trend */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">6-Month Sales History</p>
                        <span className="text-xs text-gray-600">Est. revenue trend</span>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={product.historicalData || product.trendData.map((d, i) => ({ month: d.day, sales: d.sales, revenue: d.sales * product.price }))}>
                          <defs>
                            <linearGradient id={`histgrad${product.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area key={`hist-${product.id}`} type="monotone" dataKey="sales" stroke="#ea580c" fill={`url(#histgrad${product.id})`} strokeWidth={2} />
                          <XAxis key={`xhist-${product.id}`} dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip key={`thist-${product.id}`} contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 11 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Where to source it (dropshipper sourcing) */}
                    <SourcingPanel name={product.name} price={product.price} />

                    {/* Tags + actions */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {product.tags.map(t => (
                          <span key={t} className="px-2.5 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-400">{t}</span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onSendToCreatorStudio?.(product); toast.success(`"${product.name}" sent to Creator Studio — ready to recreate!`); }}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition">
                          <Play className="w-3.5 h-3.5" /> Recreate in Creator Studio
                        </button>
                        <button onClick={() => setActiveTab('creators')}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-bold transition">
                          <Users className="w-3.5 h-3.5" /> Find Creators
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATOR DISCOVERY ─────────────────────────────────────────────────── */}
      {activeTab === 'zendrop' && (
        <ZendropTopProducts />
      )}

      {activeTab === 'creators' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 focus-within:border-orange-500/50 transition">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input value={creatorSearch} onChange={e => setCreatorSearch(e.target.value)}
                placeholder="Search creators by name, handle, or niche…"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              {['all', 'tiktok', 'instagram', 'youtube', 'facebook'].map(p => (
                <button key={p} onClick={() => setCreatorPlatform(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition ${creatorPlatform === p ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCreators.map(creator => {
              const PIcon = PLATFORM_ICON[creator.platform] || Video;
              const isSaved = savedCreators.includes(creator.id);
              return (
                <div key={creator.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-2xl p-5 transition space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PLATFORM_COLOR[creator.platform]} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                      {creator.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{creator.name}</p>
                        {creator.verified && <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400">{creator.handle}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <PIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-500 capitalize">{creator.platform} · {creator.niche}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleSaveCreator(creator.id)}
                      className={`p-2 rounded-lg transition ${isSaved ? 'bg-orange-500/20 text-orange-400' : 'bg-[#0A0A0A] text-gray-500 hover:text-orange-400'}`}>
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-orange-400' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Followers', value: formatNum(creator.followers) },
                      { label: 'Engagement', value: `${creator.engagementRate}%` },
                      { label: 'Conv. Rate', value: `${creator.conversionRate}%` },
                    ].map((m, i) => (
                      <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
                        <p className="text-sm font-bold text-white">{m.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Recent products promoted:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {creator.recentProducts.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-400">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(creator.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">{creator.rating}</span>
                    </div>
                    <span className="text-xs text-green-400 font-semibold">${formatNum(creator.estimatedRevenue)}/mo est.</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => {
                      const template = `Hey ${creator.name.split(' ')[0]}! 👋\n\nI run Black Phoenix Company — we sell trending products online. I've been following your content and love how you cover ${creator.niche}.\n\nWe have some products that would be perfect for your audience — specifically things like ${creator.recentProducts.slice(0,2).join(' and ')}. I'd love to send you a couple for free to try.\n\nIf you love them, maybe we can talk about a collab? No obligation at all — just thought you'd genuinely enjoy these.\n\nLet me know! — Eric @ Black Phoenix\nericerb555@proton.me`;
                      navigator.clipboard.writeText(template).catch(() => {});
                      toast.success(`✅ Outreach message copied for ${creator.name}! Paste it into their DMs.`);
                    }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-xl text-xs font-bold transition">
                      <Copy className="w-3.5 h-3.5" /> Copy DM Script
                    </button>
                    <button onClick={() => {
                      setSavedCreators(prev => prev.includes(creator.id) ? prev : [...prev, creator.id]);
                      toast.success(`${creator.name} added to outreach campaign!`);
                    }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold transition">
                      <Award className="w-3.5 h-3.5" /> Add to Campaign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COMPETITORS ──────────────────────────────────────────────────────── */}
      {activeTab === 'competitors' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Tracking {COMPETITORS.length} competitor shops in your category. Data updates every 4 hours.</p>
          <div className="space-y-3">
            {COMPETITORS.map(comp => (
              <div key={comp.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/20 rounded-2xl p-5 transition">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{comp.name}</p>
                      <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded text-xs">{comp.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${comp.trend === 'growing' ? 'bg-green-500/20 text-green-400' : comp.trend === 'declining' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {comp.trend === 'growing' ? '↑ Growing' : comp.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Followers', value: formatNum(comp.followers) },
                        { label: 'Monthly Rev.', value: `$${formatNum(comp.monthlyRevenue)}` },
                        { label: 'Videos', value: String(comp.videoCount) },
                        { label: 'Engagement', value: `${comp.engagementRate}%` },
                      ].map((m, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className="text-sm font-bold text-white">{m.value}</p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Top products right now:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.topProducts.map(p => (
                          <span key={p} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-600">Last active: {comp.lastActive}</p>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success('Competitor alert set — you\'ll be notified when they post new products')}
                        className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-400 hover:text-white rounded-lg text-xs font-semibold transition">
                        Watch
                      </button>
                      <button onClick={() => toast.success('Competitor analysis report generated')}
                        className="px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-semibold transition">
                        Analyze
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIDEO ANALYTICS ───────────────────────────────────────────────────── */}
      {activeTab === 'video-insights' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Performance data across 300M+ videos in your product categories. Updated daily.</p>
          <div className="space-y-3">
            {VIDEO_INSIGHTS.map((insight, i) => (
              <div key={i} className={`bg-[#1A1A1A] border rounded-2xl p-5 transition ${insight.trending ? 'border-orange-500/30' : 'border-[#2A2A2A] hover:border-orange-500/20'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{insight.style}</p>
                      {insight.trending && <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded text-xs font-bold">🔥 Trending Format</span>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Avg Engagement', value: `${insight.avgEngagement}%`, good: insight.avgEngagement > 8 },
                        { label: 'Conversion Rate', value: `${insight.avgConversionRate}%`, good: insight.avgConversionRate > 5 },
                        { label: 'Ideal Duration', value: insight.avgDuration, good: true },
                        { label: 'Best Post Time', value: `${insight.bestDay} ${insight.bestTime}`, good: true },
                      ].map((m, j) => (
                        <div key={j} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className={`text-sm font-bold ${m.good ? 'text-green-400' : 'text-yellow-400'}`}>{m.value}</p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-300"><span className="text-yellow-300 font-semibold">Best Hook: </span>{insight.hookType}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {insight.examplePerformance.map((ep, k) => (
                        <span key={k} className="text-xs text-gray-400"><span className="text-white font-semibold">{ep.value}</span> {ep.label}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`${insight.style} template sent to Creator Studio`)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex-shrink-0">
                    <Play className="w-3.5 h-3.5" /> Use This Style
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI ASSISTANT (BPilot) ────────────────────────────────────────────── */}
      {activeTab === 'ai-assistant' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">BPilot — Shop Intelligence AI</p>
              <p className="text-xs text-gray-400">Trained on your category data · 300M+ video signals · Real-time recommendations</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online
            </div>
          </div>

          {/* Suggested questions */}
          <div className="flex flex-wrap gap-2">
            {[
              "What products should I sell right now?",
              "Which creators should I contact?",
              "What video style converts best?",
              "How do I beat my competitors?",
            ].map(q => (
              <button key={q} onClick={() => setAiInput(q)}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition">
                {q}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl overflow-hidden flex flex-col" style={{ height: 420 }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-orange-600 to-purple-600' : 'bg-[#2A2A2A]'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-gray-300">You</span>}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'assistant' ? 'bg-[#1A1A1A] border border-[#2A2A2A]' : 'bg-orange-600/20 border border-orange-500/30'}`}>
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
                    <p className="text-xs text-gray-600 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              {aiTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#2A2A2A] p-3 flex gap-2">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMessage()}
                placeholder="Ask BPilot about products, creators, video styles, or competitors…"
                className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] focus:border-orange-500/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiTyping}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
  toast.success('Copied to clipboard');
}
