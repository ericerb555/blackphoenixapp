/**
 * Professional Reel & Ad Generator - Enhanced AI Content Creation
 * Generates professional scripts for Instagram Reels, TikTok, YouTube Shorts, and Social Ads
 */

interface ReelPrompt {
  topic: string;
  tone: string;
  platform: string[];
  includeHashtags: boolean;
  includeEmojis: boolean;
  contentLength: 'short' | 'medium' | 'long';
  callToAction?: string;
  targetAudience?: string;
  companyName: string;
  brandHashtags: string[];
}

interface ReelScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  caption: string;
  duration: string;
  format: string;
  music: string;
  hashtags: string;
  script: string;
}

export class ProfessionalReelGenerator {
  
  /**
   * Generate a complete professional reel script
   */
  static generateReel(prompt: ReelPrompt): ReelScript {
    const templates = [
      this.generateBeforeAfterReel,
      this.generateEducationalReel,
      this.generateTestimonialReel,
      this.generateBehindTheScenesReel,
      this.generateTrendingReel,
      this.generateQuickTipsReel,
      this.generateSatisfyingProcessReel,
      this.generateProblemSolutionReel,
    ];
    
    // Select template based on platform and topic
    const templateIndex = this.selectBestTemplate(prompt);
    const selectedTemplate = templates[templateIndex];
    
    return selectedTemplate.call(this, prompt);
  }
  
  /**
   * Select the best template based on prompt characteristics
   */
  private static selectBestTemplate(prompt: ReelPrompt): number {
    // Logic to select the best template
    const topic = prompt.topic.toLowerCase();
    
    if (topic.includes('before') || topic.includes('after') || topic.includes('transformation')) {
      return 0; // Before/After
    } else if (topic.includes('how to') || topic.includes('tip') || topic.includes('learn')) {
      return 1; // Educational
    } else if (topic.includes('testimonial') || topic.includes('review') || topic.includes('customer')) {
      return 2; // Testimonial
    } else if (topic.includes('behind') || topic.includes('process') || topic.includes('day in life')) {
      return 3; // Behind the Scenes
    }
    
    // Default: random selection for variety
    return Math.floor(Math.random() * 8);
  }
  
  /**
   * Template 1: Before & After Transformation Reel
   */
  private static generateBeforeAfterReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { shock: '🤯', fire: '🔥', eyes: '👀', sparkle: '✨', heart: '😍' } : { shock: '', fire: '', eyes: '', sparkle: '', heart: '' };
    
    const hook = `Wait for the transformation... ${emojis.shock}`;
    
    const script = `🎬 PROFESSIONAL REEL SCRIPT - ${topic}
Duration: 30-60 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: Show "before" state briefly
Text Overlay: "${hook}"
Voiceover: "You won't believe this transformation..."

⚡ PROBLEM SETUP (3-10 seconds):
Visual: Outdated/problematic ${topic.toLowerCase()} space
Text Overlays:
  - "This ${topic.toLowerCase()} was stuck in the past..."
  - "Our client was ready for a change ${emojis.fire}"
Voiceover: "Every homeowner's nightmare - an outdated space that desperately needed help"
Music: Build tension

${emojis.sparkle} TRANSFORMATION PROCESS (10-30 seconds):
Visual: Time-lapse of renovation
Text: "Watch what happens next ${emojis.eyes}"

Rapid cuts showing:
  ⏱️ 10-13s: Demo/prep work - "First, we prepare..."
  ⏱️ 13-18s: Installation/building - "Then we build..."  
  ⏱️ 18-23s: Details & finishing - "Every detail matters..."
  ⏱️ 23-30s: Final touches - "And finally..."

Music: Upbeat, building energy

🎯 BIG REVEAL (30-40 seconds):
Visual: Stunning final result (multiple angles)
Text Overlays:
  - "THE RESULT ${emojis.heart}"
  - "*Chef's kiss* Perfect!"
Voiceover: "${companyName} - where quality meets perfection"
Music: Drop/climax

📞 CALL TO ACTION (40-45 seconds):
Visual: Final beauty shot with contact info
Text Overlays:
  - "Ready for YOUR transformation?"
  - "📞 ${callToAction || 'DM for a FREE quote'}"
  - "Link in bio! ${emojis.eyes}"
End screen with logo

🎵 MUSIC SUGGESTION: 
- Trending upbeat track with clear build-up and drop
- Consider: "STAY" by Kid Laroi, "Heat Waves" by Glass Animals
- Or current trending audio from Reels/TikTok trending page

═══════════════════════════════════════`;

