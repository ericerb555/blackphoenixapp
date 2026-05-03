/**
 * Demo Ad Creator - Pre-populates various ad types for demonstration
 */

import { companyInfo } from './config/companyInfo';

export interface DemoAd {
  title: string;
  content_body: string;
  content_format: string;
  excerpt: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
  is_ai_generated: boolean;
  featured_image_url?: string;
  ai_generation_metadata: {
    ad_type: string;
    platform: string[];
    dimensions?: string;
    duration?: string;
    format: string;
    target_audience: string;
    campaign_objective: string;
  };
}

// Section 1: First 6 Ads
export const createDemoAdsSection1 = (): DemoAd[] => {
  return [
    // 1. Facebook/Instagram Carousel Ad
    {
      title: 'Facebook/Instagram Carousel Ad - Spring Home Renovation Sale',
      featured_image_url: 'https://images.unsplash.com/photo-1579618217299-92460380cf99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwcmVub3ZhdGlvbiUyMGJlZm9yZSUyMGFmdGVyfGVufDF8fHx8MTc3MzAxNjk2OXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🏠 TRANSFORM YOUR SPACE THIS SPRING! 🌸

📸 SLIDE 1: Before & After Kitchen Transformation
Headline: "Dream Kitchens Start Here"
Body: See how ${companyInfo.name} turned this dated kitchen into a modern masterpiece! Quality craftsmanship you can trust.

📸 SLIDE 2: Bathroom Renovation Showcase
Headline: "Luxury Bathrooms, Affordable Prices"
Body: Spa-like retreats designed and built by our expert team. Your sanctuary awaits!

📸 SLIDE 3: Living Room Makeover
Headline: "Living Spaces That Wow"
Body: From concept to completion, we bring your vision to life with precision and care.

📸 SLIDE 4: Special Spring Offer
Headline: "LIMITED TIME: 20% OFF Consultations!"
Body: Book your FREE consultation this month and save 20% on your project!

🎯 CALL TO ACTION:
"Get Your Free Quote Today! 👉"

📞 ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}
📍 Serving ${companyInfo.address.city}, ${companyInfo.address.state}

---
CAROUSEL SPECS:
• Format: 4-card carousel
• Image Size: 1080x1080px per card
• Primary Text: 125 characters max
• Headline: 40 characters per card
• Link Description: 30 characters
• Platforms: Facebook Feed, Instagram Feed
• Placement: Feed, Stories (auto-optimized)
• Campaign Objective: Lead Generation
• Target Audience: Homeowners 30-65, ${companyInfo.address.city} area, Interested in home improvement

---
PERFORMANCE OPTIMIZATION:
✅ Each card tells a story
✅ Strong visual progression
✅ Clear value proposition
✅ Urgency with limited-time offer
✅ Multiple CTAs for engagement
✅ Local targeting for relevance

#HomeRenovation #${companyInfo.address.city}Contractors #QualityWork #SpringSale #BeforeAndAfter`,
      content_format: 'ad_carousel',
      excerpt: 'Multi-card carousel ad showcasing before/after transformations with limited-time spring offer. Optimized for Facebook & Instagram feeds.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Carousel Ad',
        platform: ['Facebook', 'Instagram'],
        dimensions: '1080x1080px per card',
        format: '4-card carousel with images and text',
        target_audience: 'Homeowners 30-65, local area',
        campaign_objective: 'Lead Generation & Brand Awareness'
      }
    },

    // 2. LinkedIn Sponsored Content Ad
    {
      title: 'LinkedIn Sponsored Content - B2B Commercial Services',
      featured_image_url: 'https://images.unsplash.com/photo-1758813240178-19ef760ded2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tZXJjaWFsJTIwb2ZmaWNlJTIwYnVpbGRpbmclMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzczMDE2OTY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🏢 ELEVATE YOUR COMMERCIAL SPACE WITH PROFESSIONAL EXPERTISE

In today's competitive business landscape, your physical space makes a powerful statement about your brand.

${companyInfo.name} specializes in commercial construction and renovation projects that:

✅ Enhance workplace productivity and employee satisfaction
✅ Impress clients and partners with professional aesthetics
✅ Maximize space utilization and operational efficiency
✅ Meet all regulatory compliance and safety standards
✅ Deliver on-time, on-budget results with minimal disruption

---
OUR COMMERCIAL SERVICES:

🏗️ Office Renovations & Buildouts
• Open-concept designs
• Private offices and conference rooms
• Break rooms and collaborative spaces
• Technology infrastructure integration

🏪 Retail & Restaurant Spaces
• Custom fixtures and displays
• Kitchen and service area construction
• Customer-facing environments
• ADA compliance solutions

🏭 Industrial & Warehouse Facilities
• Structural improvements
• Loading dock renovations
• Safety compliance upgrades
• Efficient workflow layouts

---
WHY BUSINESSES CHOOSE ${companyInfo.name.toUpperCase()}:

📊 20+ Years of Commercial Experience
📋 Licensed, Bonded & Fully Insured
⭐ 4.9/5 Client Satisfaction Rating
🏆 Award-Winning Project Portfolio
💼 Dedicated Project Managers
📅 Flexible Scheduling to Minimize Disruption
💰 Competitive Pricing & Transparent Quotes

---
"${companyInfo.name} transformed our outdated office into a modern, collaborative workspace that our employees love. The project was completed on schedule with zero disruption to our operations." 
— Sarah Mitchell, Operations Director, TechCore Solutions

---
📞 SCHEDULE YOUR COMMERCIAL CONSULTATION

Let's discuss how we can transform your commercial space to support your business goals.

Contact: ${companyInfo.contact.phone}
Email: ${companyInfo.contact.email}
Website: ${companyInfo.contact.website}

${companyInfo.legalName}
${companyInfo.address.line1}
${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}
${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}

---
LINKEDIN AD SPECS:
• Format: Single Image + Text
• Image Size: 1200x627px (1.91:1 ratio)
• Headline: 70 characters max
• Intro Text: 150 characters for feed preview
• Description: 100 characters
• Platform: LinkedIn Feed
• Campaign Objective: B2B Lead Generation
• Target Audience: Business Owners, Facility Managers, C-Suite Executives, Property Managers
• Industries: Real Estate, Retail, Professional Services, Manufacturing
• Company Size: 10-500 employees
• Geographic: ${companyInfo.address.city} metro area

#CommercialConstruction #OfficeRenovation #B2BServices #CommercialContractor #BusinessImprovement`,
      content_format: 'ad_linkedin_sponsored',
      excerpt: 'Professional B2B LinkedIn ad targeting business decision-makers for commercial construction and renovation services.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Sponsored Content',
        platform: ['LinkedIn'],
        dimensions: '1200x627px',
        format: 'Single image with professional copy',
        target_audience: 'B2B decision-makers, facility managers, executives',
        campaign_objective: 'B2B Lead Generation'
      }
    },

    // 3. Twitter Promoted Tweet Ad
    {
      title: 'Twitter Promoted Tweet - Quick Response Service',
      featured_image_url: 'https://images.unsplash.com/photo-1567238563567-b99d8ac66e9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBjb250cmFjdG9yJTIwd29ya2luZyUyMHRvb2xzfGVufDF8fHx8MTc3MzAxNjk2OXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🚨 NEED IT DONE NOW? WE'RE ON IT! ⚡

${companyInfo.name} offers:
✅ Same-day consultations
✅ Emergency repair services
✅ Fast, reliable solutions
✅ Licensed & insured pros

📞 Call now: ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}

