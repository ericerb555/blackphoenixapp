/**
 * The agents, as buttons.
 *
 * EVERY TILE HERE IS A REAL AGENT THAT HAS REALLY RUN.
 *
 * They come from `ai_call_log` by way of the activity summary — the name,
 * the call count, the cost and the state are all measured, not configured.
 * There is no array of plausible-sounding agents in this file, and that is
 * deliberate: a rail of invented tiles would be the one element of this
 * screen that lies, and it would lie about the exact thing the ledger was
 * built to make honest.
 *
 * The consequence is a rail that is SHORT at first, and sometimes empty.
 * That is the true state of the system and it is more useful than a grid
 * of decoration — an empty rail says "nothing has run in this window",
 * which is a real answer to a real question.
 *
 * SUB-AGENTS DO NOT EXIST YET, AND THIS SAYS SO.
 *
 * The last tile is not a sub-agent. It asks Phoenix where one would pay
 * for itself, using the automation_opportunities tool, which reads actual
 * backlogs. It is labelled as a question rather than dressed up as a
 * feature that is already there.
 */
import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  fetchSummary, agentStatus, agentLabel, formatCost, errorRatePercent,
  type AgentRollup, type ActivitySummary,
} from '../../lib/aiActivity';
import HoloFrame, { StatusDot } from './HoloFrame';

const TONE: Record<ReturnType<typeof agentStatus>, 'live' | 'warn' | 'bad' | 'idle'> = {
  healthy: 'live', degraded: 'warn', critical: 'bad', offline: 'idle',
};

export interface AgentRailProps {
  /** Ask Phoenix something — used by the tiles and by "propose an agent". */
  onAsk: (question: string) => void;
  /** Lets the page show WORKING while any agent has a call in flight. */
  onRunningChange?: (running: number) => void;
  className?: string;
}

export default function AgentRail({ onAsk, onRunningChange, className = '' }: AgentRailProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const s = await fetchSummary(24);
      setSummary(s);
      setError(null);
      onRunningChange?.(s.agents.reduce((n, a) => n + (a.running || 0), 0));
    } catch (e: any) {
      // Named rather than swallowed. An empty rail and a broken rail look
      // identical otherwise, and only one of them is worth acting on.
      setError(e?.message || 'The ledger could not be read.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Half a minute. Fast enough that a running call shows up while it is
    // still running; slow enough that an idle screen left open overnight
    // makes under three thousand requests rather than a hundred thousand.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const agents = (summary?.agents || [])
    .slice()
    .sort((a, b) => (b.running - a.running) || (b.total - a.total));

  return (
    <HoloFrame
      label="Agents"
      readout={
        loading ? 'reading…'
          : error ? 'unavailable'
            : `${agents.length} active · 24h`
      }
      className={className}
    >
      <div className="space-y-1.5 p-3">
        {error && (
          <p className="font-mono text-[10px] leading-relaxed text-rose-400/80">{error}</p>
        )}

        {!error && !loading && agents.length === 0 && (
          <p className="font-mono text-[10px] leading-relaxed text-gray-600">
            No agent has run in 24 hours. This is the real state of the
            system, not a loading failure.
          </p>
        )}

        {agents.map((a) => (
          <AgentTile key={a.agent} agent={a} onAsk={onAsk} />
        ))}

        {/*
          Not an agent. A question, asked of the tool that reads real
          backlogs, so the answer is grounded in what is actually piling up.
        */}
        <button
          onClick={() => onAsk('Where would a sub-agent running continuously pay for itself? Use automation_opportunities and be specific about what is piling up.')}
          className="group flex w-full items-center gap-2 rounded border border-dashed border-orange-500/25 px-2.5 py-2 text-left transition hover:border-orange-500/60 hover:bg-orange-500/5"
        >
          <Plus className="h-3 w-3 shrink-0 text-orange-400/60 transition group-hover:text-orange-300" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500 transition group-hover:text-orange-200">
            Propose a sub-agent
          </span>
        </button>

        <button
          onClick={load}
          className="flex w-full items-center justify-center gap-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-700 transition hover:text-gray-400"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} />
          refresh
        </button>
      </div>
    </HoloFrame>
  );
}

function AgentTile({ agent: a, onAsk }: { agent: AgentRollup; onAsk: (q: string) => void }) {
  const status = agentStatus(a);
  const errPct = errorRatePercent(a);

  return (
    <button
      onClick={() => onAsk(`What has the ${a.agent} agent been doing in the last 24 hours, what did it cost, and is anything wrong with it?`)}
      className="group w-full rounded border border-[#1C1C1C] bg-black/40 px-2.5 py-2 text-left transition hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
    >
      <div className="flex items-center gap-2">
        <StatusDot tone={TONE[status]} />
        <span className="flex-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-gray-300 transition group-hover:text-white">
          {agentLabel(a.agent)}
        </span>
        {a.running > 0 && (
          <span className="shrink-0 font-mono text-[9px] text-orange-400">
            {a.running} live
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2 pl-3.5 font-mono text-[9px] text-gray-600">
        <span>{a.total} calls</span>
        <span className="text-gray-800">│</span>
        {/*
          Always "est". The cost is derived from a published per-token rate,
          not read off an invoice, and the ledger has been careful about
          that distinction everywhere else.
        */}
        <span>est {formatCost(a.estimatedCostCents)}</span>
        {errPct > 0 && (
          <>
            <span className="text-gray-800">│</span>
            <span className={errPct >= 20 ? 'text-rose-400' : 'text-amber-400'}>
              {errPct}% err
            </span>
          </>
        )}
        {a.abandoned > 0 && (
          <>
            <span className="text-gray-800">│</span>
            {/* Not "running". A call open this long died with its handler. */}
            <span className="text-rose-400">{a.abandoned} stuck</span>
          </>
        )}
      </div>
    </button>
  );
}
