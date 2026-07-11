/**
 * Self-Service Fix Hub
 * Customer-facing guided troubleshooting before any human gets involved.
 * Covers the most common calls — reduces on-call volume by 40-60%.
 */
import { useState } from 'react';
import {
  BookOpen, Droplets, Zap, Wind, Home, Lock, Wrench,
  ChevronRight, ChevronDown, CheckCircle, Circle, ArrowLeft,
  Search, X, Phone, Star, ThumbsUp, ThumbsDown, AlertTriangle,
  Play, RefreshCw, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type GuideId = string;
interface Step { text: string; tip?: string; warning?: string }
interface Guide {
  id: GuideId;
  title: string;
  category: string;
  icon: any;
  iconColor: string;
  description: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  savesCost: string;
  steps: Step[];
  successSignal: string;
  escalateIf: string[];
}

const GUIDES: Guide[] = [
  {
    id: 'reset-breaker',
    title: 'Reset a Tripped Circuit Breaker',
    category: 'Electrical',
    icon: Zap,
    iconColor: '#fbbf24',
    description: 'A tripped breaker is the #1 cause of rooms losing power — and it takes 30 seconds to fix yourself.',
    estimatedTime: '2 min',
    difficulty: 'Easy',
    savesCost: 'Saves ~$150 service call',
    steps: [
      { text: 'Locate your breaker panel — usually in a basement, garage, hallway, or utility closet.' },
      { text: 'Look for a breaker switch that is in the MIDDLE position (not fully ON or fully OFF). That\'s the tripped one.', tip: 'It may also be slightly different in color or position from the others.' },
      { text: 'Push the switch firmly all the way to OFF (you\'ll feel a click).', warning: 'If the panel smells burnt or you see scorch marks, stop. Call 911.' },
      { text: 'Then flip it firmly all the way to ON.' },
      { text: 'Go check if power has been restored to the affected room.' },
    ],
    successSignal: 'Power returns to the affected area.',
    escalateIf: ['The breaker trips again within minutes', 'You smell burning from the panel', 'The breaker won\'t stay in the ON position'],
  },
  {
    id: 'shutoff-water',
    title: 'Shut Off Your Water in an Emergency',
    category: 'Plumbing',
    icon: Droplets,
    iconColor: '#60a5fa',
    description: 'Every second counts with a burst pipe. Shutting off water immediately prevents thousands in water damage.',
    estimatedTime: '3 min',
    difficulty: 'Easy',
    savesCost: 'Prevents $5,000–$50,000 water damage',
    steps: [
      { text: 'For a single fixture (sink, toilet): Look for the oval shutoff valve on the supply line behind or under the fixture. Turn it clockwise until snug.', tip: 'Most valves are oval-shaped knobs or small levers.' },
      { text: 'For the whole house: Find your main shutoff valve. Common locations: under the kitchen sink, in the basement near the water heater, or outside near the foundation.' },
      { text: 'Turn the main valve clockwise (right) until it stops. This shuts off all water.' },
      { text: 'Open a faucet on the lowest floor to drain remaining pressure.' },
      { text: 'Take photos of the leak for our technician.' },
    ],
    successSignal: 'Water stops flowing from the affected area.',
    escalateIf: ['You cannot locate the shutoff valve', 'The valve is stuck or broken', 'Water is coming through electrical outlets or ceiling lights'],
  },
  {
    id: 'hvac-filter',
    title: 'Replace Your HVAC Air Filter',
    category: 'HVAC',
    icon: Wind,
    iconColor: '#818cf8',
    description: 'A clogged filter is the #1 cause of HVAC failure. Replacing it takes 5 minutes and costs $10.',
    estimatedTime: '5 min',
    difficulty: 'Easy',
    savesCost: 'Saves ~$300 diagnostic call',
    steps: [
      { text: 'Turn off your thermostat or HVAC unit.' },
      { text: 'Locate the filter — usually in a return air vent (large grate on wall or ceiling) or in the air handler unit itself.', tip: 'The return air vent is the one that sucks air in — it\'s usually larger than the supply vents.' },
      { text: 'Slide out the old filter. Check the arrow printed on the frame — it shows airflow direction.' },
      { text: 'Note the size printed on the old filter (e.g., 16x25x1). Buy the same size at any hardware store.' },
      { text: 'Slide the new filter in with the arrow pointing toward the air handler (away from you, into the unit).' },
      { text: 'Turn the system back on and set the thermostat 5° above current room temperature.' },
    ],
    successSignal: 'System starts, air flows from vents within 5–10 minutes.',
    escalateIf: ['System starts but blows warm air in cooling mode', 'Ice forms on the outdoor unit', 'You hear unusual grinding or banging noises'],
  },
  {
    id: 'toilet-running',
    title: 'Fix a Running Toilet',
    category: 'Plumbing',
    icon: Droplets,
    iconColor: '#60a5fa',
    description: 'A constantly running toilet wastes 200 gallons/day and adds $70/month to your water bill.',
    estimatedTime: '10 min',
    difficulty: 'Easy',
    savesCost: 'Saves $70/month on water bill',
    steps: [
      { text: 'Remove the tank lid (the back part of the toilet — not the bowl).' },
      { text: 'Look inside. If the flapper (rubber flap at the bottom) looks warped, discolored, or doesn\'t seat flat, that\'s your issue.', tip: 'Press down on the flapper with your finger. If the water stops running, the flapper needs replacing.' },
      { text: 'Shut off the water supply valve behind the toilet (turn clockwise).' },
      { text: 'Flush to empty the tank. Unhook the old flapper from the ears on the overflow tube and the chain from the flush handle.' },
      { text: 'Take the old flapper to a hardware store. Buy an identical replacement ($5–10).' },
      { text: 'Attach the new flapper to the overflow tube ears. Hook the chain to the flush handle with about 1/2 inch of slack.' },
      { text: 'Turn the water back on and test. The toilet should fill and stop.' },
    ],
    successSignal: 'Toilet fills and water stops running completely.',
    escalateIf: ['The toilet is still running after flapper replacement', 'Water is leaking around the base of the toilet', 'The fill valve (the tall component) is hissing or clearly broken'],
  },
  {
    id: 'gfci-reset',
    title: 'Reset a GFCI Outlet',
    category: 'Electrical',
    icon: Zap,
    iconColor: '#fbbf24',
    description: 'Dead outlets in kitchens, bathrooms, or outdoors are almost always a tripped GFCI — not an electrician issue.',
    estimatedTime: '2 min',
    difficulty: 'Easy',
    savesCost: 'Saves ~$150 service call',
    steps: [
      { text: 'Look for an outlet with two small buttons in the center — labeled RESET and TEST. These are GFCI outlets, usually in bathrooms, kitchens, and garages.' },
      { text: 'Press the RESET button firmly. You should hear a click.', tip: 'If the RESET button doesn\'t click or pop out, the outlet itself may be faulty.' },
      { text: 'Test the outlet by plugging in a lamp or phone charger.' },
      { text: 'Important: one GFCI outlet can protect multiple regular outlets on the same circuit. Check all GFCI outlets in adjacent rooms if the one you found doesn\'t reset.' },
    ],
    successSignal: 'Outlet powers your device normally.',
    escalateIf: ['The RESET button pops back out immediately', 'Outlet feels warm or shows scorch marks', 'Multiple GFCI outlets have tripped at the same time'],
  },
  {
    id: 'pilot-light',
    title: 'Relight Your Water Heater Pilot Light',
    category: 'Plumbing',
    icon: Home,
    iconColor: '#f87171',
    description: 'No hot water? A pilot light that went out is usually why — and you can relight it safely in 5 minutes.',
    estimatedTime: '5 min',
    difficulty: 'Medium',
    savesCost: 'Saves ~$200 after-hours call',
    steps: [
      { text: 'Locate your water heater — usually in a garage, basement, or utility closet.' },
      { text: 'Find the control knob (usually red or black) at the base of the heater. Turn it to the OFF position and wait 5 minutes for any residual gas to clear.', warning: 'If you smell strong gas, do not proceed. Evacuate and call your gas company.' },
      { text: 'Turn the control knob to PILOT.' },
      { text: 'Find the pilot access panel or tube — a small opening near the burner at the bottom. Hold a long-reach lighter or match near the pilot opening.' },
      { text: 'Press and hold the control knob (or a red ignitor button) while you apply the flame or press the ignitor. Keep holding for 30–60 seconds after the pilot lights.' },
      { text: 'Slowly release the knob. If the pilot stays lit, turn the control knob to your desired temperature setting (usually 120°F/medium).' },
    ],
    successSignal: 'Pilot flame stays lit when you release the button. Hot water returns within 30–60 minutes.',
    escalateIf: ['Pilot won\'t stay lit after multiple attempts', 'You smell gas at any point', 'The water heater is more than 12 years old and having issues'],
  },
  {
    id: 'frozen-pipes',
    title: 'Thaw Frozen Pipes Safely',
    category: 'Plumbing',
    icon: Droplets,
    iconColor: '#60a5fa',
    description: 'Frozen pipes can burst if you\'re not careful. Here\'s how to thaw them without causing damage.',
    estimatedTime: '20–60 min',
    difficulty: 'Medium',
    savesCost: 'Prevents $2,000–$15,000 pipe burst damage',
    steps: [
      { text: 'Open the faucet connected to the suspected frozen pipe — even just a trickle. This relieves pressure and helps you confirm when water flows again.' },
      { text: 'Locate the frozen section — typically an exterior wall, unheated crawl space, or area near the garage.' },
      { text: 'Apply heat starting from the faucet end and working toward the frozen section. Safe heat sources: electric heating pad, hair dryer on low, warm towels.', warning: 'NEVER use open flame, propane torch, or kerosene heater — this can cause fires or burst the pipe.' },
      { text: 'Move the heat source slowly along the pipe. Don\'t concentrate heat in one spot.' },
      { text: 'When water flows freely from the faucet, the pipe is thawed.' },
      { text: 'Let a thin trickle of water run overnight from both cold and hot sides on cold nights to prevent re-freezing.' },
    ],
    successSignal: 'Water flows normally from the faucet.',
    escalateIf: ['You hear cracking or the pipe appears bulged', 'Water starts spraying or spurting when the pipe thaws', 'You cannot locate or safely access the frozen section'],
  },
  {
    id: 'ac-not-cooling',
    title: 'AC Running But Not Cooling',
    category: 'HVAC',
    icon: Wind,
    iconColor: '#818cf8',
    description: 'Three quick checks fix most cooling failures without a service call.',
    estimatedTime: '15 min',
    difficulty: 'Easy',
    savesCost: 'Saves ~$250 diagnostic call',
    steps: [
      { text: 'Check the air filter. A severely clogged filter starves the system of airflow, preventing cooling. Replace if grey/packed.' },
      { text: 'Go outside and look at the condenser unit. Is it running? Is the fan spinning? Clear any leaves, mulch, or debris blocking the unit within 2 feet.' },
      { text: 'Look at the indoor air handler — is there ice forming on the refrigerant lines (copper tubes going into the wall)? If yes, turn the system to FAN ONLY for 2–3 hours to let it defrost.', tip: 'Ice on the lines is almost always caused by a dirty filter or blocked airflow.' },
      { text: 'After defrost, replace the filter and try cooling again.' },
      { text: 'Check your thermostat — verify it\'s set to COOL, the temperature is set below the current room temperature, and the fan is set to AUTO.' },
    ],
    successSignal: 'Air coming from vents feels noticeably cool within 10–15 minutes.',
    escalateIf: ['Ice keeps returning after defrost', 'You hear loud clanking or squealing from the outdoor unit', 'The system runs but airflow is very weak even with a clean filter'],
  },
];

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'HVAC'];