#${companyInfo.address.city}Contractors #EmergencyService #HomeRepair #FastService

---
TWITTER AD VARIATION 1 (Character Count: 267)
Perfect for promoting urgency and immediate response!

---

💡 Transform Your Space Without the Wait! 💡

From concept to completion:
⚡ Free quotes in 24hrs
🏗️ Expert craftsmanship
📅 Flexible scheduling
💯 Satisfaction guaranteed

Ready to start? ${companyInfo.contact.phone}

${companyInfo.address.city} | ${companyInfo.address.state}

#HomeImprovement #Construction #Renovation #LocalBusiness

---
TWITTER AD VARIATION 2 (Character Count: 258)
Focus on quality and trust!

---

🏆 AWARD-WINNING QUALITY 🏆

Why choose ${companyInfo.name}?
✨ 20+ years experience
✨ Licensed & bonded
✨ 5-star rated
✨ Fair, upfront pricing

Get your FREE consultation! 👉
${companyInfo.contact.website}

#QualityWork #TrustedContractor #HomeRenovation

---
TWITTER AD SPECS:
• Format: Tweet with image/video
• Text: 280 characters max (variations: 250-275 for optimal display)
• Image Size: 1200x675px (16:9) or 1080x1080px (1:1)
• Video: Up to 2:20 minutes (recommended: 15-30 seconds)
• Hashtags: 2-3 relevant hashtags maximum
• Platform: Twitter Feed, Search Results
• Campaign Objective: Website Clicks & Conversions
• Target Audience: Local homeowners, active Twitter users 25-55
• Geographic: ${companyInfo.address.city} and surrounding areas, 25-mile radius
• Interests: Home improvement, DIY, real estate, interior design

---
BEST PRACTICES APPLIED:
✅ Multiple variations for A/B testing
✅ Strong visual emoji use for attention
✅ Clear, concise messaging
✅ Direct call-to-action with contact info
✅ Local hashtags for discovery
✅ Mobile-optimized formatting
✅ Urgency and value propositions
✅ Under character limit for better display

