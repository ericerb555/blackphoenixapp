/**
 * Treasury Balance Panel
 *
 * Read-only live balances for both standalone Stripe accounts (Black Phoenix
 * Builds services + The Black Phoenix Company e-commerce) and the Stellar
 * receiving wallet. All lookups happen on the edge function so no secret key
 * ever reaches the browser.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Banknote,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface StripeAccountBalance {
  id: string;
  label: string;
  configured: boolean;
  keyEnv: string | null;
  expectedKeyEnvs?: string[];
  liveMode?: boolean;
  available?: Record<string, number>;
  pending?: Record<string, number>;
  reserved?: Record<string, number>;
  account?: {
    id: string;
    businessName: string | null;
    country: string | null;
    defaultCurrency: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null;
  recentPayouts?: { id: string; amount: number; currency: string; status: string; arrivalDate: string | null }[];
  error?: string;
}

interface StellarBalance {
  enabled: boolean;
  configured: boolean;
  network: string;
  publicKey: string;
  assetCode: string;
  horizon?: string;
  funded?: boolean;
  balances?: { assetCode: string; assetIssuer: string; balance: number; native: boolean }[];
  trackedBalance?: number | null;
  lastModified?: string | null;
  error?: string;
}

interface TreasuryResponse {
  fetchedAt: string;
  stripeAccounts: StripeAccountBalance[];
  stellar: StellarBalance;
  totals: { usdAvailable: number; usdPending: number };
}

const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

function formatCurrencyMap(map?: Record<string, number>) {
  const entries = Object.entries(map || {});
  if (entries.length === 0) return [{ currency: 'USD', amount: 0 }];
  return entries.map(([currency, amount]) => ({ currency, amount }));
}

export function TreasuryBalancePanel() {
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in as the platform owner to view treasury balances.');
      const response = await fetch(`${SERVER}/treasury/balances`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Treasury balances request failed with status ${response.status}`);
      }
      setData(result);
      if (showToast) toast.success('Balances refreshed');
    } catch (err: any) {
      console.error('[TreasuryBalancePanel] Failed to load treasury balances:', err);
      setError(err?.message || 'Unable to load treasury balances.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white sm:text-2xl">Treasury Balances</h2>
          <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
            Live funds across both Stripe accounts and the Stellar receiving wallet
            {data?.fetchedAt ? ` · updated ${new Date(data.fetchedAt).toLocaleTimeString()}` : ''}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-white hover:border-[#ea580c] disabled:opacity-50 sm:px-4"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">Could not load balances</p>
              <p className="mt-1 text-xs text-red-200/80 sm:text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Totals */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Card className="border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400 sm:text-sm">
              <Banknote className="h-4 w-4 text-green-400" /> Stripe available (USD)
            </div>
            <p className="mt-2 text-xl font-bold text-white sm:text-3xl">{usd(data.totals.usdAvailable)}</p>
            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">Combined across both accounts</p>
          </Card>
          <Card className="border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400 sm:text-sm">
              <Clock className="h-4 w-4 text-yellow-400" /> Stripe pending (USD)
            </div>
            <p className="mt-2 text-xl font-bold text-white sm:text-3xl">{usd(data.totals.usdPending)}</p>
            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">Settling into available balance</p>
          </Card>
          <Card className="border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400 sm:text-sm">
              <Wallet className="h-4 w-4 text-cyan-400" /> Stellar {data.stellar.assetCode}
            </div>
            <p className="mt-2 text-xl font-bold text-white sm:text-3xl">
              {typeof data.stellar.trackedBalance === 'number'
                ? data.stellar.trackedBalance.toLocaleString('en-US', { maximumFractionDigits: 7 })
                : '—'}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
              On-chain balance, not converted to USD
            </p>
          </Card>
        </div>
      )}

      {/* Stripe accounts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {(data?.stripeAccounts || []).map((account) => (
          <Card key={account.id} className="border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 flex-shrink-0 text-[#ea580c]" />
                  <h3 className="truncate text-sm font-bold text-white sm:text-base">{account.label}</h3>
                </div>
                <p className="mt-1 truncate text-[11px] text-gray-500 sm:text-xs">
                  {account.account?.businessName || account.account?.id || 'Stripe account'}
                  {account.keyEnv ? ` · ${account.keyEnv}` : ''}
                </p>
              </div>
              {account.configured && !account.error ? (
                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase sm:text-xs ${account.liveMode ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {account.liveMode ? 'Live' : 'Test'}
                </span>
              ) : (
                <span className="flex-shrink-0 rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-bold uppercase text-red-400 sm:text-xs">
                  Attention
                </span>
              )}
            </div>

            {account.error ? (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3">
                <p className="text-xs text-red-200 sm:text-sm">{account.error}</p>
                {!account.configured && account.expectedKeyEnvs && (
                  <p className="mt-2 text-[11px] text-red-200/70 sm:text-xs">
                    Add one of: {account.expectedKeyEnvs.join(', ')} in Supabase → Project Settings → Edge Functions → Secrets, then redeploy the server function.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#2a2a2a] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 sm:text-xs">Available</p>
                    {formatCurrencyMap(account.available).map((entry) => (
                      <p key={entry.currency} className="mt-1 text-base font-bold text-green-400 sm:text-xl">
                        {entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1 text-[11px] font-semibold text-gray-500">{entry.currency}</span>
                      </p>
                    ))}
                  </div>
                  <div className="rounded-lg border border-[#2a2a2a] bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 sm:text-xs">Pending</p>
                    {formatCurrencyMap(account.pending).map((entry) => (
                      <p key={entry.currency} className="mt-1 text-base font-bold text-yellow-400 sm:text-xl">
                        {entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1 text-[11px] font-semibold text-gray-500">{entry.currency}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${account.account?.chargesEnabled ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                    {account.account?.chargesEnabled ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    Charges {account.account?.chargesEnabled ? 'enabled' : 'disabled'}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${account.account?.payoutsEnabled ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                    {account.account?.payoutsEnabled ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    Payouts {account.account?.payoutsEnabled ? 'enabled' : 'disabled'}
                  </span>
                </div>

                {(account.recentPayouts || []).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs">Recent payouts</p>
                    <div className="space-y-1.5">
                      {account.recentPayouts!.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-2 text-[11px] sm:text-xs">
                          <span className="text-gray-300">
                            {payout.arrivalDate ? new Date(payout.arrivalDate).toLocaleDateString() : '—'}
                          </span>
                          <span className="font-semibold text-white">
                            {payout.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {payout.currency}
                          </span>
                          <span className="capitalize text-gray-400">{payout.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Stellar wallet */}
      {data?.stellar && (
        <Card className="border-cyan-500/25 bg-[#1a1a1a] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                <h3 className="text-sm font-bold text-white sm:text-base">Stellar Receiving Wallet</h3>
              </div>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                {data.stellar.network === 'testnet' ? 'Testnet' : 'Public network'} · receive-only address
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase sm:text-xs ${data.stellar.enabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-500/20 text-gray-400'}`}>
                {data.stellar.enabled ? 'Accepting' : 'Disabled'}
              </span>
              {data.stellar.publicKey && (
                <a
                  href={`https://stellar.expert/explorer/${data.stellar.network === 'testnet' ? 'testnet' : 'public'}/account/${data.stellar.publicKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 sm:text-xs"
                >
                  View on explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {data.stellar.publicKey && (
            <code className="mt-3 block break-all rounded-lg bg-black/40 p-2.5 text-[11px] text-cyan-200 sm:text-xs">
              {data.stellar.publicKey}
            </code>
          )}

          {data.stellar.error ? (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-xs text-amber-200 sm:text-sm">{data.stellar.error}</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(data.stellar.balances || []).map((entry) => (
                <div key={`${entry.assetCode}-${entry.assetIssuer}`} className="rounded-lg border border-[#2a2a2a] bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white sm:text-sm">
                      {entry.assetCode}
                      {entry.native && <span className="ml-1 text-[10px] font-normal text-gray-500">native</span>}
                    </span>
                    <span className="text-sm font-bold text-cyan-300 sm:text-base">
                      {entry.balance.toLocaleString('en-US', { maximumFractionDigits: 7 })}
                    </span>
                  </div>
                  {entry.assetIssuer && (
                    <p className="mt-1 truncate text-[10px] text-gray-500">Issuer: {entry.assetIssuer}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-500 sm:text-xs">
            Crypto balances are on-chain amounts. USD invoices stay open until a Stellar transfer is reconciled.
          </p>
        </Card>
      )}

      {isLoading && !data && (
        <Card className="border-[#2a2a2a] bg-[#1a1a1a] p-10">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-[#ea580c]" />
          </div>
        </Card>
      )}
    </div>
  );
}

export default TreasuryBalancePanel;
