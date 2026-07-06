/**
 * Demo Ad Creator - Section 4 (Ads 19-23)
 */

import { companyInfo } from './config/companyInfo';
import type { DemoAd } from './demoAdCreator';

// Section 4: Next 5 Ads (19-23)
export const createDemoAdsSection4 = (): DemoAd[] => {
  return [
    // 19. Direct Mail Postcard
    {
      title: 'Direct Mail Postcard - EDDM Campaign',
      featured_image_url: 'https://images.unsplash.com/photo-1736000290462-71b8aaeb0ea6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXJlY3QlMjBtYWlsJTIwcG9zdGNhcmQlMjBtYWlsYm94fGVufDF8fHx8MTc3MzAyMzc5MHww&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📬 DIRECT MAIL POSTCARD - "Your Neighbors Trust Us"

FORMAT: Every Door Direct Mail (EDDM) Postcard
SIZE: 6" x 9" (Jumbo) or 6" x 11" (Oversized)
OBJECTIVE: Local Brand Awareness & Immediate Response

---
FRONT SIDE DESIGN (6" x 9"):

[LARGE BEFORE/AFTER KITCHEN IMAGE]
Split down the middle, dramatic difference

BEFORE <-> AFTER

YOUR HOME COULD BE NEXT!

${companyInfo.name}
Professional Home Renovations

[SPECIAL OFFER BURST]
SAVE $500 - NEW CUSTOMERS

---
BACK SIDE DESIGN:

${companyInfo.name} | 500+ Five-Star Reviews
SERVING ${companyInfo.address.city.toUpperCase()} FOR 20+ YEARS

✓ Licensed & Insured Contractors
✓ Free In-Home Consultations
✓ Same-Week Project Starts Available
✓ Satisfaction Guaranteed

OUR SERVICES:
🏠 Kitchen Remodeling
🛁 Bathroom Renovations
🏡 Whole Home Projects
🏢 Commercial Buildouts

CONTACT US TODAY:
📞 ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}
📧 ${companyInfo.contact.email}

${companyInfo.address.line1}
${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}

SPECIAL OFFER - ACT NOW!
💰 $500 OFF ANY PROJECT OVER $5,000
🎁 FREE DESIGN CONSULTATION ($300 VALUE)
Use Code: NEIGHBOR500
Expires: 30 Days from Mail Date

---
EDDM TARGETING STRATEGY:

Every Door Direct Mail (EDDM) is a USPS service that allows you to mail to every address in selected carrier routes without needing individual names or addresses.

TARGET SELECTION:
• Affluent neighborhoods (median income $75K+, home values $300K+)
• Within 15-mile radius of your office
• Homes built 1970-2000 (likely need updates)
• Owner-occupied (not rentals)

USPS EDDM PROCESS:
1. Use USPS EDDM Online Tool (eddm.usps.com) to select routes
2. Design postcard to EDDM specs (4.25" x 6" min, 6.5" x 9" max)
3. Print postcards (local or online printer)
4. Bundle by route (50-100 per bundle)
5. Attach USPS facing slip to each bundle
6. Drop off at EDDM-accepting Post Office

COSTS:
• Printing: $0.08-0.15 per postcard (5,000 qty)
• EDDM Postage: $0.205 per piece
• Total: $0.285-0.355 per piece
• 5,000 postcards: $1,425-1,775

EXPECTED RESULTS:
• Response Rate: 1-2% (EDDM average)
• 5,000 mailed → 50-100 responses → 25-50 consultations → 5-10 projects
• Cost per lead: $28-70
• ROI: 5:1 to 10:1

SPECIFICATIONS:
• Size: 6" x 9" or 6" x 11"
• Weight: Max 3.3 oz
• Cardstock: 14pt or 16pt
• Bleed: 0.125" on all sides
• Safe zone: 0.25" from edges
• Format: CMYK, 300 DPI
• Finish: Gloss UV or Matte

BEST MAILING TIMES:
• Spring (March-May): Best response rates
• Fall (September-November): Second-best
• Avoid December (holiday overload) and January (budget recovery)

#DirectMail #EDDM #PostcardMarketing #LocalAdvertising #NeighborhoodMarketing`,
      content_format: 'direct_mail_postcard',
      excerpt: '6x9 direct mail postcard for EDDM campaigns with front/back design, targeting strategies, and cost breakdowns.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Direct Mail Postcard',
        platform: ['USPS EDDM', 'Direct Mail'],
        dimensions: '6x9 inches (or 6x11 oversized)',
        format: 'Physical postcard with before/after imagery',
        target_audience: 'Local homeowners in targeted neighborhoods',
        campaign_objective: 'Local Brand Awareness & Lead Generation'
      }
    },

    // 20. LinkedIn InMail Campaign
    {
      title: 'LinkedIn InMail - B2B Outreach Message',
      featured_image_url: 'https://images.unsplash.com/photo-1762330463346-5c71fbfee5d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaW5rZWRpbiUyMHByb2Zlc3Npb25hbCUyMGJ1c2luZXNzJTIwbmV0d29ya2luZ3xlbnwxfHx8fDE3NzMwMjM3OTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `💼 LINKEDIN InMail CAMPAIGN - B2B Commercial Outreach

MESSAGE TYPE: Sponsored InMail (Message Ads)
OBJECTIVE: B2B Lead Generation for Commercial Projects
TARGET: Decision-makers at local businesses

---
InMail TEMPLATE 1 - OFFICE RENOVATION:

SUBJECT: "Transform your workspace for better productivity"

MESSAGE:

Hi [First Name],

I noticed [Company Name] has been growing—congrats! As your team expands, I imagine your office space might need to grow with it.

I'm [Your Name] with ${companyInfo.name}, and we specialize in helping ${companyInfo.address.city} businesses create workspaces that employees actually enjoy. Over 20 years, we've transformed offices for companies just like yours.

WHAT MAKES US DIFFERENT:
• Work around your schedule (nights/weekends to avoid disruption)
• Transparent pricing with no surprise costs
• Licensed, bonded, and fully insured
• 95% on-time project completion rate

RECENT SUCCESS: We just completed a 5,000 sq ft office renovation for [Similar Company] right here in ${companyInfo.address.city}. The team loves it, and productivity is measurably up.

Would you be open to a brief conversation? I'd love to learn about your space and see if we might be a fit. No pressure—just a friendly chat between ${companyInfo.address.city} business owners.

Reply here, call ${companyInfo.contact.phone}, or grab time on my calendar: [Calendar Link]

Best regards,
[Your Name]
${companyInfo.name}

P.S. — I'm offering a free space assessment (normally $500) to LinkedIn connections this month.

---
InMail TEMPLATE 2 - RETAIL/RESTAURANT:

SUBJECT: "Attract more customers with an updated storefront"

MESSAGE:

Hi [First Name],

I was impressed by [Company Name]'s reputation in ${companyInfo.address.city}. Your [product/service] is top-notch, and I believe your physical space should match that quality.

${companyInfo.name} specializes in retail and restaurant buildouts that drive customer engagement. We understand every dollar counts and downtime is money lost.

OUR APPROACH:
• Fast-track timelines (minimize business disruption)
• Phased construction (keep you open during work)
• ROI-focused design (layouts that increase sales)
• ADA compliance expertise

RECENT WIN: We helped [Local Restaurant] redesign their dining area. Within 3 months, they saw 22% increase in customer dwell time and 18% higher per-visit spending.

Let's talk about your vision. 15-minute call? No sales pitch—just shop talk.

Reply here or book a time: [Calendar Link]

Cheers,
[Your Name], Owner
${companyInfo.name}

P.S. — Curious what your space could look like? I can create a quick concept rendering at no cost.

---
LINKEDIN InMail TARGETING:

TARGET AUDIENCES:

1. BUSINESS OWNERS / C-SUITE:
• Job Titles: CEO, Owner, President, Founder
• Company Size: 10-500 employees
• Industries: Professional Services, Retail, Restaurants, Healthcare
• Location: ${companyInfo.address.city} metro area + 30 miles

2. FACILITY MANAGERS:
• Job Titles: Facility Manager, Facilities Director, Property Manager
• Industries: Real Estate, Property Management
• Location: ${companyInfo.address.city} region

3. HR DIRECTORS / OFFICE MANAGERS:
• Job Titles: HR Director, Office Manager, Chief People Officer
• Company Size: 50-1,000 employees
• Recent hiring activity (expanding = space needs)

PRICING & BUDGETING:

Cost Per Send (CPS): $0.50-$1.00 per message delivered
Budget Recommendations:
• Test: $500-1,000 (500-1,000 messages)
• Monthly: $2,000-5,000
• Large Scale: $10,000+

PERFORMANCE BENCHMARKS:
• Open Rate: 50-60%
• Click-Through Rate: 3-5%
• Response Rate: 10-15%
• Cost Per Lead: $50-150

SAMPLE CAMPAIGN ($2,000 budget):
• Messages: 2,000
• Opens: 1,200 (60%)
• Clicks: 80 (4%)
• Responses: 240 (12%)
• Qualified Leads: 100
• Cost Per Lead: $20

---
InMail BEST PRACTICES:

PERSONALIZATION:
✓ Use recipient's first name
✓ Reference their company
✓ Mention specific accomplishment
✓ Show you've researched them
✓ Connect to shared connection if possible

MESSAGE STRUCTURE:
✓ Subject: Clear benefit, not salesy
✓ Opening: Personal, relevant hook
✓ Body: Value proposition
✓ Social proof: Similar clients
✓ CTA: Clear next step, low-pressure
✓ P.S.: Additional value

TONE:
✓ Professional but conversational
✓ Peer-to-peer (not sales-to-prospect)
✓ Helpful and consultative
✓ Brief and scannable
✓ Respectful of their time

TRACKING:
• Use unique phone number
• Use unique landing page (${companyInfo.contact.website}/linkedin)
• UTM parameters on all links
• Ask: "How did you hear about us?"

#LinkedInInMail #B2BMarketing #SponsoredInMail #BusinessDevelopment #CommercialConstruction`,
      content_format: 'linkedin_inmail',
      excerpt: 'LinkedIn Sponsored InMail messages for B2B outreach with personalized templates and targeting strategies.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'LinkedIn InMail',
        platform: ['LinkedIn'],
        format: 'Sponsored InMail with personalization',
        target_audience: 'Business owners, facility managers, decision-makers',
        campaign_objective: 'B2B Lead Generation'
      }
    },

    // 21. Google My Business / Yelp Local Ads
    {
      title: 'Local Service Ads - Google LSA & Yelp',
      featured_image_url: 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb29nbGUlMjBtYXBzJTIwbG9jYWwlMjBidXNpbmVzc3xlbnwxfHx8fDE3NzMwMjM3OTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `📍 LOCAL SERVICE ADS - Google LSA & Yelp

PLATFORM 1: Google Local Service Ads (LSA)
PLATFORM 2: Google My Business (GMB) Profile
PLATFORM 3: Yelp Ads
OBJECTIVE: Dominate Local Search Results

---
GOOGLE LOCAL SERVICE ADS (LSA):

WHAT ARE LSAs?
• Appear at TOP of Google search (above regular ads!)
• "Google Screened" or "Google Guaranteed" badge
• Pay-per-lead (not pay-per-click)
• Only for verified, licensed service businesses

EXAMPLE LSA LISTING:

GOOGLE SCREENED

${companyInfo.name}
⭐⭐⭐⭐⭐ 4.9 (127 reviews)

General Contractor
${companyInfo.address.city}, ${companyInfo.address.state}
"Professional home renovations since 2000"

[CALL] ${companyInfo.contact.phone}
[MESSAGE] [BOOK]

✓ Licensed & Insured
✓ Background Checked
✓ 20+ Years Experience

---
LSA SETUP & REQUIREMENTS:

ELIGIBILITY:
✓ Valid contractor license (verified by Google)
✓ Business insurance (verified)
✓ Background check (for you and employees)
✓ Service ${companyInfo.address.city} area
✓ Specific service categories (General Contractor qualifies)

VERIFICATION PROCESS:
1. Apply on Google Screened website
2. Upload license documentation
3. Upload insurance certificates
4. Complete background check ($50-100 fee)
5. Verify business information
6. Wait 5-10 business days for approval

---
LSA PRICING:

PAY-PER-LEAD MODEL:
• You pay ONLY when customer contacts you
• Lead = phone call, message, or booking
• No charge for clicks or impressions

COST PER LEAD: $15-50 per lead
(Varies by market and competition)

BUDGET RECOMMENDATIONS:
• Weekly: $200-1,000
• Monthly: $800-4,000
• No minimum spend required

EXPECTED RESULTS ($1,000/month):
• Leads: 20-65 per month
• Valid leads: 70-80%
• Quote requests: 15-45
• Conversion: 15-25%
• New customers: 3-10
• ROI: 5:1 to 15:1

---
LSA RANKING FACTORS:

1. PROXIMITY (40%): Distance from job location
2. REVIEWS (30%): Star rating + quantity (4.5+ ideal, 100+ reviews)
3. RESPONSIVENESS (20%): Answer within 30 seconds, reply messages <15 min
4. AVAILABILITY (10%): Open hours, weekend availability

OPTIMIZATION TIPS:
✓ Answer ALL leads within minutes
✓ Get more Google reviews
✓ Respond to every review
✓ Keep profile updated
✓ Dispute invalid leads (get credits)
✓ Expand service area

---
GOOGLE MY BUSINESS OPTIMIZATION (FREE):

COMPLETE PROFILE:
✓ Business name: ${companyInfo.name}
✓ Category: General Contractor (primary)
✓ Address: ${companyInfo.address.line1}, ${companyInfo.address.city}, ${companyInfo.address.state}
✓ Phone: ${companyInfo.contact.phone}
✓ Website: ${companyInfo.contact.website}
✓ Hours: Accurate, updated for holidays
✓ Attributes: "Licensed", "Insured", "Free Estimates"

PHOTOS (Upload 50+):
• Logo (primary)
• Cover photo (best project)
• Team photos (builds trust)
• Before/after projects (10+)
• Work in progress
• Vehicles/equipment
• Update monthly

POSTS (Weekly):
• Project showcases
• Special offers
• Tips & advice
• Company news
• Seasonal content

REVIEWS:
• Goal: 100+ reviews minimum
• Ask every happy customer
• Respond to all reviews within 24 hours
• Thank positive reviewers
• Address negative reviews professionally

---
YELP ADVERTISING:

YELP ADS OPTIONS:
1. Sponsored Results: Appear higher in search
2. Profile Enhancement: Remove competitor ads, add slideshow
3. Custom CTA button

PRICING:
• Monthly: $300-1,500
• CPC: $2-8 per click
• No long-term contracts

YELP PROFILE OPTIMIZATION:
✓ Claim & complete profile
✓ Business description (1,000 characters)
✓ Categories: Contractors, Home Services, Kitchen & Bath
✓ 20+ project photos
✓ Before/afters
✓ Logo + cover photo
✓ Enable "Request a Quote"
✓ Respond to all reviews

---
LOCAL SEO SYNERGY:

NAP CONSISTENCY (Critical):
Ensure exact same Name, Address, Phone across:
• Google My Business
• Yelp
• Your website
• Facebook
• LinkedIn
• All directories

LOCAL CITATIONS:
• Angi (Angie's List)
• HomeAdvisor
• Thumbtack
• Houzz
• Better Business Bureau
• Chamber of Commerce
• Bing Places
• Apple Maps

---
TRACKING & METRICS:

GOOGLE LSA:
• Total leads received
• Cost per lead
• Response rate (target: 80%+)
• Star rating (target: 4.8+)

GMB INSIGHTS:
• Monthly searches
• Actions (calls, website clicks, directions)
• Photo views

YELP ANALYTICS:
• Profile views
• User actions
• CPC and spend

GOALS:
• Google LSA: 80%+ response, 4.8+ stars
• GMB: 1,000+ monthly searches, 100+ actions
• Yelp: 4.5+ stars, 50+ reviews

#GoogleLSA #LocalServiceAds #GoogleMyBusiness #YelpAds #LocalSEO`,
      content_format: 'local_service_ads',
      excerpt: 'Google Local Service Ads setup, GMB optimization, and Yelp advertising with pay-per-lead pricing.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Local Service Ads',
        platform: ['Google LSA', 'Google My Business', 'Yelp'],
        format: 'Pay-per-lead ads with profile optimization',
        target_audience: 'Local customers searching for contractors',
        campaign_objective: 'Dominate Local Search'
      }
    },

    // 22. Nextdoor Sponsored Post
    {
      title: 'Nextdoor Sponsored Post - Neighborhood Marketing',
      featured_image_url: 'https://images.unsplash.com/photo-1708447135262-850979354fcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZWlnaGJvcmhvb2QlMjBjb21tdW5pdHklMjBsb2NhbHxlbnwxfHx8fDE3NzMwMjM3OTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `🏘️ NEXTDOOR SPONSORED POST - "Your Neighbor Recommends Us"

PLATFORM: Nextdoor Local Deals & Sponsored Posts
OBJECTIVE: Hyper-Local Neighborhood Awareness
AUDIENCE: Homeowners in specific neighborhoods

---
SPONSORED POST TEMPLATE 1 - PROJECT SHOWCASE:

HEADLINE: "We Just Completed a Kitchen Renovation on [Street Name]!"

BODY:

Hi neighbors! 👋

We're ${companyInfo.name}, and we just wrapped up a beautiful kitchen remodel right here in [Neighborhood Name]. The homeowners are thrilled, and we're so proud of what our team accomplished.

A LITTLE ABOUT US:
• Serving ${companyInfo.address.city} for over 20 years
• Family-owned and operated
• Licensed, insured, and trusted by 500+ local families
• We treat your home like it's our own

WHAT WE DO:
✓ Kitchen remodeling
✓ Bathroom renovations
✓ Whole-home updates
✓ Additions & expansions

SPECIAL OFFER FOR NEIGHBORS:
Book a FREE consultation this month and get 15% OFF your project. We're already in your neighborhood—let's talk about your home improvement dreams!

📞 ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}
📧 ${companyInfo.contact.email}