#TwitterAds #SocialMediaMarketing #LocalAdvertising #ServiceBusiness`,
      content_format: 'ad_twitter_promoted',
      excerpt: 'Short, punchy Twitter promoted tweets with multiple variations for A/B testing. Emphasizes quick response and local service.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Promoted Tweet',
        platform: ['Twitter'],
        dimensions: '1200x675px or 1080x1080px',
        format: 'Text + Image with 3 variations',
        target_audience: 'Local homeowners 25-55, active social media users',
        campaign_objective: 'Website Traffic & Conversions'
      }
    },

    // 4. Instagram Story Ad
    {
      title: 'Instagram Story Ad - Before/After Transformation',
      featured_image_url: 'https://images.unsplash.com/photo-1735538497321-fcdb11d4b9f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHRyYW5zZm9ybWF0aW9uJTIwbW9kZXJufGVufDF8fHx8MTc3MzAxNjk3MHww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📱 INSTAGRAM STORY AD SEQUENCE (Full-Screen Vertical)

---
STORY FRAME 1 (0-2 seconds)
Visual: Eye-catching "before" photo with dramatic overlay
Text Overlay: "😱 BEFORE"
Bottom Text: "Swipe up to see the transformation"
Background: Dark gradient overlay for text contrast

---
STORY FRAME 2 (2-4 seconds)
Visual: Stunning "after" photo - same angle as before
Text Overlay: "✨ AFTER ✨"
Bottom Text: "${companyInfo.name} Magic"
Sticker: Poll sticker "Would you transform your space?" Yes/No

---
STORY FRAME 3 (4-7 seconds)
Visual: Behind-the-scenes team photo or work in progress
Text Overlays:
Top: "💪 Expert Team"
Middle: "🏗️ Professional Work"
Bottom: "✅ Guaranteed Results"
Animation: Text fades in one by one

---
STORY FRAME 4 (7-10 seconds)
Visual: Company branding with service highlights
Text Layout:
Header: "${companyInfo.name}"
Bullets:
• Free Consultations
• Licensed & Insured
• Local ${companyInfo.address.city} Team
• Same-Week Starts Available

Icon Row: Phone, Email, Location emojis
Background: Branded colors with subtle pattern

---
STORY FRAME 5 - FINAL CTA (10-15 seconds)
Visual: Compelling finished project photo
Text Overlays:
Top: "🎯 SPRING SPECIAL"
Middle Large Text: "20% OFF"
Subtext: "First-time customers"
Bottom CTA: "SWIPE UP TO CLAIM" (with up arrow animation)

Swipe-Up Link: ${companyInfo.contact.website}/spring-special
Phone Sticker: ${companyInfo.contact.phone} (tappable)

---
INTERACTIVE ELEMENTS:
✅ Poll Sticker on Frame 2 (boosts engagement)
✅ Question Sticker option: "What room should we transform next?"
✅ Countdown Sticker: "Spring sale ends in..."
✅ Location Tag: ${companyInfo.address.city}, ${companyInfo.address.state}
✅ @mention sticker for company account
✅ Hashtag Stickers: #HomeReno #BeforeAndAfter

---
INSTAGRAM STORY AD SPECS:
• Format: Full-screen vertical video or image carousel
• Dimensions: 1080x1920px (9:16 aspect ratio)
• Duration: 15 seconds max (5 frames x 3 seconds each)
• File Size: Max 30MB for images, 4GB for video
• File Type: JPG, PNG, MP4, MOV
• Platform: Instagram Stories
• Campaign Objective: Traffic (Swipe-ups) or Conversions
• Target Audience: 
  - Age: 25-50
  - Gender: All
  - Location: ${companyInfo.address.city} + 30 mile radius
  - Interests: Home decor, interior design, home improvement, HGTV, DIY projects
  - Behaviors: Homeowners, recently moved, engaged shoppers

---
STORY FLOW STRATEGY:
1️⃣ Hook with dramatic before/after (Frames 1-2)
2️⃣ Build credibility with team/process (Frame 3)
3️⃣ Present value proposition (Frame 4)
4️⃣ Drive action with limited offer (Frame 5)

---
ADVANCED FEATURES:
🎬 Video Version: 15-second time-lapse of transformation
🎵 Audio: Upbeat, trending Instagram music
📊 A/B Test Variables:
   - Different before/after combinations
   - Discount amounts (20% vs $500 off)
   - Different CTAs (Book Now vs Get Quote vs Learn More)
   
#InstagramStories #InstagramAds #VisualMarketing #BeforeAndAfter #HomeTransformation`,
      content_format: 'ad_instagram_story',
      excerpt: 'Full-screen vertical Instagram Story ad with 5-frame sequence, interactive elements, and swipe-up CTA. Optimized for mobile viewing.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Story Ad',
        platform: ['Instagram'],
        dimensions: '1080x1920px (9:16)',
        duration: '15 seconds',
        format: '5-frame story sequence with interactive stickers',
        target_audience: 'Homeowners 25-50, design enthusiasts',
        campaign_objective: 'Traffic & Conversions via Swipe-Up'
      }
    },

    // 5. TikTok Video Ad
    {
      title: 'TikTok Video Ad - Trending Format Renovation',
      featured_image_url: 'https://images.unsplash.com/photo-1689307127721-bc2da981b5a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMHRpbWUlMjBsYXBzZXxlbnwxfHx8fDE3NzMwMTY5NzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🎵 TIKTOK VIDEO AD SCRIPT - "Renovation Reveal Trend"

---
FORMAT: Trending "Wait for it..." transformation video
DURATION: 15 seconds
MUSIC: Trending TikTok audio (upbeat reveal sound)
HOOK: First 3 seconds critical!

---
📹 SECOND-BY-SECOND BREAKDOWN:

⏱️ SECONDS 0-2: THE HOOK
Visual: Quick pan across dated, messy "before" space
Text Overlay: "POV: You called ${companyInfo.name} 😏"
Camera Movement: Shaky, authentic phone footage style
Trend: Uses popular "POV" format

⏱️ SECONDS 2-4: BUILD TENSION
Visual: Quick cuts of work in progress (fast-motion)
Text Overlay: "They said it couldn't be done... 👀"
Clips: Demolition, team working, materials
Effect: Speed ramp for dramatic effect

⏱️ SECONDS 4-7: TEAM MOMENT
Visual: Quick team fist bump or tool handoff
Text Overlay: "Our team is different 💪"
Style: Authentic, behind-the-scenes feel
Branding: Worker wearing ${companyInfo.name} shirt visible

⏱️ SECONDS 7-10: THE TRANSITION
Visual: Smooth wipe/transition effect
Text Overlay: "Wait for it... ✨"
Effect: Popular swipe transition matching beat drop
Building anticipation for reveal

⏱️ SECONDS 10-15: THE REVEAL & CTA
Visual: Stunning "after" shot with slow camera pan
Text Overlays (rapid sequence):
- "🤯 OBSESSED"
- "✅ ${companyInfo.address.city}'s Best"
- "📞 ${companyInfo.contact.phone}"
- "Link in bio! 👆"

Final Frame: Company logo + "Follow for more transformations!"

---
🎬 ALTERNATIVE VIDEO CONCEPTS:

CONCEPT 2: "Day in the Life of a Contractor"
• Behind-the-scenes authentic content
• "Get ready with me" contractor edition
• Shows tools, trucks, job sites
• Ends with finished project reveal
Duration: 15-30 seconds

CONCEPT 3: "Homeowner Reaction"
• Capture genuine client reaction to finished work
• Emotional, authentic moment
• Client testimonial integrated naturally
• "This is why we do what we do" messaging
Duration: 15-20 seconds

CONCEPT 4: "Time-Lapse Trend"
• Full renovation in 15 seconds
• Popular time-lapse format
• Satisfying to watch start-to-finish
• Text overlay with project details
Duration: 15 seconds

---
ON-SCREEN TEXT STRATEGY:
✅ Large, bold, easy-to-read fonts
✅ High contrast for mobile viewing
✅ Captions for sound-off viewing
✅ Emoji use for attention and emotion
✅ Text appears in safe zone (center)
✅ Brand name appears multiple times

---
HASHTAG STRATEGY:
Primary: #HomeRenovation #BeforeAndAfter #Construction
Trending: #Satisfying #Transformation #HomeTok
Local: #${companyInfo.address.city}TikTok #Local${companyInfo.address.state}
Niche: #ContractorLife #RenovationTok #HomeMakeover

Total: 8-10 hashtags mix (trending + niche + local)

---
TIKTOK AD SPECS:
• Format: In-Feed Video Ad
• Dimensions: 1080x1920px (9:16) or 1080x1080px (1:1)
• Duration: 5-60 seconds (15 seconds optimal)
• File Size: Max 500MB
• File Format: .mp4, .mov, .mpeg, .avi, .webm
• Platform: TikTok For You Page, Following Feed
• Campaign Objective: Traffic, Conversions, App Installs
• Sound: Required - use trending audio for better reach

---
TARGET AUDIENCE:
• Age: 25-45 (TikTok's homeowner demographic)
• Gender: All
• Location: ${companyInfo.address.city} metro + 50 mile radius
• Interests: 
  - Home improvement
  - DIY & crafts
  - Interior design
  - HGTV-style content
  - Before/after content
• Behaviors:
  - High TikTok engagement
  - Video content consumers
  - Home renovation browsers
  - SavedTok users (save for later)

---
ENGAGEMENT TACTICS:
💬 Pin Top Comment: "Where are you watching from? 👇 We serve ${companyInfo.address.city}!"
🔗 Link Sticker: Direct to booking page
📊 Spark Ads: Boost high-performing organic content
🎯 Promote User-Generated Content: Encourage clients to post their own reveals

---
POSTING STRATEGY:
⏰ Best Times: 6-9 AM, 12-2 PM, 7-11 PM EST
📅 Frequency: 2-3 TikToks per week
🔄 Content Mix: 70% educational/entertaining, 30% promotional
📈 Analytics: Track watch time, completion rate, shares

#TikTokAds #TikTokMarketing #VideoAds #HomeRenovationTikTok #ContractorTikTok #BeforeAndAfterTikTok`,
      content_format: 'ad_tiktok_video',
      excerpt: 'Trending-format TikTok video ad with 15-second transformation reveal. Includes multiple video concepts and engagement strategies.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'In-Feed Video Ad',
        platform: ['TikTok'],
        dimensions: '1080x1920px (9:16)',
        duration: '15 seconds',
        format: 'Vertical video with trending audio and effects',
        target_audience: 'Homeowners 25-45, TikTok engaged users',
        campaign_objective: 'Brand Awareness & Traffic'
      }
    },

    // 6. Banner Ad (728x90 Leaderboard)
    {
      title: 'Display Banner Ad - 728x90 Leaderboard',
      featured_image_url: 'https://images.unsplash.com/photo-1659720879327-827462ca3942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob21lJTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MXx8fHwxNzczMDE2OTcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🖥️ DISPLAY BANNER AD - LEADERBOARD FORMAT (728x90px)

---
BANNER DESIGN LAYOUT:

┌─────────────────────────────────────────────────────────────────────┐
│  [LOGO]    SPRING HOME RENOVATION SALE  │  20% OFF  │  [GET QUOTE] │
│  40x40    Professional Quality Work      │ BOLD TEXT │   CTA BTN    │
│           ${companyInfo.name}              │  Orange   │  Orange BG   │
└─────────────────────────────────────────────────────────────────────┘

---
SECTION BREAKDOWN:

LEFT SECTION (200px):
• Company Logo: 40x40px
• Text: "${companyInfo.name}"
• Font: Bold, 14pt
• Color: White on dark background
• Subtext: "Licensed & Insured" (10pt, light gray)

CENTER SECTION (380px):
• Headline: "SPRING HOME RENOVATION SALE"
• Font: Bold, 18pt, uppercase
• Secondary Text: "Professional Quality Work • Fast Service"
• Font: Regular, 12pt
• Icons: Small checkmarks or stars (16x16px)
• Color: White text on dark background

RIGHT SECTION (148px):
• Discount Badge: Circular or rectangular callout
  - Text: "20% OFF"
  - Font: Extra bold, 24pt
  - Background: Gradient orange (#ea580c to #dc2626)
  - Size: 80x60px

CTA BUTTON (120px):
• Text: "GET QUOTE"
• Dimensions: 110x60px
• Background: Solid orange (#ea580c)
• Hover: Darker orange (#c2410c)
• Font: Bold, 14pt, white
• Border Radius: 4px
• Click: Opens landing page

---
COLOR SCHEME:
• Primary Background: #0A0A0A (Dark)
• Secondary Background: #1A1A1A (Slightly lighter)
• Accent/CTA: #ea580c (Deep Orange)
• Text Primary: #FFFFFF (White)
• Text Secondary: #9CA3AF (Light Gray)
• Border: #2A2A2A (Subtle)

---
ANIMATION OPTIONS:

STATIC VERSION:
• No animation, always visible
• Best for: Immediate comprehension
• Recommended for: Most placements

ANIMATED VERSION 1 (Fade Sequence):
Frame 1 (3s): Show headline + logo
Frame 2 (3s): Reveal discount badge
Frame 3 (3s): Highlight CTA button
Total: 9 seconds, then loop

ANIMATED VERSION 2 (Slide In):
• Discount badge slides in from right (0.5s)
• CTA button pulses gently (subtle)
• Draws attention without being annoying

---
COPY VARIATIONS FOR A/B TESTING:

VARIATION 1 (Original):
"SPRING HOME RENOVATION SALE | 20% OFF | GET QUOTE"

VARIATION 2 (Urgency):
"LIMITED TIME: 20% OFF ALL PROJECTS | BOOK NOW"

VARIATION 3 (Social Proof):
"${companyInfo.address.city}'s #1 Rated Contractor | FREE QUOTES"

VARIATION 4 (Service Focus):
"KITCHEN • BATH • WHOLE HOME | TRANSFORM YOUR SPACE"

VARIATION 5 (Local):
"SERVING ${companyInfo.address.city} SINCE 2000 | CALL TODAY!"

---
TECHNICAL SPECIFICATIONS:

Leaderboard (728x90):
• Dimensions: 728x90 pixels
• File Format: JPG, PNG, GIF, HTML5
• File Size: Max 150KB
• Animation: Max 30 seconds (if animated)
• Frame Rate: Max 5 FPS (animated GIF)
• HTML5: Allowed with file size limit

Responsive Considerations:
• Mobile: Will resize down, ensure text legible
• Retina Display: Provide 2x version (1456x180px)
• Safe Zone: Keep important elements 10px from edges

---
OTHER STANDARD DISPLAY AD SIZES:

📱 MOBILE SIZES:
• 320x50 (Mobile Banner)
• 320x100 (Large Mobile Banner)
• 300x250 (Mobile Rectangle)

💻 DESKTOP SIZES:
• 728x90 (Leaderboard) ⬅ THIS AD
• 300x250 (Medium Rectangle)
• 336x280 (Large Rectangle)
• 160x600 (Wide Skyscraper)
• 300x600 (Half Page)
• 970x250 (Billboard)

---
PLACEMENT RECOMMENDATIONS:

Best Performing Placements:
✅ Above-the-fold website headers
✅ Home improvement blogs and forums
✅ Local news websites
✅ Real estate listing sites
✅ DIY and home décor websites
✅ Google Display Network
✅ YouTube (display ads)

Geographic Targeting:
• Primary: ${companyInfo.address.city}, ${companyInfo.address.state}
• Secondary: Surrounding counties (30-mile radius)
• Zip Codes: Target affluent neighborhoods

---
LANDING PAGE STRATEGY:

Click Destination: ${companyInfo.contact.website}/spring-sale

Landing Page Must Include:
✅ Same 20% off offer (consistency)
✅ Lead capture form (name, email, phone, project type)
✅ Trust signals (reviews, certifications, photos)
✅ Clear next steps (call, book, or request quote)
✅ Limited-time messaging (create urgency)
✅ Mobile-optimized design
✅ Fast load time (<3 seconds)

---
CAMPAIGN METRICS TO TRACK:

Key Performance Indicators (KPIs):
• Click-Through Rate (CTR): Target 0.5-1.0%
• Impressions: Track reach
• Cost Per Click (CPC): Monitor spending
• Conversion Rate: Leads generated
• Cost Per Acquisition (CPA): Cost per lead/customer
• View-Through Conversions: Saw ad, converted later

A/B Testing Variables:
1. Headline variations (5 options above)
2. CTA text (Get Quote vs Call Now vs Book Free Consultation)
3. Discount amount (20% vs $500 OFF vs FREE Consultation)
4. Color schemes (dark vs light background)
5. With/without animation

---
RETARGETING STRATEGY:

Retargeting Banner for Website Visitors:
• Show to users who visited site but didn't convert
• Message: "Still thinking? Book today & save 20%!"
• Frequency: Max 3 impressions per day
• Duration: 30 days after site visit

---
BUDGET RECOMMENDATIONS:

Google Display Network:
• Daily Budget: $50-150
• Bidding: CPC or CPM
• Target CPC: $1-3

Local Website Placements:
• Direct buys from local publishers
• Fixed rate: $200-500/month per site
• Negotiate based on traffic volume

---
ACCESSIBILITY COMPLIANCE:

✅ Alt text for images: "${companyInfo.name} Spring Sale - 20% Off Home Renovations"
✅ Sufficient color contrast (WCAG AA standard)
✅ Text readable even if images don't load
✅ No flashing elements (epilepsy consideration)
✅ Clear, understandable messaging

---
DESIGN FILE DELIVERABLES:

Required Files:
1. 728x90_static.jpg (Standard display)
2. 728x90_static.png (With transparency if needed)
3. 728x90_animated.gif (Optional animated version)
4. 728x90_html5.zip (HTML5 version with assets)
5. 1456x180_retina.png (2x for retina displays)

Design Source Files:
• PSD/Sketch/Figma source file
• All fonts and assets included
• Organized layers for easy editing

#DisplayAds #BannerAds #LeaderboardAd #GoogleDisplayNetwork #DigitalAdvertising #OnlineMarketing`,
      content_format: 'ad_display_banner',
      excerpt: '728x90 Leaderboard banner ad with detailed layout, multiple variations, technical specs, and placement strategy for display advertising.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Display Banner (Leaderboard)',
        platform: ['Google Display Network', 'Website Banners'],
        dimensions: '728x90px',
        format: 'Static or animated banner with responsive design',
        target_audience: 'Website visitors, homeowners browsing home improvement content',
        campaign_objective: 'Traffic & Lead Generation'
      }
    }
  ];
};

