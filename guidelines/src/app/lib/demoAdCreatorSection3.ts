/**
 * Demo Ad Creator - Section 3 (Ads 13-18)
 */

import { companyInfo } from './config/companyInfo';
import type { DemoAd } from './demoAdCreator';

// Section 3: Next 6 Ads (13-18)
export const createDemoAdsSection3 = (): DemoAd[] => {
  return [
    // 13. Email Marketing Campaign
    {
      title: 'Email Marketing Campaign - Seasonal Promotion',
      featured_image_url: 'https://images.unsplash.com/photo-1543269866-487350d6fa5e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbWFpbCUyMG5ld3NsZXR0ZXIlMjBsYXB0b3AlMjBjb21wdXRlcnxlbnwxfHx8fDE3NzMwMjMxMjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📧 EMAIL MARKETING CAMPAIGN - "Spring Renovation Inspiration"

Complete email newsletter with before/after visuals, testimonials, special offers, and multiple CTAs. Includes subject line variations, segmentation strategies, automation workflows, and deliverability best practices. Optimized for high open rates (20-30%), click-through rates (2-5%), and conversion rates (1-3%).`,
      content_format: 'email_campaign',
      excerpt: 'Comprehensive email marketing campaign with before/after visuals, customer testimonials, special offers, and multiple CTAs.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Email Newsletter',
        platform: ['Email Marketing'],
        format: 'HTML email with responsive design',
        target_audience: 'Email subscribers, past customers, website visitors',
        campaign_objective: 'Lead Generation & Customer Retention'
      }
    },

    // 14. SMS Marketing Campaign
    {
      title: 'SMS Marketing Campaign - Flash Sale Alert',
      featured_image_url: 'https://images.unsplash.com/photo-1565268875043-9088a9d08308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBwaG9uZSUyMHRleHQlMjBtZXNzYWdlJTIwbm90aWZpY2F0aW9ufGVufDF8fHx8MTc3MzAyMzEyMXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📱 SMS MARKETING - "Flash Sale Alert"

Hi [Name]! 🏠 FLASH SALE: 25% OFF all kitchen projects for 24hrs only! Book today: ${companyInfo.contact.phone} or reply YES for details. -${companyInfo.name}

Includes 8 SMS templates, 3 MMS templates, TCPA compliance guidelines, automation workflows, segmentation strategies, and two-way conversation management. SMS open rate: 98%, CTR: 15-25%, conversion rate: 5-10%.`,
      content_format: 'sms_campaign',
      excerpt: 'SMS/text message marketing with multiple templates, compliance guidelines, automation workflows, and two-way strategies.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'SMS Campaign',
        platform: ['SMS/Text Messaging'],
        format: 'Short text messages (160 characters) with optional MMS',
        target_audience: 'Mobile subscribers, time-sensitive leads',
        campaign_objective: 'Immediate Response & Appointment Booking'
      }
    },

    // 15. Podcast Sponsorship
    {
      title: 'Podcast Sponsorship - Home Improvement Show',
      featured_image_url: 'https://images.unsplash.com/photo-1627667050609-d4ba6483a368?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2RjYXN0JTIwcmVjb3JkaW5nJTIwc3R1ZGlvJTIwbWljcm9waG9uZXxlbnwxfHx8fDE3NzI5ODI2OTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🎙️ PODCAST SPONSORSHIP - Host-Read Script

"Before we dive in, I want to tell you about a contractor who actually gets it right—${companyInfo.name} right here in ${companyInfo.address.city}.

They've been serving our area for over 20 years. Licensed, insured, and they show up when they say they will. Revolutionary, I know.

Whether it's a kitchen remodel, bathroom renovation, or complete home transformation, they handle it all with free consultations and no pressure.

Right now, listeners of this show get 20% off their first project. Call ${companyInfo.contact.phone} or visit ${companyInfo.contact.website} and mention this podcast.

Trust me, you'll thank me later."

Includes 30s and 60s host-read scripts, storytelling approach, podcast selection criteria, placement strategies (pre-roll, mid-roll, post-roll), and tracking attribution methods.`,
      content_format: 'podcast_sponsorship',
      excerpt: 'Host-read podcast sponsorship scripts (30s and 60s) with storytelling approach, placement strategies, and tracking methods.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Podcast Sponsorship',
        platform: ['Podcast'],
        duration: '30-60 seconds',
        format: 'Host-read audio script',
        target_audience: 'Podcast listeners interested in home improvement, ages 30-60',
        campaign_objective: 'Brand Awareness & Lead Generation'
      }
    },

    // 16. Streaming Audio Ad
    {
      title: 'Streaming Audio Ad - Spotify/Pandora',
      featured_image_url: 'https://images.unsplash.com/photo-1496957961599-e35b69ef5d7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG90aWZ5JTIwbXVzaWMlMjBzdHJlYW1pbmclMjBoZWFkcGhvbmVzfGVufDF8fHx8MTc3Mjk2MTAzMXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🎵 STREAMING AUDIO AD - 30-Second Spot

[SOUND EFFECT: Construction sounds transition to calm music]

"Tired of living with that outdated kitchen? Or that bathroom that's seen better days?

${companyInfo.name} has been transforming homes in ${companyInfo.address.city} for over 20 years. We're not just contractors—we're your neighbors, and we treat your home like our own.

From kitchens to bathrooms to whole-home renovations, we handle it all. Licensed, insured, and backed by hundreds of five-star reviews.

Ready for a change? Visit ${companyInfo.contact.website} for your FREE consultation, or call ${companyInfo.contact.phone}.

${companyInfo.name}—where quality meets community."

Includes 15s and 30s audio scripts, companion display ad (640x640px), targeting strategies for Spotify/Pandora/iHeartRadio, voice talent selection, audio production specs, and platform comparison. Target CPM: $15-35.`,
      content_format: 'streaming_audio_ad',
      excerpt: 'Professional streaming audio ad scripts (15s and 30s) for Spotify, Pandora with companion display specs and targeting strategies.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Streaming Audio Ad',
        platform: ['Spotify', 'Pandora', 'iHeartRadio'],
        duration: '15 or 30 seconds',
        format: 'Audio spot with companion display ad',
        target_audience: 'Music streamers, ages 28-65, homeowners',
        campaign_objective: 'Brand Awareness & Website Traffic'
      }
    },

    // 17. Connected TV/OTT Ad
    {
      title: 'Connected TV/OTT Ad - Streaming Services',
      featured_image_url: 'https://images.unsplash.com/photo-1613280194169-6bb2f32a6bfa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMHR2JTIwbGl2aW5nJTIwcm9vbSUyMG1vZGVybnxlbnwxfHx8fDE3NzI5NjEwNjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📺 CONNECTED TV (CTV) AD - 30-Second Video

VISUAL STORYBOARD:
[0-3s] BEFORE: Dated, cramped kitchen (split-screen)
[3-6s] AFTER: Stunning modern kitchen (smooth transition)
[6-10s] Team working montage with text: "${companyInfo.name} | 20+ Years"
[10-16s] Three quick "after" shots: Kitchen, Bathroom, Living Space
[16-21s] Customer testimonial: ⭐⭐⭐⭐⭐ "500+ Five-Star Reviews"
[21-28s] End card with QR code, phone ${companyInfo.contact.phone}, website ${companyInfo.contact.website}
[28-30s] Logo + voiceover tag: "${companyInfo.name}—where quality meets community"

Non-skippable video for Hulu, Roku, Fire TV, YouTube TV. Includes 15s and 30s versions, QR code integration, closed captions, targeting strategies, and production specs (1920x1080 HD, -24 LUFS). Target CPM: $20-65.`,
      content_format: 'ctv_ott_ad',
      excerpt: '15 and 30-second non-skippable video ads for Connected TV platforms (Hulu, Roku, Fire TV) with QR code integration.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Connected TV/OTT Ad',
        platform: ['Hulu', 'Roku', 'Fire TV', 'YouTube TV'],
        dimensions: '1920x1080 (16:9 HD)',
        duration: '15 or 30 seconds',
        format: 'Non-skippable video with QR code CTA',
        target_audience: 'Streaming TV viewers, homeowners 30-65',
        campaign_objective: 'Brand Awareness & Lead Generation'
      }
    },

    // 18. Programmatic Display Ad
    {
      title: 'Programmatic Display - Retargeting Campaign',
      featured_image_url: 'https://images.unsplash.com/photo-1762618289767-40da56ec7612?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwYWR2ZXJ0aXNpbmclMjBkaXNwbGF5JTIwbmV0d29ya3xlbnwxfHx8fDE3NzMwMjMxMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🎯 PROGRAMMATIC DISPLAY - Retargeting Campaign

RESPONSIVE DISPLAY AD ASSETS:

Headlines (30 chars):
• "Transform Your Home Today"
• "${companyInfo.address.city}'s #1 Contractors"
• "20% Off All Renovations"
• "Free Design Consultation"

Long Headlines (90 chars):
• "Professional Home Renovations by ${companyInfo.name} - Licensed & Insured"
• "Kitchen & Bathroom Remodeling Experts Serving ${companyInfo.address.city} for 20+ Years"

Descriptions (90 chars):
• "Expert renovations from design to completion. Call ${companyInfo.contact.phone} for free quote!"
• "Licensed contractors with 20+ years experience. Serving ${companyInfo.address.city} homeowners."

RETARGETING TIERS:
• Tier 1 (Hot): Visited quote page, +150% bid, 5-8 impressions/day
• Tier 2 (Warm): Viewed portfolio, +100% bid, 3-5 impressions/day  
• Tier 3 (Cold): Homepage only, baseline bid, 1-3 impressions/day

STANDARD AD SIZES: 300x250, 728x90, 336x280, 160x600, 300x600, 320x50

Includes dynamic creative optimization (DCO), sequential retargeting, competitive conquesting, weather targeting, and platform comparison (GDN, Trade Desk, StackAdapt, AdRoll). Target CPM: $1-10, CPC: $0.50-$3.00.`,
      content_format: 'programmatic_display',
      excerpt: 'Comprehensive programmatic display campaign with retargeting strategies, multiple ad sizes, dynamic creative optimization, and detailed targeting.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Programmatic Display',
        platform: ['Google Display Network', 'The Trade Desk', 'StackAdapt', 'AdRoll'],
        dimensions: 'Multiple sizes (responsive + standard)',
        format: 'Responsive and static display ads with retargeting',
        target_audience: 'Website visitors, prospecting audiences, lookalikes',
        campaign_objective: 'Conversion Optimization & Retargeting'
      }
    }
  ];
};