Thanks for supporting local businesses!

— [Your Name], Owner
${companyInfo.name}

[ATTACH: 3-4 Before/After Photos]

---
SPONSORED POST TEMPLATE 2 - SEASONAL OFFER:

HEADLINE: "Spring Home Refresh? Your Neighbors Trust ${companyInfo.name}"

BODY:

Spring is here, ${companyInfo.address.city}! 🌸

Is your kitchen stuck in the '90s? Bathroom need a refresh? We can help!

I'm [Your Name], owner of ${companyInfo.name}. My team and I have been transforming homes right here in our community for over 20 years. Chances are, we've worked on a home near you!

WHY NEIGHBORS CHOOSE US:
• LOCAL—based in ${companyInfo.address.city}
• Licensed Contractor
• Fully insured
• Transparent pricing, no hidden costs
• We clean up like we were never there!

SPRING SPECIAL FOR NEXTDOOR NEIGHBORS:
🎁 FREE design consultation (normally $300)
💰 15% OFF kitchen or bathroom projects
⏰ Priority scheduling for April/May

WHAT NEIGHBORS SAY:
"Best contractor ever! Professional, on-time, and outstanding quality." — Jennifer M., [Neighborhood]

Ready to fall in love with your home again? Let's talk!

📞 ${companyInfo.contact.phone}
🌐 ${companyInfo.contact.website}