// Section 2: Next 6 Ads (7-12)
export const createDemoAdsSection2 = (): DemoAd[] => {
  return [
    // 7. Facebook/Instagram Carousel Ad
    {
      title: 'Facebook/Instagram Carousel Ad - Summer Home Renovation Sale',
      featured_image_url: 'https://images.unsplash.com/photo-1579618217299-92460380cf99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBraXRjaGVuJTIwcmVub3ZhdGlvbiUyMGJlZm9yZSUyMGFmdGVyfGVufDF8fHx8MTc3MzAxNjk2OXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🏠 TRANSFORM YOUR SPACE THIS SUMMER! 🌸

📸 SLIDE 1: Before & After Kitchen Transformation
Headline: "Dream Kitchens Start Here"
Body: See how ${companyInfo.name} turned this dated kitchen into a modern masterpiece! Quality craftsmanship you can trust.

📸 SLIDE 2: Bathroom Renovation Showcase
Headline: "Luxury Bathrooms, Affordable Prices"
Body: Spa-like retreats designed and built by our expert team. Your sanctuary awaits!

📸 SLIDE 3: Living Room Makeover
Headline: "Living Spaces That Wow"
Body: From concept to completion, we bring your vision to life with precision and care.

📸 SLIDE 4: Special Summer Offer
Headline: "LIMITED TIME: 20% OFF Consultations!"
Body: Book your FREE consultation this month and save 20% on your project!

🎯 CALL TO ACTION:
"Get Your Free Quote Today! 👉"

📞 ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}
📍 Serving ${companyInfo.address.city}, ${companyInfo.address.state}

---
CAROUSEL SPECS:
• Format: 4-card carousel
• Image Size: 1080x1080px per card
• Primary Text: 125 characters max
• Headline: 40 characters per card
• Link Description: 30 characters
• Platforms: Facebook Feed, Instagram Feed
• Placement: Feed, Stories (auto-optimized)
• Campaign Objective: Lead Generation
• Target Audience: Homeowners 30-65, ${companyInfo.address.city} area, Interested in home improvement

---
PERFORMANCE OPTIMIZATION:
✅ Each card tells a story
✅ Strong visual progression
✅ Clear value proposition
✅ Urgency with limited-time offer
✅ Multiple CTAs for engagement
✅ Local targeting for relevance

#HomeRenovation #${companyInfo.address.city}Contractors #QualityWork #SummerSale #BeforeAndAfter`,
      content_format: 'ad_carousel',
      excerpt: 'Multi-card carousel ad showcasing before/after transformations with limited-time summer offer. Optimized for Facebook & Instagram feeds.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Carousel Ad',
        platform: ['Facebook', 'Instagram'],
        dimensions: '1080x1080px per card',
        format: '4-card carousel with images and text',
        target_audience: 'Homeowners 30-65, local area',
        campaign_objective: 'Lead Generation & Brand Awareness'
      }
    },

    // 8. LinkedIn Sponsored Content Ad
    {
      title: 'LinkedIn Sponsored Content - B2B Commercial Services',
      featured_image_url: 'https://images.unsplash.com/photo-1758813240178-19ef760ded2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tZXJjaWFsJTIwb2ZmaWNlJTIwYnVpbGRpbmclMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzczMDE2OTY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🏢 ELEVATE YOUR COMMERCIAL SPACE WITH PROFESSIONAL EXPERTISE

In today's competitive business landscape, your physical space makes a powerful statement about your brand.

${companyInfo.name} specializes in commercial construction and renovation projects that:

✅ Enhance workplace productivity and employee satisfaction
✅ Impress clients and partners with professional aesthetics
✅ Maximize space utilization and operational efficiency
✅ Meet all regulatory compliance and safety standards
✅ Deliver on-time, on-budget results with minimal disruption

---
OUR COMMERCIAL SERVICES:

🏗️ Office Renovations & Buildouts
• Open-concept designs
• Private offices and conference rooms
• Break rooms and collaborative spaces
• Technology infrastructure integration

🏪 Retail & Restaurant Spaces
• Custom fixtures and displays
• Kitchen and service area construction
• Customer-facing environments
• ADA compliance solutions

🏭 Industrial & Warehouse Facilities
• Structural improvements
• Loading dock renovations
• Safety compliance upgrades
• Efficient workflow layouts

---
WHY BUSINESSES CHOOSE ${companyInfo.name.toUpperCase()}:

📊 20+ Years of Commercial Experience
📋 Licensed, Bonded & Fully Insured
⭐ 4.9/5 Client Satisfaction Rating
🏆 Award-Winning Project Portfolio
💼 Dedicated Project Managers
📅 Flexible Scheduling to Minimize Disruption
💰 Competitive Pricing & Transparent Quotes

---
"${companyInfo.name} transformed our outdated office into a modern, collaborative workspace that our employees love. The project was completed on schedule with zero disruption to our operations." 
— Sarah Mitchell, Operations Director, TechCore Solutions

---
📞 SCHEDULE YOUR COMMERCIAL CONSULTATION

Let's discuss how we can transform your commercial space to support your business goals.

Contact: ${companyInfo.contact.phone}
Email: ${companyInfo.contact.email}
Website: ${companyInfo.contact.website}

${companyInfo.legalName}
${companyInfo.address.line1}
${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}
${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}

---
LINKEDIN AD SPECS:
• Format: Single Image + Text
• Image Size: 1200x627px (1.91:1 ratio)
• Headline: 70 characters max
• Intro Text: 150 characters for feed preview
• Description: 100 characters
• Platform: LinkedIn Feed
• Campaign Objective: B2B Lead Generation
• Target Audience: Business Owners, Facility Managers, C-Suite Executives, Property Managers
• Industries: Real Estate, Retail, Professional Services, Manufacturing
• Company Size: 10-500 employees
• Geographic: ${companyInfo.address.city} metro area

#CommercialConstruction #OfficeRenovation #B2BServices #CommercialContractor #BusinessImprovement`,
      content_format: 'ad_linkedin_sponsored',
      excerpt: 'Professional B2B LinkedIn ad targeting business decision-makers for commercial construction and renovation services.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Sponsored Content',
        platform: ['LinkedIn'],
        dimensions: '1200x627px',
        format: 'Single image with professional copy',
        target_audience: 'B2B decision-makers, facility managers, executives',
        campaign_objective: 'B2B Lead Generation'
      }
    },

    // 9. Twitter Promoted Tweet Ad
    {
      title: 'Twitter Promoted Tweet - Quick Response Service',
      featured_image_url: 'https://images.unsplash.com/photo-1567238563567-b99d8ac66e9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBjb250cmFjdG9yJTIwd29ya2luZyUyMHRvb2xzfGVufDF8fHx8MTc3MzAxNjk2OXww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🚨 NEED IT DONE NOW? WE'RE ON IT! ⚡

${companyInfo.name} offers:
✅ Same-day consultations
✅ Emergency repair services
✅ Fast, reliable solutions
✅ Licensed & insured pros

📞 Call now: ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}