export default function SelfServiceHub() {
  const [activeGuide, setActiveGuide] = useState<Guide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompleted] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [outcome, setOutcome] = useState<'success' | 'fail' | null>(null);
  const [helpfulRatings, setHelpfulRatings] = useState<Record<string, boolean | null>>({});

  function startGuide(guide: Guide) {
    setActiveGuide(guide);
    setCurrentStep(0);
    setCompleted(new Set());
    setOutcome(null);
  }

  function completeStep(i: number) {
    const next = new Set(completedSteps);
    next.add(i);
    setCompleted(next);
    if (i < (activeGuide?.steps.length || 0) - 1) {
      setTimeout(() => setCurrentStep(i + 1), 300);
    }
  }

  function markOutcome(o: 'success' | 'fail') {
    setOutcome(o);
    if (o === 'success') toast.success('Great job! Issue resolved without a service call.');
    else toast.info('No worries — we\'ll get someone to you shortly.');
  }

  const filteredGuides = GUIDES.filter(g => {
    const matchesCat = category === 'All' || g.category === category;
    const matchesSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const difficultyColor = { Easy: '#4ade80', Medium: '#fbbf24', Hard: '#f87171' };

  if (activeGuide) {
    const allDone = completedSteps.size === activeGuide.steps.length;
    return (
      <div className="min-h-screen p-4 sm:p-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setActiveGuide(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to guides
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: activeGuide.iconColor + '20', border: `1px solid ${activeGuide.iconColor}30` }}>
              <activeGuide.icon className="w-6 h-6" style={{ color: activeGuide.iconColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{activeGuide.title}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activeGuide.estimatedTime}</span>
                <span style={{ color: difficultyColor[activeGuide.difficulty] }}>{activeGuide.difficulty}</span>
                <span style={{ color: '#4ade80' }}>{activeGuide.savesCost}</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-xl p-3 mb-5 flex items-center gap-3" style={{ background: '#111' }}>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(completedSteps.size / activeGuide.steps.length) * 100}%`, background: activeGuide.iconColor }} />
            </div>
            <span className="text-xs font-black text-gray-400">{completedSteps.size}/{activeGuide.steps.length}</span>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {activeGuide.steps.map((step, i) => {
              const done = completedSteps.has(i);
              const active = i === currentStep && !done;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-5" style={{ background: done ? 'rgba(74,222,128,0.06)' : active ? 'rgba(255,255,255,0.05)' : '#0d0d0d', border: `1px solid ${done ? 'rgba(74,222,128,0.2)' : active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`, opacity: i > currentStep && !done ? 0.4 : 1 }}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => !done && i === currentStep && completeStep(i)}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition"
                      style={{ background: done ? 'rgba(74,222,128,0.2)' : active ? activeGuide.iconColor + '20' : 'rgba(255,255,255,0.04)', border: `2px solid ${done ? '#4ade80' : active ? activeGuide.iconColor : 'rgba(255,255,255,0.1)'}`, cursor: i === currentStep && !done ? 'pointer' : 'default' }}>
                      {done ? <CheckCircle className="w-4 h-4 text-green-400" /> : <span className="text-xs font-black" style={{ color: active ? activeGuide.iconColor : '#6b7280' }}>{i + 1}</span>}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed" style={{ color: done ? '#9ca3af' : 'white' }}>{step.text}</p>
                      {step.tip && (
                        <div className="mt-2 px-3 py-2 rounded-lg text-xs text-blue-300" style={{ background: 'rgba(96,165,250,0.08)' }}>
                          💡 {step.tip}
                        </div>
                      )}
                      {step.warning && (
                        <div className="mt-2 px-3 py-2 rounded-lg text-xs text-red-300 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)' }}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {step.warning}
                        </div>
                      )}
                      {active && !done && (
                        <button onClick={() => completeStep(i)}
                          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                          style={{ background: activeGuide.iconColor + '20', color: activeGuide.iconColor, border: `1px solid ${activeGuide.iconColor}40` }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Done, next step
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Success signal */}
          {allDone && !outcome && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="font-black text-green-400 mb-1">✅ All steps complete!</p>
              <p className="text-sm text-gray-300 mb-4"><strong>Did it work?</strong> {activeGuide.successSignal}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => markOutcome('success')}
                  className="py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 transition"
                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <ThumbsUp className="w-4 h-4" /> Yes, fixed!
                </button>
                <button onClick={() => markOutcome('fail')}
                  className="py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 transition"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <ThumbsDown className="w-4 h-4" /> Still having issues
                </button>
              </div>
            </motion.div>
          )}

          {/* Outcome cards */}
          {outcome === 'success' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl p-5 text-center" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-black text-green-400 text-lg">Problem solved!</p>
              <p className="text-xs text-gray-500 mt-1">You just saved yourself a service call. No technician needed.</p>
            </motion.div>
          )}
          {outcome === 'fail' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="font-black text-red-400">Time to get a professional</p>
              <p className="text-xs text-gray-400 mb-3">Escalate if any of these apply:</p>
              {activeGuide.escalateIf.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" /> {r}
                </div>
              ))}
              <a href="tel:6145550911" className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition mt-3"
                style={{ background: '#ef4444' }}>
                <Phone className="w-4 h-4" /> Call Emergency Line: (614) 555-0911
              </a>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}>
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Self-Service Fix Hub</h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">Fix common issues yourself before calling anyone. Step-by-step guides written for non-plumbers and non-electricians.</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-4 py-2 rounded-lg text-sm font-black transition"
                style={category === c ? { background: '#3b82f6', color: 'white' } : { color: '#6b7280' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Guides Available', value: GUIDES.length, color: '#60a5fa' },
            { label: 'Avg Time to Fix', value: '8 min', color: '#4ade80' },
            { label: 'Calls Prevented', value: '60%', color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Guide grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredGuides.map(guide => (
            <motion.button key={guide.id} whileHover={{ y: -2 }} onClick={() => startGuide(guide)}
              className="text-left rounded-2xl p-5 group transition hover:brightness-110"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: guide.iconColor + '15', border: `1px solid ${guide.iconColor}25` }}>
                  <guide.icon className="w-6 h-6" style={{ color: guide.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm text-white group-hover:text-blue-300 transition">{guide.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{guide.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                      ⏱ {guide.estimatedTime}
                    </span>
                    <span className="text-[10px] font-black" style={{ color: difficultyColor[guide.difficulty] }}>{guide.difficulty}</span>
                    <span className="text-[10px] font-black text-green-400">{guide.savesCost}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition flex-shrink-0 mt-1" />
              </div>
            </motion.button>
          ))}
        </div>

        {filteredGuides.length === 0 && (
          <div className="text-center py-16 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No guides match your search</p>
            <button onClick={() => { setSearch(''); setCategory('All'); }} className="mt-2 text-xs text-blue-400 hover:underline">Clear filters</button>
          </div>
        )}

        {/* Emergency CTA */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-black text-white">Issue too serious to DIY?</p>
            <p className="text-xs text-gray-400">Fire, gas smell, sparks, flooding — these need immediate professional response. Don't guess.</p>
          </div>
          <a href="tel:6145550911" className="px-5 py-3 rounded-xl font-black text-sm text-white flex items-center gap-2 hover:brightness-110 transition flex-shrink-0"
            style={{ background: '#ef4444' }}>
            <Phone className="w-4 h-4" /> Call Now
          </a>
        </div>
      </div>
    </div>
  );
}