P.S. — Refer a neighbor and you both save $200!

---
NEXTDOOR TARGETING:

GEOGRAPHIC TARGETING:
• Specific neighborhoods (hyper-local)
• ZIP codes
• Radius around business (1-25 miles)
• City-wide (for larger campaigns)

NEIGHBORHOOD SELECTION:
Choose based on:
✓ Affluent areas (home values $300K+)
✓ Older homes (1970s-1990s = renovation opportunity)
✓ High Nextdoor engagement
✓ Previous project locations (social proof)
✓ Owner-occupied (not rentals)

EXAMPLE TARGETING:
• ${companyInfo.address.city}: [Neighborhood Names]
• Home values: $300K+
• Within 15 miles of office
• Engaged Nextdoor users

---
NEXTDOOR PRICING:

PRICING MODELS:

1. CPM (Cost-Per-Impression):
• $10-30 CPM
• Best for: Brand awareness

2. CPC (Cost-Per-Click):
• $1-4 CPC
• Best for: Website traffic

BUDGET RECOMMENDATIONS:
• Test: $200-500
• Monthly: $500-1,500
• Aggressive: $2,000-5,000

SAMPLE CAMPAIGN ($500/month):
• Impressions: 20,000-50,000
• Clicks: 150-300 (1-2% CTR)
• Leads: 15-30 (10% conversion)
• Cost Per Lead: $16-33
• Expected Customers: 3-5
• ROI: 10:1+