#${companyInfo.address.city}Contractors #EmergencyService #HomeRepair #FastService

---
TWITTER AD VARIATION 1 (Character Count: 267)
Perfect for promoting urgency and immediate response!

---

💡 Transform Your Space Without the Wait! 💡

From concept to completion:
⚡ Free quotes in 24hrs
🏗️ Expert craftsmanship
📅 Flexible scheduling
💯 Satisfaction guaranteed

Ready to start? ${companyInfo.contact.phone}

${companyInfo.address.city} | ${companyInfo.address.state}

#HomeImprovement #Construction #Renovation #LocalBusiness

---
TWITTER AD VARIATION 2 (Character Count: 258)
Focus on quality and trust!

---

🏆 AWARD-WINNING QUALITY 🏆

Why choose ${companyInfo.name}?
✨ 20+ years experience
✨ Licensed & bonded
✨ 5-star rated
✨ Fair, upfront pricing

Get your FREE consultation! 👉
${companyInfo.contact.website}

#QualityWork #TrustedContractor #HomeRenovation

---
TWITTER AD SPECS:
• Format: Tweet with image/video
• Text: 280 characters max (variations: 250-275 for optimal display)
• Image Size: 1200x675px (16:9) or 1080x1080px (1:1)
• Video: Up to 2:20 minutes (recommended: 15-30 seconds)
• Hashtags: 2-3 relevant hashtags maximum
• Platform: Twitter Feed, Search Results
• Campaign Objective: Website Clicks & Conversions
• Target Audience: Local homeowners, active Twitter users 25-55
• Geographic: ${companyInfo.address.city} and surrounding areas, 25-mile radius
• Interests: Home improvement, DIY, real estate, interior design