    const caption = `${emojis.sparkle} Another stunning ${topic.toLowerCase()} transformation by ${companyName}! 

From outdated to outstanding - this is what we do best! ${emojis.fire}

Our expert team brings 20+ years of experience to every project, ensuring quality craftsmanship and exceptional results that exceed expectations.

${emojis.eyes} Ready to transform your space? 
📞 DM us or click the link in bio for a FREE consultation!

✓ Licensed & Insured
✓ Quality Guaranteed  
✓ Customer Satisfaction Promise

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#transformation #renovation #beforeandafter #homeimprovement #construction #contractor #qualitywork #dreamhome #remodel #interiordesign`;

    return {
      title: `${topic} - Before & After Transformation Reel`,
      hook,
      body: 'Visual storytelling of complete transformation from problem to solution',
      cta: callToAction || 'DM for a FREE quote',
      caption,
      duration: '30-60 seconds',
      format: '9:16 (1080x1920)',
      music: 'Trending upbeat track with build-up',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #transformation #beforeandafter #renovation' : '',
      script
    };
  }
  
  /**
   * Template 2: Educational How-To Reel
   */
  private static generateEducationalReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { fire: '🔥', bulb: '💡', point: '👇', eyes: '👀', pro: '🎓' } : { fire: '', bulb: '', point: '', eyes: '', pro: '' };
    
    const hook = `Here's what pros DON'T want you to know about ${topic.toLowerCase()} ${emojis.eyes}`;
    
    const script = `🎬 EDUCATIONAL REEL SCRIPT - ${topic}
Duration: 45-60 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: Professional at work, direct to camera
Text Overlay: "${hook}"
Voiceover: "This will save you thousands..."

${emojis.pro} INTRO (3-10 seconds):
Visual: Establish credibility
Text: "I've been doing ${topic.toLowerCase()} for 20+ years"
Voiceover: "And this is the #1 mistake I see homeowners make ${emojis.fire}"
Music: Upbeat, educational vibe

${emojis.bulb} TIP #1 (10-20 seconds):
Visual: Demonstrate technique #1
Text Overlays:
  - "PRO TIP #1 ${emojis.fire}"
  - "Quality > Speed ALWAYS"
Voiceover: "Never rush perfection. This is where most DIYers fail"
Show: Clear before/during/after of technique
Music: Maintain energy

${emojis.bulb} TIP #2 (20-30 seconds):
Visual: Demonstrate technique #2
Text Overlays:
  - "PRO TIP #2 ${emojis.fire}"
  - "Preparation = 80% of success"
Voiceover: "If you skip prep work, you're setting yourself up for failure"
Show: Proper preparation steps
Music: Build momentum

${emojis.bulb} TIP #3 (30-40 seconds):
Visual: Demonstrate technique #3 (the secret)
Text Overlays:
  - "PRO TIP #3 ${emojis.fire}"
  - "The SECRET that saves $$$"
Voiceover: "And here's the professional secret that changes everything..."
Show: Game-changing technique
Music: Peak energy

🎯 CTA (40-50 seconds):
Visual: Final result + professional shot
Text Overlays:
  - "Want us to do it for YOU? ${emojis.bulb}"
  - "Save time + Guaranteed results"
  - "Link in bio ${emojis.point}"
End screen with contact info

🎵 MUSIC SUGGESTION:
- Upbeat educational/inspiring track
- Consider: Lofi hip-hop beats or motivational instrumental
- Keep it friendly and approachable

💾 SAVE REMINDER:
Add "SAVE THIS!" text in first 3 seconds to boost saves

═══════════════════════════════════════`;

    const caption = `${emojis.pro} Professional ${topic} tips from the experts!

After 20+ years in the industry, we've learned what works (and what doesn't). Here are our top secrets for ${topic.toLowerCase()} success! ${emojis.bulb}

${emojis.fire} Save this post so you don't forget!

Want professional results without the hassle? Let our expert team handle it for you:
✓ Licensed & Insured
✓ Quality Guaranteed
✓ Free Consultations
✓ Stress-Free Process

📞 DM for a free quote or click the link in bio!

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#protips #howto #diy #construction #homeimprovement #contractor #education #learnontiktok #tutorial #professionaladvice`;

    return {
      title: `${topic} - Educational Pro Tips Reel`,
      hook,
      body: 'Educational content teaching professional techniques and insider secrets',
      cta: callToAction || 'Link in bio for FREE consultation',
      caption,
      duration: '45-60 seconds',
      format: '9:16 (1080x1920)',
      music: 'Upbeat educational/inspiring track',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #protips #howto #education' : '',
      script
    };
  }
  
  /**
   * Template 3: Customer Testimonial Story Reel
   */
  private static generateTestimonialReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { heart: '❤️', sad: '😰', sparkle: '✨', star: '⭐', happy: '🎉' } : { heart: '', sad: '', sparkle: '', star: '', happy: '' };
    
    const hook = `This customer said we changed their life... here's why ${emojis.heart}`;
    
    const script = `🎬 TESTIMONIAL STORY REEL - ${topic}
Duration: 30-50 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: Happy customer (end result teaser)
Text Overlay: "${hook}"
Voiceover: "You need to hear this story..."

${emojis.sad} THE PROBLEM (3-15 seconds):
Visual: Customer interview clip
Customer Quote: "We were struggling with our outdated ${topic.toLowerCase()}..."
B-roll: Show old space, problems, frustrations
Text Overlays:
  - "The struggle was REAL ${emojis.sad}"
  - "They were losing hope..."
Voiceover: "Like many homeowners, they felt stuck with a space that didn't work"
Music: Emotional, sympathetic

${emojis.sparkle} THE TRANSFORMATION (15-30 seconds):
Visual: Project process montage
Show:
  - Initial consultation (2s)
  - Our team at work (4s)
  - Progress updates (3s)
  - Quality details (3s)
Text Overlays:
  - "Then ${companyName} stepped in..."
  - "Expert team ${emojis.star}"
  - "Quality materials ${emojis.star}"
  - "Precision work ${emojis.star}"
Voiceover: "We listened, we planned, we delivered"
Music: Building hope and excitement

${emojis.happy} THE RESULT (30-40 seconds):
Visual: Reveal finished space + happy customer
Customer Quote: "We couldn't be happier! This exceeded our wildest expectations!"
B-roll: Beautiful finished space (multiple angles)
Customer with family enjoying new space
Text Overlays:
  - "DREAM SPACE ACHIEVED ${emojis.sparkle}"
  - "Beyond their expectations ${emojis.heart}"
Voiceover: "Another happy ${companyName} family"
Music: Uplifting, joyful

🎯 CTA (40-48 seconds):
Visual: Contact information with 5-star graphic
Text Overlays:
  - "Ready for YOUR transformation?"
  - "Free consultation • No obligation"
  - "${callToAction || 'Link in bio!'} ${emojis.star}"
End screen: Before/After split + logo

🎵 MUSIC SUGGESTION:
- Emotional journey: start soft, build to uplifting
- Consider: Inspiring piano/strings or upbeat indie
- Match emotional arc of story

${emojis.star} AUTHENTICITY TIPS:
- Use real customer footage (with permission)
- Keep quotes genuine and conversational
- Show real emotions, not acted

═══════════════════════════════════════`;

    const caption = `${emojis.heart} This is why we do what we do!

Nothing beats the feeling of seeing our customers' reactions when their dream space becomes a reality. This ${topic.toLowerCase()} transformation literally changed their entire home and lifestyle! ${emojis.happy}

Your satisfaction is our #1 priority. Every project gets our full attention, expertise, and commitment to excellence.

${emojis.star} What our customers say:
"${companyName} delivered beyond our expectations. Professional, reliable, and the quality is outstanding!" - Sarah M.

Ready for your own transformation story? ${emojis.sparkle}
📞 Free consultations available! Link in bio

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#testimonial #happycustomer #5stars #transformation #customerservice #quality #beforeandafter #dreamhome #customerlove`;

    return {
      title: `${topic} - Customer Testimonial Story Reel`,
      hook,
      body: 'Emotional customer journey from problem to dream result',
      cta: callToAction || 'Free consultation - Link in bio',
      caption,
      duration: '30-50 seconds',
      format: '9:16 (1080x1920)',
      music: 'Emotional journey track',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #testimonial #happycustomer #5stars' : '',
      script
    };
  }
  
  /**
   * Template 4: Behind The Scenes / Day in the Life Reel
   */
  private static generateBehindTheScenesReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { eyes: '👀', hammer: '🔨', coffee: '☕', check: '✅', muscle: '💪' } : { eyes: '', hammer: '', coffee: '', check: '', muscle: '' };
    
    const hook = `POV: You're on a professional ${topic.toLowerCase()} job with us ${emojis.hammer}`;
    
    const script = `🎬 BEHIND THE SCENES REEL - ${topic}
Duration: 30-50 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: POV shot from job site
Text Overlay: "${hook}"
Voiceover: "Come with us for a day..."

🌅 MORNING SETUP (3-12 seconds):
Visual: Team arriving, setup
Text Overlays:
  - "6 AM - Time to make magic ${emojis.coffee}"
  - "The grind starts early ${emojis.eyes}"
Quick cuts:
  - Truck pulling up (1s)
  - Unloading equipment (2s)
  - Team safety briefing (1s)
  - Coffee break moment (1s - humanizing)
  - Tools ready (1s)
Voiceover: "Professional work starts with professional preparation"
Music: Energetic morning vibe

${emojis.hammer} WORK IN ACTION (12-35 seconds):
Visual: Actual work process (fast-paced)
Text Overlays cycling:
  - "Precision matters ${emojis.check}"
  - "Teamwork makes the dream work ${emojis.muscle}"
  - "20+ years of expertise"
  - "This is what pros look like ${emojis.eyes}"
  
Rapid cuts showing:
  - Measuring & marking (2s)
  - Skilled cutting/building (3s)
  - Team collaboration (2s)
  - Problem-solving moment (2s)
  - Quality check (2s)
  - Precision work close-up (3s)
  - Progress shots (3s)
  
Voiceover: "Every movement has purpose. Every decision backed by experience."
Music: Peak energy, motivational

${emojis.check} FINISHING TOUCHES (35-42 seconds):
Visual: Final details, cleanup, inspection
Text Overlays:
  - "The devil is in the details ${emojis.eyes}"
  - "Leaving it better than we found it"
Show:
  - Final inspection (2s)
  - Cleanup (1s)
  - Customer walkthrough (2s)
  - Happy handshake (1s)
Voiceover: "Another ${companyName} masterpiece complete"
Music: Satisfying resolution

🎯 CTA (42-48 seconds):
Visual: Team photo + final result
Text Overlays:
  - "Ready to work with the pros? ${emojis.muscle}"
  - "Experience the ${companyName} difference"
  - "${callToAction || 'DM us!'} ${emojis.eyes}"
End screen with contact info

🎵 MUSIC SUGGESTION:
- Energetic, motivational track
- Consider: Hip-hop/trap or rock instrumental
- Match the work energy and pride

═══════════════════════════════════════`;

    const caption = `${emojis.eyes} Ever wonder what goes into a professional ${topic.toLowerCase()} project?

Here's an inside look at our process! From sunrise to the final handshake, our team works with precision, skill, and dedication to deliver exceptional results ${emojis.hammer}

This is what 20+ years of expertise looks like in action! ${emojis.muscle}

${emojis.check} Our process:
• Professional prep & planning
• Expert execution
• Quality control at every step
• Customer satisfaction guaranteed

Thinking about a ${topic.toLowerCase()} project?
📞 Let's make it happen! Free consultation - link in bio

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#behindthescenes #contractor #construction #dayinthelife #professional #teamwork #skilled #expert #contractorlife`;

    return {
      title: `${topic} - Behind The Scenes Day in Life Reel`,
      hook,
      body: 'Immersive POV experience showing professional process from start to finish',
      cta: callToAction || 'DM us for your project',
      caption,
      duration: '30-50 seconds',
      format: '9:16 (1080x1920)',
      music: 'Energetic motivational track',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #behindthescenes #dayinthelife #contractor' : '',
      script
    };
  }
  
  /**
   * Template 5: Trending Format / Viral Adaptation Reel
   */
  private static generateTrendingReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { laugh: '😂', point: '👇', fire: '🔥', eyes: '👀', heart: '❤️' } : { laugh: '', point: '', fire: '', eyes: '', heart: '' };
    
    const hook = `Tell me you do ${topic.toLowerCase()} without telling me you do ${topic.toLowerCase()}... I'll go first ${emojis.point}`;
    
    const script = `🎬 TRENDING FORMAT REEL - ${topic}
Duration: 15-30 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

🔥 IMPORTANT: Use CURRENT trending audio from TikTok/Reels!
Check trending page before filming.

📱 HOOK (0-2 seconds):
Visual: Direct to camera or relatable setup
Text Overlay: "${hook}"
Audio: [Current trending sound - check daily!]

⚡ RAPID-FIRE RELATABLE MOMENTS (2-22 seconds):
Show 6-8 ultra-relatable contractor moments

Shot 1 (2s): "My truck at 5 AM every morning ${emojis.coffee}"
Shot 2 (2s): "My hands after a long day ${emojis.muscle}"
Shot 3 (3s): "The tools I can't live without ${emojis.heart}"
Shot 4 (3s): "When the customer adds 'one more thing' ${emojis.laugh}"
Shot 5 (3s): "Before vs. after photos hit different ${emojis.fire}"
Shot 6 (3s): "That feeling when it's PERFECT ${emojis.eyes}"
Shot 7 (2s): "Customer reactions = why I do this ${emojis.heart}"
Shot 8 (2s): "Me: 'It'll take 3 hours' | Reality: All day ${emojis.laugh}"

Each clip: Quick cut, on-beat with audio
Text overlays: Make it RELATABLE and AUTHENTIC

${emojis.eyes} PUNCHLINE/PAYOFF (22-26 seconds):
Visual: Spectacular finished project or funny reveal
Text: "But THIS is why I love what I do ${emojis.heart}"
Show: Beautiful work or wholesome moment

🎯 MINI CTA (26-28 seconds):
Text: "Follow for more! ${emojis.point}"
"Link in bio for your project"
Quick, don't kill the vibe

🎵 MUSIC: 
CRITICAL - Use TRENDING audio!
- Check TikTok/IG Reels trending page DAILY
- Popular options: Trending mashups, viral sounds, comedy audio
- Must be HIGH ENGAGEMENT audio (check views on original)

${emojis.fire} VIRALITY TIPS:
- Post during peak hours (7-9 AM, 12-1 PM, 7-9 PM)
- Engage with comments in first hour
- Use trending hashtags + niche hashtags
- Tag relevant accounts for exposure
- Make it SHAREABLE (relatable + entertaining)

═══════════════════════════════════════`;

    const caption = `${emojis.laugh} If you know, you know! 

Just some relatable ${topic.toLowerCase()} contractor moments that hit different when you're in the industry ${emojis.fire}

Tag a contractor friend who gets it! ${emojis.point}

Been doing this for 20+ years and wouldn't trade it for anything. The satisfaction of a perfect finish? The joy on a customer's face? *Chef's kiss* ${emojis.heart}

Follow for more contractor humor, tips, and transformations!

Need a contractor who knows their stuff?
📞 We got you! DM for free quote or link in bio

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#contractor #construction #relatable #funny #trend #renovation #homeimprovement #contractorlife #viral #foryou #fyp`;

    return {
      title: `${topic} - Trending/Viral Format Reel`,
      hook,
      body: 'Trending audio format with relatable contractor moments for maximum engagement',
      cta: 'Follow for more!',
      caption,
      duration: '15-30 seconds',
      format: '9:16 (1080x1920)',
      music: 'CURRENT TRENDING AUDIO (check daily!)',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #relatable #trending #viral #foryou' : '',
      script
    };
  }
  
  /**
   * Template 6: Quick Tips Carousel Reel
   */
  private static generateQuickTipsReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { fire: '🔥', bulb: '💡', pin: '📌', check: '✅', muscle: '💪' } : { fire: '', bulb: '', pin: '', check: '', muscle: '' };
    
    const hook = `5 things I learned after ${topic.toLowerCase()} for 20 years ${emojis.fire}`;
    
    const script = `🎬 QUICK TIPS CAROUSEL REEL - ${topic}
Duration: 30-45 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: Professional direct to camera
Text Overlay: "${hook}"
"SAVE THIS! ${emojis.pin}"
Voiceover: "These tips will change everything..."

${emojis.bulb} TIP 1 (3-10 seconds):
Visual: Demonstrate or show example
Text Overlays:
  - "1. Quality > Speed ALWAYS"
  - "Never rush perfection"
Voiceover: "The first thing you need to know - speed kills quality"
Show: Example of careful work
Music: Upbeat, educational

${emojis.bulb} TIP 2 (10-17 seconds):
Visual: Show preparation work
Text Overlays:
  - "2. Preparation is EVERYTHING"
  - "80% prep, 20% execution"
Voiceover: "Most problems happen because of poor preparation"
Show: Proper prep vs. rushed prep
Music: Maintain energy

${emojis.bulb} TIP 3 (17-24 seconds):
Visual: Professional tools/materials
Text Overlays:
  - "3. Invest in Professional Tools"
  - "Your tools = your reputation"
Voiceover: "Cheap tools = expensive mistakes"
Show: Pro tools vs. DIY tools difference
Music: Building

${emojis.bulb} TIP 4 (24-31 seconds):
Visual: Customer communication
Text Overlays:
  - "4. Communication is KEY"
  - "Happy clients = repeat business"
Voiceover: "Under-promise, over-deliver, always communicate"
Show: Customer interaction
Music: Positive vibe

${emojis.bulb} TIP 5 (31-38 seconds):
Visual: Learning/improvement moment
Text Overlays:
  - "5. Never Stop Learning"
  - "Every project teaches something"
Voiceover: "The day you stop learning is the day you stop being a pro"
Show: New technique or problem-solving
Music: Inspiring

🎯 CTA (38-43 seconds):
Visual: Final result + contact info
Text Overlays:
  - "Want pro results without the work? ${emojis.muscle}"
  - "We got you covered ${emojis.check}"
  - "${callToAction || 'Free quote - link in bio!'}"
End screen with logo

🎵 MUSIC SUGGESTION:
- Upbeat, motivational instrumental
- Consider: Electronic/pop beats or inspiring indie
- Keep it energetic but not overwhelming

${emojis.pin} ENGAGEMENT BOOST:
- Add "SAVE THIS!" in first frame
- Ask question in caption to boost comments
- Create carousel version for IG

═══════════════════════════════════════`;

    const caption = `${emojis.bulb} Pro tips from 20+ years in ${topic}!

Save this post for later! ${emojis.pin} These are the exact lessons that separate amateur work from professional results.

${emojis.fire} Quick recap:
1. Quality over speed - always
2. Preparation is 80% of success  
3. Invest in professional tools
4. Communication = happy customers
5. Never stop learning and improving

Which tip resonated most with you? Drop a number below! ${emojis.point}

Want to skip the learning curve and get it done right the first time? That's what we're here for!
✓ Expert team with 20+ years experience
✓ Quality guaranteed on every project
✓ Stress-free, professional process
✓ Free consultations

📞 DM us or click the link in bio! ${emojis.eyes}

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#protips #tips #advice #construction #contractor #homeimprovement #business #quality #professional #education`;

    return {
      title: `${topic} - Professional Tips Carousel Reel`,
      hook,
      body: '5 essential professional tips learned from years of experience',
      cta: callToAction || 'Free quote - link in bio',
      caption,
      duration: '30-45 seconds',
      format: '9:16 (1080x1920)',
      music: 'Upbeat motivational instrumental',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #protips #advice #education' : '',
      script
    };
  }
  
  /**
   * Template 7: Satisfying Process Video Reel
   */
  private static generateSatisfyingProcessReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { peace: '😌', ok: '👌', kiss: '💋', sparkle: '✨', heart: '😍' } : { peace: '', ok: '', kiss: '', sparkle: '', heart: '' };
    
    const hook = `This is oddly satisfying ${emojis.peace}`;
    
    const script = `🎬 SATISFYING PROCESS REEL - ${topic}
Duration: 30-60 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}

═══════════════════════════════════════

📱 HOOK (0-3 seconds):
Visual: Close-up of perfect/satisfying work beginning
Text Overlay: "${hook}"
Audio: Crisp, clear work sounds (ASMR-style)

${emojis.peace} SATISFYING PROCESS SEQUENCE (3-45 seconds):

Each clip should be ULTRA satisfying:

Clip 1 (3-7s): Perfect measurement
- Close-up of precise measuring
- Text: "Perfection ${emojis.ok}"
- Sound: Clear measuring tape snap

Clip 2 (7-12s): Smooth cutting/precision work  
- Satisfying cut through material
- Text: "*Chef's kiss* ${emojis.kiss}"
- Sound: Clean cutting sound

Clip 3 (12-17s): Perfect fit/alignment
- Piece fitting perfectly into place
- Text: "That fit tho ${emojis.heart}"
- Sound: Satisfying click/fit sound

Clip 4 (17-22s): Smooth application
- Paint/finish going on perfectly
- Text: "So smooth ${emojis.peace}"
- Sound: Brush/roller sounds

Clip 5 (22-27s): Final smoothing/finishing
- Perfecting the surface
- Text: "This is therapy ${emojis.sparkle}"
- Sound: Satisfying smoothing

Clip 6 (27-35s): Reveal of perfect result
- Step back to show finished work
- Text: "Absolutely perfect ${emojis.ok}"
- Show from multiple angles

Clip 7 (35-42s): Detail shots
- Extreme close-ups of perfection
- Text: "This is why we're pros"
- Showcase craftsmanship

📺 FILMING TIPS:
- Use macro lens for close-ups
- Capture natural work sounds
- Smooth camera movements
- Good lighting is CRITICAL
- Multiple angles of same action

🎯 CTA (42-48 seconds):
Visual: Final beauty shot + contact
Text Overlays:
  - "Want this level of perfection? ${emojis.ok}"
  - "Professional craftsmanship guaranteed"
  - "${callToAction || 'Book your project!'} ${emojis.sparkle}"

🎵 MUSIC SUGGESTION:
- Calm, satisfying lo-fi or ambient
- Consider: ASMR-friendly music or silence with natural sounds
- Let the visuals and sounds be the star
- Popular: Lofi hip-hop, calm instrumental, or trending chill audio

${emojis.peace} ASMR OPTIMIZATION:
- Record high-quality work sounds
- Minimize background noise
- Let sounds sync with visuals
- Consider posting version with just natural sounds

═══════════════════════════════════════`;

    const caption = `${emojis.peace} *Chef's kiss* The satisfying feeling of perfection!

This is what professional ${topic.toLowerCase()} looks like. Precision, skill, and attention to every single detail - every single time ${emojis.ok}

After 20+ years, we STILL get excited about:
• That perfect measurement ${emojis.check}
• That smooth finish ${emojis.sparkle}
• That flawless result ${emojis.heart}
• That customer smile ${emojis.heart}

That's the ${companyName} difference - we're perfectionists who love what we do!

${emojis.sparkle} Tag someone who appreciates quality craftsmanship!

Want this level of precision for your project?
📞 DM us or click the link in bio for a free consultation!

✓ Meticulous attention to detail
✓ Professional-grade results
✓ Satisfaction guaranteed

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#satisfying #oddlysatisfying #perfect #craftsmanship #quality #precision #professional #asmr #perfectfit`;

    return {
      title: `${topic} - Oddly Satisfying Process Reel`,
      hook,
      body: 'ASMR-style satisfying footage of perfect craftsmanship and precision work',
      cta: callToAction || 'Book your project - link in bio',
      caption,
      duration: '30-60 seconds',
      format: '9:16 (1080x1920)',
      music: 'Calm lo-fi or natural sounds',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #satisfying #oddlysatisfying #perfect' : '',
      script
    };
  }
  
  /**
   * Template 8: Problem-Solution Reel (AIDA Framework)
   */
  private static generateProblemSolutionReel(prompt: ReelPrompt): ReelScript {
    const { topic, companyName, callToAction, brandHashtags, includeHashtags, includeEmojis } = prompt;
    
    const emojis = includeEmojis ? { stop: '🛑', bulb: '💡', fire: '🔥', check: '✅', rocket: '🚀' } : { stop: '', bulb: '', fire: '', check: '', rocket: '' };
    
    const hook = `STOP! Don't make this ${topic.toLowerCase()} mistake ${emojis.stop}`;
    
    const script = `🎬 PROBLEM-SOLUTION REEL - ${topic}
Duration: 30-45 seconds | Format: 9:16 (1080x1920)
Platform: ${prompt.platform.join(', ')}
Framework: AIDA (Attention, Interest, Desire, Action)

═══════════════════════════════════════

🎯 ATTENTION - HOOK (0-3 seconds):
Visual: Stop-scroll imagery
Text Overlay: "${hook}"
Voiceover: "This could cost you thousands..."

💰 INTEREST - THE PROBLEM (3-12 seconds):
Visual: Show common mistake/problem
Text Overlays:
  - "95% of homeowners make this error"
  - "It costs $5,000+ to fix"
Voiceover: "Most people don't realize this until it's too late..."
Show: Examples of the problem
Examples of failed DIY attempts
Music: Tense, concerning

${emojis.bulb} DESIRE - THE SOLUTION (12-28 seconds):
Visual: Show the right way
Text Overlays:
  - "Here's the PRO way ${emojis.fire}"
  - "This is what ${companyName} does differently"
Voiceover: "Professional contractors know the secret..."

Show step-by-step:
- Right materials (4s)
- Proper technique (4s)
- Quality assurance (3s)
- Perfect result (3s)

Text: "This is the difference ${emojis.check}"
Music: Building confidence

${emojis.rocket} ACTION - THE CTA (28-40 seconds):
Visual: Before/After comparison
Text Overlays:
  - "DIY Disaster vs. Pro Result"
  - "Which would you choose?"
Voiceover: "Don't risk it - get it done right the first time"

Final screens:
- "Save time, money & stress ${emojis.check}"
- "Guaranteed professional results"
- "${callToAction || 'Free consultation!'} ${emojis.rocket}"

Show customer testimonial quote:
"Wish I'd called ${companyName} from the start!"

🎵 MUSIC SUGGESTION:
- Emotional journey: problem → solution
- Start: Tense/concerning
- Middle: Building hope
- End: Triumphant/confident

📊 CONVERSION OPTIMIZATION:
- Clear problem (relatable pain point)
- Obvious solution (your service)
- Social proof (testimonials)
- Strong CTA (easy next step)
- Urgency (limited time/availability)

═══════════════════════════════════════`;

    const caption = `${emojis.stop} This ${topic.toLowerCase()} mistake costs homeowners THOUSANDS!

We see this all the time - homeowners trying to DIY or hiring the wrong contractor, only to have to pay double to fix it later ${emojis.sad}

${emojis.fire} The most common mistakes:
• Using wrong materials
• Skipping crucial prep work
• Not following building codes
• Rushing the process
• Missing the details

${emojis.bulb} The ${companyName} difference:
✓ 20+ years of professional experience
✓ Licensed, bonded & insured
✓ Quality materials & craftsmanship
✓ Code-compliant work
✓ Warranty on all projects
✓ No surprises, transparent pricing

Don't learn the hard way! Save yourself time, money, and stress.

📞 FREE consultation - we'll tell you exactly what you need
Link in bio or DM us! ${emojis.rocket}

${includeHashtags ? brandHashtags.join(' ') + ' ' : ''}#homeimprovement #renovation #diy #contractor #construction #mistake #protips #beforeandafter #quality`;

    return {
      title: `${topic} - Problem-Solution (Mistake Prevention) Reel`,
      hook,
      body: 'Problem-agitation-solution format showing common mistakes and professional solutions',
      cta: callToAction || 'FREE consultation - link in bio',
      caption,
      duration: '30-45 seconds',
      format: '9:16 (1080x1920)',
      music: 'Emotional journey track',
      hashtags: includeHashtags ? brandHashtags.join(' ') + ' #mistake #protips #DIY #contractor' : '',
      script
    };
  }
}

export default ProfessionalReelGenerator;