---
AD FORMATS:

NEXTDOOR LOCAL DEALS:
• Image: 1200x900px (4:3)
• Headline: 50 characters max
• Description: 300 characters
• CTA Button: "Get Offer", "Learn More", "Contact"

SPONSORED POSTS:
• Text: 1,000 characters recommended
• Images: Up to 10 (1200x900px each)
• Appears in neighborhood feed
• Native appearance

---
NEXTDOOR BEST PRACTICES:

AUTHENTICITY:
✓ Write like a neighbor, not a salesperson
✓ Include personal details (where you live, how long)
✓ Mention specific neighborhoods/streets
✓ Show your face (team photo)
✓ Be conversational and friendly
✓ Respond to comments personally

SOCIAL PROOF:
✓ Mention nearby projects ("We just finished on Oak Street")
✓ Customer testimonials from neighbors
✓ Photos of recognizable local landmarks
✓ Reference time in community
✓ Community involvement

ENGAGEMENT:
✓ Respond to ALL comments within hours
✓ Answer questions thoroughly
✓ Thank people for kind words
✓ Address concerns professionally
✓ Don't argue with negative comments

WHAT TO AVOID:
✗ Overly salesy language
✗ All caps, excessive emojis
✗ Stock photos (use real local projects)
✗ Posting too frequently (max 1-2x/week)
✗ Ignoring comments/questions