---
BEST PRACTICES APPLIED:
✅ Multiple variations for A/B testing
✅ Strong visual emoji use for attention
✅ Clear, concise messaging
✅ Direct call-to-action with contact info
✅ Local hashtags for discovery
✅ Mobile-optimized formatting
✅ Urgency and value propositions
✅ Under character limit for better display

#TwitterAds #SocialMediaMarketing #LocalAdvertising #ServiceBusiness`,
      content_format: 'ad_twitter_promoted',
      excerpt: 'Short, punchy Twitter promoted tweets with multiple variations for A/B testing. Emphasizes quick response and local service.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Promoted Tweet',
        platform: ['Twitter'],
        dimensions: '1200x675px or 1080x1080px',
        format: 'Text + Image with 3 variations',
        target_audience: 'Local homeowners 25-55, active social media users',
        campaign_objective: 'Website Traffic & Conversions'
      }
    },

    // 10. Instagram Story Ad
    {
      title: 'Instagram Story Ad - Before/After Transformation',
      featured_image_url: 'https://images.unsplash.com/photo-1735538497321-fcdb11d4b9f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXRocm9vbSUyMHRyYW5zZm9ybWF0aW9uJTIwbW9kZXJufGVufDF8fHx8MTc3MzAxNjk3MHww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📱 INSTAGRAM STORY AD SEQUENCE (Full-Screen Vertical)

---
STORY FRAME 1 (0-2 seconds)
Visual: Eye-catching "before" photo with dramatic overlay
Text Overlay: "😱 BEFORE"
Bottom Text: "Swipe up to see the transformation"
Background: Dark gradient overlay for text contrast

---
STORY FRAME 2 (2-4 seconds)
Visual: Stunning "after" photo - same angle as before
Text Overlay: "✨ AFTER ✨"
Bottom Text: "${companyInfo.name} Magic"
Sticker: Poll sticker "Would you transform your space?" Yes/No

---
STORY FRAME 3 (4-7 seconds)
Visual: Behind-the-scenes team photo or work in progress
Text Overlays:
Top: "💪 Expert Team"
Middle: "🏗️ Professional Work"
Bottom: "✅ Guaranteed Results"
Animation: Text fades in one by one

---
STORY FRAME 4 (7-10 seconds)
Visual: Company branding with service highlights
Text Layout:
Header: "${companyInfo.name}"
Bullets:
• Free Consultations
• Licensed & Insured
• Local ${companyInfo.address.city} Team
• Same-Week Starts Available

Icon Row: Phone, Email, Location emojis
Background: Branded colors with subtle pattern

---
STORY FRAME 5 - FINAL CTA (10-15 seconds)
Visual: Compelling finished project photo
Text Overlays:
Top: "🎯 SPRING SPECIAL"
Middle Large Text: "20% OFF"
Subtext: "First-time customers"
Bottom CTA: "SWIPE UP TO CLAIM" (with up arrow animation)

Swipe-Up Link: ${companyInfo.contact.website}/spring-special
Phone Sticker: ${companyInfo.contact.phone} (tappable)

---
INTERACTIVE ELEMENTS:
✅ Poll Sticker on Frame 2 (boosts engagement)
✅ Question Sticker option: "What room should we transform next?"
✅ Countdown Sticker: "Spring sale ends in..."
✅ Location Tag: ${companyInfo.address.city}, ${companyInfo.address.state}
✅ @mention sticker for company account
✅ Hashtag Stickers: #HomeReno #BeforeAndAfter

---
INSTAGRAM STORY AD SPECS:
• Format: Full-screen vertical video or image carousel
• Dimensions: 1080x1920px (9:16 aspect ratio)
• Duration: 15 seconds max (5 frames x 3 seconds each)
• File Size: Max 30MB for images, 4GB for video
• File Type: JPG, PNG, MP4, MOV
• Platform: Instagram Stories
• Campaign Objective: Traffic (Swipe-ups) or Conversions
• Target Audience: 
  - Age: 25-50
  - Gender: All
  - Location: ${companyInfo.address.city} + 30 mile radius
  - Interests: Home decor, interior design, home improvement, HGTV, DIY projects
  - Behaviors: Homeowners, recently moved, engaged shoppers

---
STORY FLOW STRATEGY:
1️⃣ Hook with dramatic before/after (Frames 1-2)
2️⃣ Build credibility with team/process (Frame 3)
3️⃣ Present value proposition (Frame 4)
4️⃣ Drive action with limited offer (Frame 5)

---
ADVANCED FEATURES:
🎬 Video Version: 15-second time-lapse of transformation
🎵 Audio: Upbeat, trending Instagram music
📊 A/B Test Variables:
   - Different before/after combinations
   - Discount amounts (20% vs $500 off)
   - Different CTAs (Book Now vs Get Quote vs Learn More)
   
#InstagramStories #InstagramAds #VisualMarketing #BeforeAndAfter #HomeTransformation`,
      content_format: 'ad_instagram_story',
      excerpt: 'Full-screen vertical Instagram Story ad with 5-frame sequence, interactive elements, and swipe-up CTA. Optimized for mobile viewing.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Story Ad',
        platform: ['Instagram'],
        dimensions: '1080x1920px (9:16)',
        duration: '15 seconds',
        format: '5-frame story sequence with interactive stickers',
        target_audience: 'Homeowners 25-50, design enthusiasts',
        campaign_objective: 'Traffic & Conversions via Swipe-Up'
      }
    },

    // 11. TikTok Video Ad
    {
      title: 'TikTok Video Ad - Trending Format Renovation',
      featured_image_url: 'https://images.unsplash.com/photo-1689307127721-bc2da981b5a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMHRpbWUlMjBsYXBzZXxlbnwxfHx8fDE3NzMwMTY5NzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🎵 TIKTOK VIDEO AD SCRIPT - "Renovation Reveal Trend"

---
FORMAT: Trending "Wait for it..." transformation video
DURATION: 15 seconds
MUSIC: Trending TikTok audio (upbeat reveal sound)
HOOK: First 3 seconds critical!

---
📹 SECOND-BY-SECOND BREAKDOWN:

⏱️ SECONDS 0-2: THE HOOK
Visual: Quick pan across dated, messy "before" space
Text Overlay: "POV: You called ${companyInfo.name} 😏"
Camera Movement: Shaky, authentic phone footage style
Trend: Uses popular "POV" format

⏱️ SECONDS 2-4: BUILD TENSION
Visual: Quick cuts of work in progress (fast-motion)
Text Overlay: "They said it couldn't be done... 👀"
Clips: Demolition, team working, materials
Effect: Speed ramp for dramatic effect

⏱️ SECONDS 4-7: TEAM MOMENT
Visual: Quick team fist bump or tool handoff
Text Overlay: "Our team is different 💪"
Style: Authentic, behind-the-scenes feel
Branding: Worker wearing ${companyInfo.name} shirt visible

⏱️ SECONDS 7-10: THE TRANSITION
Visual: Smooth wipe/transition effect
Text Overlay: "Wait for it... ✨"
Effect: Popular swipe transition matching beat drop
Building anticipation for reveal

⏱️ SECONDS 10-15: THE REVEAL & CTA
Visual: Stunning "after" shot with slow camera pan
Text Overlays (rapid sequence):
- "🤯 OBSESSED"
- "✅ ${companyInfo.address.city}'s Best"
- "📞 ${companyInfo.contact.phone}"
- "Link in bio! 👆"

Final Frame: Company logo + "Follow for more transformations!"

---
🎬 ALTERNATIVE VIDEO CONCEPTS:

CONCEPT 2: "Day in the Life of a Contractor"
• Behind-the-scenes authentic content
• "Get ready with me" contractor edition
• Shows tools, trucks, job sites
• Ends with finished project reveal
Duration: 15-30 seconds

CONCEPT 3: "Homeowner Reaction"
• Capture genuine client reaction to finished work
• Emotional, authentic moment
• Client testimonial integrated naturally
• "This is why we do what we do" messaging
Duration: 15-20 seconds

CONCEPT 4: "Time-Lapse Trend"
• Full renovation in 15 seconds
• Popular time-lapse format
• Satisfying to watch start-to-finish
• Text overlay with project details
Duration: 15 seconds

---
ON-SCREEN TEXT STRATEGY:
✅ Large, bold, easy-to-read fonts
✅ High contrast for mobile viewing
✅ Captions for sound-off viewing
✅ Emoji use for attention and emotion
✅ Text appears in safe zone (center)
✅ Brand name appears multiple times

---
HASHTAG STRATEGY:
Primary: #HomeRenovation #BeforeAndAfter #Construction
Trending: #Satisfying #Transformation #HomeTok
Local: #${companyInfo.address.city}TikTok #Local${companyInfo.address.state}
Niche: #ContractorLife #RenovationTok #HomeMakeover

Total: 8-10 hashtags mix (trending + niche + local)

---
TIKTOK AD SPECS:
• Format: In-Feed Video Ad
• Dimensions: 1080x1920px (9:16) or 1080x1080px (1:1)
• Duration: 5-60 seconds (15 seconds optimal)
• File Size: Max 500MB
• File Format: .mp4, .mov, .mpeg, .avi, .webm
• Platform: TikTok For You Page, Following Feed
• Campaign Objective: Traffic, Conversions, App Installs
• Sound: Required - use trending audio for better reach

---
TARGET AUDIENCE:
• Age: 25-45 (TikTok's homeowner demographic)
• Gender: All
• Location: ${companyInfo.address.city} metro + 50 mile radius
• Interests: 
  - Home improvement
  - DIY & crafts
  - Interior design
  - HGTV-style content
  - Before/after content
• Behaviors:
  - High TikTok engagement
  - Video content consumers
  - Home renovation browsers
  - SavedTok users (save for later)

---
ENGAGEMENT TACTICS:
💬 Pin Top Comment: "Where are you watching from? 👇 We serve ${companyInfo.address.city}!"
🔗 Link Sticker: Direct to booking page
📊 Spark Ads: Boost high-performing organic content
🎯 Promote User-Generated Content: Encourage clients to post their own reveals

---
POSTING STRATEGY:
⏰ Best Times: 6-9 AM, 12-2 PM, 7-11 PM EST
📅 Frequency: 2-3 TikToks per week
🔄 Content Mix: 70% educational/entertaining, 30% promotional
📈 Analytics: Track watch time, completion rate, shares

#TikTokAds #TikTokMarketing #VideoAds #HomeRenovationTikTok #ContractorTikTok #BeforeAndAfterTikTok`,
      content_format: 'ad_tiktok_video',
      excerpt: 'Trending-format TikTok video ad with 15-second transformation reveal. Includes multiple video concepts and engagement strategies.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'In-Feed Video Ad',
        platform: ['TikTok'],
        dimensions: '1080x1920px (9:16)',
        duration: '15 seconds',
        format: 'Vertical video with trending audio and effects',
        target_audience: 'Homeowners 25-45, TikTok engaged users',
        campaign_objective: 'Brand Awareness & Traffic'
      }
    },

    // 12. Banner Ad (728x90 Leaderboard)
    {
      title: 'Display Banner Ad - 728x90 Leaderboard',
      featured_image_url: 'https://images.unsplash.com/photo-1659720879327-827462ca3942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob21lJTIwaW50ZXJpb3IlMjBkZXNpZ258ZW58MXx8fHwxNzczMDE2OTcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🖥️ DISPLAY BANNER AD - LEADERBOARD FORMAT (728x90px)

---
BANNER DESIGN LAYOUT:

┌─────────────────────────────────────────────────────────────────────┐
│  [LOGO]    SPRING HOME RENOVATION SALE  │  20% OFF  │  [GET QUOTE] │
│  40x40    Professional Quality Work      │ BOLD TEXT │   CTA BTN    │
│           ${companyInfo.name}              │  Orange   │  Orange BG   │
└─────────────────────────────────────────────────────────────────────┘

---
SECTION BREAKDOWN:

LEFT SECTION (200px):
• Company Logo: 40x40px
• Text: "${companyInfo.name}"
• Font: Bold, 14pt
• Color: White on dark background
• Subtext: "Licensed & Insured" (10pt, light gray)

CENTER SECTION (380px):
• Headline: "SPRING HOME RENOVATION SALE"
• Font: Bold, 18pt, uppercase
• Secondary Text: "Professional Quality Work • Fast Service"
• Font: Regular, 12pt
• Icons: Small checkmarks or stars (16x16px)
• Color: White text on dark background

RIGHT SECTION (148px):
• Discount Badge: Circular or rectangular callout
  - Text: "20% OFF"
  - Font: Extra bold, 24pt
  - Background: Gradient orange (#ea580c to #dc2626)
  - Size: 80x60px

CTA BUTTON (120px):
• Text: "GET QUOTE"
• Dimensions: 110x60px
• Background: Solid orange (#ea580c)
• Hover: Darker orange (#c2410c)
• Font: Bold, 14pt, white
• Border Radius: 4px
• Click: Opens landing page

---
COLOR SCHEME:
• Primary Background: #0A0A0A (Dark)
• Secondary Background: #1A1A1A (Slightly lighter)
• Accent/CTA: #ea580c (Deep Orange)
• Text Primary: #FFFFFF (White)
• Text Secondary: #9CA3AF (Light Gray)
• Border: #2A2A2A (Subtle)

---
ANIMATION OPTIONS:

STATIC VERSION:
• No animation, always visible
• Best for: Immediate comprehension
• Recommended for: Most placements

ANIMATED VERSION 1 (Fade Sequence):
Frame 1 (3s): Show headline + logo
Frame 2 (3s): Reveal discount badge
Frame 3 (3s): Highlight CTA button
Total: 9 seconds, then loop

ANIMATED VERSION 2 (Slide In):
• Discount badge slides in from right (0.5s)
• CTA button pulses gently (subtle)
• Draws attention without being annoying

---
COPY VARIATIONS FOR A/B TESTING:

VARIATION 1 (Original):
"SPRING HOME RENOVATION SALE | 20% OFF | GET QUOTE"

VARIATION 2 (Urgency):
"LIMITED TIME: 20% OFF ALL PROJECTS | BOOK NOW"

VARIATION 3 (Social Proof):
"${companyInfo.address.city}'s #1 Rated Contractor | FREE QUOTES"

VARIATION 4 (Service Focus):
"KITCHEN • BATH • WHOLE HOME | TRANSFORM YOUR SPACE"

VARIATION 5 (Local):
"SERVING ${companyInfo.address.city} SINCE 2000 | CALL TODAY!"

---
TECHNICAL SPECIFICATIONS:

Leaderboard (728x90):
• Dimensions: 728x90 pixels
• File Format: JPG, PNG, GIF, HTML5
• File Size: Max 150KB
• Animation: Max 30 seconds (if animated)
• Frame Rate: Max 5 FPS (animated GIF)
• HTML5: Allowed with file size limit

Responsive Considerations:
• Mobile: Will resize down, ensure text legible
• Retina Display: Provide 2x version (1456x180px)
• Safe Zone: Keep important elements 10px from edges

---
OTHER STANDARD DISPLAY AD SIZES:

📱 MOBILE SIZES:
• 320x50 (Mobile Banner)
• 320x100 (Large Mobile Banner)
• 300x250 (Mobile Rectangle)

💻 DESKTOP SIZES:
• 728x90 (Leaderboard) ⬅ THIS AD
• 300x250 (Medium Rectangle)
• 336x280 (Large Rectangle)
• 160x600 (Wide Skyscraper)
• 300x600 (Half Page)
• 970x250 (Billboard)

---
PLACEMENT RECOMMENDATIONS:

Best Performing Placements:
✅ Above-the-fold website headers
✅ Home improvement blogs and forums
✅ Local news websites
✅ Real estate listing sites
✅ DIY and home décor websites
✅ Google Display Network
✅ YouTube (display ads)

Geographic Targeting:
• Primary: ${companyInfo.address.city}, ${companyInfo.address.state}
• Secondary: Surrounding counties (30-mile radius)
• Zip Codes: Target affluent neighborhoods

---
LANDING PAGE STRATEGY:

Click Destination: ${companyInfo.contact.website}/spring-sale

Landing Page Must Include:
✅ Same 20% off offer (consistency)
✅ Lead capture form (name, email, phone, project type)
✅ Trust signals (reviews, certifications, photos)
✅ Clear next steps (call, book, or request quote)
✅ Limited-time messaging (create urgency)
✅ Mobile-optimized design
✅ Fast load time (<3 seconds)

---
CAMPAIGN METRICS TO TRACK:

Key Performance Indicators (KPIs):
• Click-Through Rate (CTR): Target 0.5-1.0%
• Impressions: Track reach
• Cost Per Click (CPC): Monitor spending
• Conversion Rate: Leads generated
• Cost Per Acquisition (CPA): Cost per lead/customer
• View-Through Conversions: Saw ad, converted later

A/B Testing Variables:
1. Headline variations (5 options above)
2. CTA text (Get Quote vs Call Now vs Book Free Consultation)
3. Discount amount (20% vs $500 OFF vs FREE Consultation)
4. Color schemes (dark vs light background)
5. With/without animation

---
RETARGETING STRATEGY:

Retargeting Banner for Website Visitors:
• Show to users who visited site but didn't convert
• Message: "Still thinking? Book today & save 20%!"
• Frequency: Max 3 impressions per day
• Duration: 30 days after site visit

---
BUDGET RECOMMENDATIONS:

Google Display Network:
• Daily Budget: $50-150
• Bidding: CPC or CPM
• Target CPC: $1-3

Local Website Placements:
• Direct buys from local publishers
• Fixed rate: $200-500/month per site
• Negotiate based on traffic volume

---
ACCESSIBILITY COMPLIANCE:

✅ Alt text for images: "${companyInfo.name} Spring Sale - 20% Off Home Renovations"
✅ Sufficient color contrast (WCAG AA standard)
✅ Text readable even if images don't load
✅ No flashing elements (epilepsy consideration)
✅ Clear, understandable messaging

---
DESIGN FILE DELIVERABLES:

Required Files:
1. 728x90_static.jpg (Standard display)
2. 728x90_static.png (With transparency if needed)
3. 728x90_animated.gif (Optional animated version)
4. 728x90_html5.zip (HTML5 version with assets)
5. 1456x180_retina.png (2x for retina displays)

Design Source Files:
• PSD/Sketch/Figma source file
• All fonts and assets included
• Organized layers for easy editing

#DisplayAds #BannerAds #LeaderboardAd #GoogleDisplayNetwork #DigitalAdvertising #OnlineMarketing`,
      content_format: 'ad_display_banner',
      excerpt: '728x90 Leaderboard banner ad with detailed layout, multiple variations, technical specs, and placement strategy for display advertising.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Display Banner (Leaderboard)',
        platform: ['Google Display Network', 'Website Banners'],
        dimensions: '728x90px',
        format: 'Static or animated banner with responsive design',
        target_audience: 'Website visitors, homeowners browsing home improvement content',
        campaign_objective: 'Traffic & Lead Generation'
      }
    }
  ];
};