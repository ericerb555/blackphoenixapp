/**
 * CreateContentMenu — a compact "Create content" dropdown that drops onto any
 * product row (store catalog, digital admin, etc.) so an owner can launch
 * content for that product without first opening the Content Center's Create
 * tab and re-picking it.
 *
 * Tap a tool to open it with the product pre-selected, or check several tools
 * and "Send to N tools" to fan the same product out at once (e.g. an ad + a
 * social post in one click).
 *
 * The caller supplies a plain product shape; prices must already be in DOLLARS.
 */
import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  sendProductToContentTool,
  sendProductToContentTools,
  CONTENT_TARGET_LABEL,
  type ContentTarget,
} from '../lib/contentHandoff';
import type { UnifiedProduct } from '../lib/useAllProducts';

const ALL_TARGETS: ContentTarget[] = ['ad-studio', 'creator-studio', 'store-content', 'social-scheduler'];

export interface CreateContentMenuProps {
  product: UnifiedProduct;
  targets?: ContentTarget[];
  /** Render a tiny icon-only trigger (for dense action rows) vs. a labelled button. */
  compact?: boolean;
  className?: string;
}

export default function CreateContentMenu({
  product,
  targets = ALL_TARGETS,
  compact = false,
  className = '',
}: CreateContentMenuProps) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<ContentTarget[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setChecked([]);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (t: ContentTarget) =>
    setChecked((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const sendMulti = () => {
    const queued = sendProductToContentTools(product, checked);
    if (queued.length) {
      toast.success(
        queued.length === 1
          ? `Sent "${product.name}" to ${CONTENT_TARGET_LABEL[queued[0]]}`
          : `Sent "${product.name}" to ${queued.length} tools`,
      );
    }
    setOpen(false);
    setChecked([]);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setChecked([]);
        }}
        title="Create content for this product"
        className={
          compact
            ? 'p-1.5 rounded-lg text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition'
            : 'flex items-center gap-1.5 px-3 py-2 bg-orange-600/15 hover:bg-orange-600/25 text-orange-300 rounded-lg text-xs font-bold transition'
        }
      >
        <Sparkles className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {!compact && (
          <>
            Create content
            <ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-xl">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            Tap to open · check several to send at once
          </p>
          {targets.map((t) => {
            const isChecked = checked.includes(t);
            return (
              <div key={t} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-orange-600/10 transition">
                <button
                  onClick={() => toggle(t)}
                  className={`flex items-center justify-center w-4 h-4 rounded border transition ${
                    isChecked
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'border-[#3A3A3A] text-transparent hover:border-orange-500/50'
                  }`}
                  aria-label={`Toggle ${CONTENT_TARGET_LABEL[t]}`}
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    sendProductToContentTool(product, t);
                    setOpen(false);
                    setChecked([]);
                  }}
                  className="flex-1 text-left text-gray-300 hover:text-white transition"
                >
                  {CONTENT_TARGET_LABEL[t]}
                </button>
              </div>
            );
          })}
          {checked.length > 0 && (
            <button
              onClick={sendMulti}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
            >
              <Send className="w-3.5 h-3.5" /> Send to {checked.length} tool{checked.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