---
TRACKING:

• Unique phone number for Nextdoor
• Landing page: ${companyInfo.contact.website}/nextdoor
• Promo code: "NEIGHBOR15"
• Ask all leads: "How did you hear about us?"

SUCCESS METRICS:
• CTR: 1-3%
• Engagement: 3-5%
• Cost per lead: $15-40
• Conversion: 15-25% (high trust)
• Customer acquisition cost: $100-200

---
ORGANIC NEXTDOOR STRATEGY (FREE):

• Claim business page (free)
• Active participation in feed
• Answer home improvement questions
• Share helpful tips (not promotional)
• Build reputation as local expert
• Request recommendations from happy customers

SPECIAL OFFERS:
• "15% OFF for Nextdoor neighbors"
• "$500 OFF kitchen projects"
• "FREE consultation ($300 value)"
• "Priority scheduling for Nextdoor members"
• "Refer a neighbor, both save $200"

#NextdoorAds #NeighborhoodMarketing #HyperLocal #CommunityMarketing #LocalBusiness`,
      content_format: 'nextdoor_sponsored',
      excerpt: 'Nextdoor sponsored posts with hyper-local targeting and neighbor-focused messaging.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Nextdoor Sponsored Post',
        platform: ['Nextdoor'],
        format: 'Native sponsored post in neighborhood feeds',
        target_audience: 'Homeowners in specific neighborhoods',
        campaign_objective: 'Hyper-Local Brand Awareness'
      }
    },

    // 23. Quora Ads
    {
      title: 'Quora Ads - Question-Based Targeting',
      featured_image_url: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBkaXNjdXNzaW9uJTIwaGVscCUyMHN1cHBvcnR8ZW58MXx8fHwxNzczMDIzNzk1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      content_body: `❓ QUORA ADS - "Answer Their Questions, Win Their Business"

PLATFORM: Quora Text & Image Ads
OBJECTIVE: Reach High-Intent Researchers
AUDIENCE: People Actively Seeking Home Renovation Advice
FORMAT: Native ads in Quora feed & question pages

---
QUORA AD CREATIVE 1 - TEXT AD:

HEADLINE (55 characters):
"How Much Does a Kitchen Remodel Really Cost?"

BODY (300 characters):
"After 500+ kitchen projects in ${companyInfo.address.city}, we break down real costs—from budget-friendly updates to high-end transformations. Get our FREE Kitchen Cost Guide + consultation."

CTA BUTTON: "Download Free Guide"

LANDING PAGE: ${companyInfo.contact.website}/kitchen-cost-guide

---
QUORA AD CREATIVE 2 - IMAGE AD:

HEADLINE: "Finding a Trustworthy Contractor in ${companyInfo.address.city}?"

IMAGE:
• Size: 1200x628px
• Content: Team photo or before/after split
• Text overlay: "20+ Years | 500+ Happy Homeowners"
• ${companyInfo.name} logo in corner

BODY:
"We get it—hiring a contractor feels risky. That's why we're licensed, insured, background-checked, and backed by hundreds of 5-star reviews. ${companyInfo.address.city}'s trusted renovation experts since 2000."

CTA: "See Our Reviews"

---
PROMOTED ANSWER EXAMPLE:

QUESTION: "What should I look for when hiring a general contractor?"

PROMOTED ANSWER:

Great question! As a licensed contractor in ${companyInfo.address.city} for 20+ years, here's what I tell friends and family:

RED FLAGS TO AVOID:
• Asks for 50%+ upfront (scam warning!)
• No license or insurance
• Pressure tactics ("today only" deals)
• No written contract
• Cash-only payments

GREEN FLAGS TO LOOK FOR:
• Valid contractor license (verify!)
• Proof of liability & workers comp insurance
• Detailed written contract
• References from recent projects
• Clear payment schedule
• Transparent about timeline & costs
• Regular communication

RECOMMENDATION: Interview at least 3 contractors. Ask tough questions. Trust your gut. A good contractor welcomes questions, not dodges them.

Need help with your project? ${companyInfo.name} | ${companyInfo.contact.phone} | ${companyInfo.contact.website}

[Promoted Answer appears at top, marked "Promoted"]

---
QUORA TARGETING STRATEGIES:

QUESTION TARGETING (Most Powerful):
• "How much does a kitchen remodel cost?"
• "How to find a good contractor?"
• "Is it worth it to renovate before selling?"
• "DIY vs hiring contractor for bathroom remodel"
• "How long does kitchen renovation take?"
• "What to ask contractor before hiring?"
• "Average cost of bathroom renovation"

TOPIC TARGETING:
• Home Improvement
• Kitchen Design
• Bathroom Design
• Interior Design
• Real Estate
• Home Renovation
• General Contractors
• Remodeling

KEYWORD TARGETING:
• "kitchen remodel"
• "bathroom renovation"
• "home contractor"
• "general contractor"
• "renovation cost"
• "${companyInfo.address.city} contractor"
• "hiring contractor"

DEMOGRAPHIC TARGETING:
• Age: 30-65
• Location: ${companyInfo.address.city} + 50 mile radius
• Device: All

---
QUORA PRICING:

PRICING MODELS:

1. CPC (Cost-Per-Click):
• Average: $0.50-$3.00 per click
• Best for: Direct response, conversions

2. CPM (Cost-Per-Thousand Impressions):
• Average: $5-$20 CPM
• Best for: Brand awareness

BUDGET RECOMMENDATIONS:
• Test: $300-500
• Monthly: $1,000-3,000
• Scaling: $5,000+

EXPECTED PERFORMANCE ($1,000 budget):
• Impressions: 50,000-200,000
• Clicks: 300-800 (1-2% CTR)
• Conversions: 15-40 leads (5-10% CVR)
• Cost Per Lead: $25-65
• Lead Quality: High (active researchers)

---
CREATIVE BEST PRACTICES:

HEADLINE:
✓ Answer the question
✓ Be specific ("How Much..." not "Renovations")
✓ Include location if relevant
✓ Create curiosity
✓ Use numbers

BODY TEXT:
✓ Lead with value/answer
✓ Be helpful first, promotional second
✓ Speak to pain points
✓ Build credibility
✓ Clear CTA

IMAGE:
✓ High-quality, professional
✓ Before/after works well
✓ Team photo builds trust
✓ Minimal text overlay
✓ On-brand colors

TONE:
✓ Helpful expert, not salesperson
✓ Educational and informative
✓ Approachable and honest
✓ Builds trust through knowledge

---
CAMPAIGN OPTIMIZATION:

A/B TESTING:
• Headlines (question vs benefit)
• Images (before/after vs team vs project)
• CTA text
• Landing pages
• Tone (friendly vs professional)

OPTIMIZATION TIPS:
✓ Start broad, narrow based on data
✓ Exclude poor performers
✓ Increase bids on top placements
✓ Pause ads with <0.5% CTR after 1,000 impressions
✓ Refresh creative monthly

---
CONVERSION TRACKING:

QUORA PIXEL:
• Install on website
• Tracks page views, conversions, events
• Powers retargeting campaigns

EVENTS TO TRACK:
• Page view
• Lead form submission
• Quote request
• Phone number click
• Email click
• Portfolio view
• Time on site (>2 minutes)

---
PROMOTED ANSWER STRATEGY:

1. Find high-traffic questions (10K+ views)
2. Write genuinely helpful answer FIRST
3. Provide real value (don't just pitch)
4. Mention business naturally at end
5. Promote answer to top

EXAMPLE:
Question: "What's the average cost of a kitchen remodel in 2024?"

Answer provides detailed cost breakdowns by tier (budget/mid/high-end), factors affecting cost, and helpful tips. At the end: "If you're in ${companyInfo.address.city} and want a specific quote, we offer free consultations. ${companyInfo.name} | ${companyInfo.contact.phone}"

---
ORGANIC QUORA STRATEGY (FREE):

• Answer questions regularly (2-3x/week)
• Build profile as local expert
• Include ${companyInfo.name} in bio
• Link to website when relevant
• Upvotes = more visibility

RETARGETING:
• Website visitors (last 30 days)
• Content engagers (2+ min on site)
• High-intent (pricing/services pages)
• Previous ad clickers

#QuoraAds #QuestionBasedMarketing #IntentMarketing #ContentMarketing #EducationalMarketing`,
      content_format: 'quora_ads',
      excerpt: 'Quora text and image ads with question-based targeting and promoted answers for high-intent researchers.',
      status: 'draft',
      is_ai_generated: true,
      ai_generation_metadata: {
        ad_type: 'Quora Ads',
        platform: ['Quora'],
        format: 'Text ads, image ads, and promoted answers',
        target_audience: 'Active researchers seeking home renovation advice',
        campaign_objective: 'High-Intent Lead Generation'
      }
    }
  ];
};
