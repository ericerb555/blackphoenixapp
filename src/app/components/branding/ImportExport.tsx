/**
 * Import/Export Section Component
 * Handles: brand kit import, design token import, stock photo search, brand kit export
 * Modular Architecture
 */

import { useRef, useState } from 'react';
import { ExternalLink, Camera, Download, LayoutGrid, Palette, FileText, Loader2, Search, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { BrandingSettings, ColorPalette, Color } from './types';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface StockPhoto {
  id: string;
  description: string;
  thumb: string;
  full: string;
  download: string;
  photographer: string;
  photographerUrl: string;
  link: string;
}

interface ImportExportProps {
  settings: BrandingSettings;
  onUpdate?: (updates: Partial<BrandingSettings>) => void;
  onAddAsset?: (asset: { name: string; url: string; credit?: string }) => void;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function downloadFile(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Pull colors out of whatever token file was handed to us. Supports flat maps
 * ({ primary: "#ea580c" }), W3C design tokens ({ primary: { $value: "#..." } })
 * and arbitrary nesting, which covers Figma/Style Dictionary/Tailwind exports.
 */
function extractColors(node: any, path: string[] = [], out: Color[] = []): Color[] {
  if (out.length >= 60 || node == null) return out;

  if (typeof node === 'string') {
    if (HEX.test(node.trim())) out.push({ name: path.join(' / ') || 'Color', hex: node.trim().toLowerCase() });
    return out;
  }
  if (typeof node !== 'object') return out;

  // W3C design token leaf
  const value = (node as any).$value ?? (node as any).value;
  if (typeof value === 'string' && HEX.test(value.trim())) {
    out.push({
      name: path.join(' / ') || 'Color',
      hex: value.trim().toLowerCase(),
      usage: (node as any).$description || (node as any).description || undefined,
    });
    return out;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    extractColors(child, [...path, key], out);
  }
  return out;
}

function extractFonts(node: any, found: { heading?: string; body?: string } = {}): { heading?: string; body?: string } {
  if (!node || typeof node !== 'object') return found;
  for (const [key, child] of Object.entries(node)) {
    const lower = key.toLowerCase();
    const value = typeof child === 'string' ? child : (child as any)?.$value ?? (child as any)?.value;
    if (typeof value === 'string' && /font|family|typeface/.test(lower)) {
      if (/head|display|title/.test(lower) && !found.heading) found.heading = value;
      else if (!found.body) found.body = value;
    }
    if (child && typeof child === 'object') extractFonts(child, found);
  }
  return found;
}

export function ImportExport({ settings, onUpdate, onAddAsset }: ImportExportProps) {
  const kitInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const palettes = settings.colorPalettes || [];
  const logos = settings.logos || [];

  // ── Imports ────────────────────────────────────────────────────────────────

  const readJson = async (file: File): Promise<any> => {
    const text = await file.text();
    return JSON.parse(text);
  };

  const handleImportKit = async (file: File) => {
    if (!onUpdate) return toast.error('This view is read-only, so a brand kit cannot be imported here.');
    try {
      const data = await readJson(file);
      const updates: Partial<BrandingSettings> = {};

      if (typeof data.companyName === 'string' && data.companyName.trim()) updates.companyName = data.companyName;
      if (typeof data.tagline === 'string') updates.tagline = data.tagline;
      if (Array.isArray(data.logos)) updates.logos = data.logos;
      if (Array.isArray(data.colorPalettes)) updates.colorPalettes = data.colorPalettes;
      else if (Array.isArray(data.colors)) updates.colorPalettes = data.colors;
      if (data.typography && typeof data.typography === 'object') updates.typography = data.typography;

      if (Object.keys(updates).length === 0) {
        return toast.error('That file has no brand kit fields we recognise (companyName, logos, colors, typography).');
      }

      onUpdate(updates);
      toast.success(`Imported ${Object.keys(updates).join(', ')} from ${file.name}`);
    } catch (err: any) {
      console.error('[Branding] Brand kit import failed:', err);
      toast.error(`Could not read ${file.name}: ${err?.message || 'invalid JSON'}`);
    }
  };

  const handleImportTokens = async (file: File) => {
    if (!onUpdate) return toast.error('This view is read-only, so tokens cannot be imported here.');
    try {
      const data = await readJson(file);
      const colors = extractColors(data);
      const fonts = extractFonts(data);

      if (colors.length === 0 && !fonts.heading && !fonts.body) {
        return toast.error('No colors or font families were found in that token file.');
      }

      const updates: Partial<BrandingSettings> = {};

      if (colors.length > 0) {
        // Dedupe by hex so a token file with aliases doesn't produce 40 copies.
        const seen = new Set<string>();
        const unique = colors.filter(c => (seen.has(c.hex) ? false : (seen.add(c.hex), true)));
        const imported: ColorPalette = {
          id: `palette_${Date.now()}`,
          name: `Imported — ${file.name.replace(/\.json$/i, '')}`,
          colors: unique,
          isDefault: palettes.length === 0,
        };
        updates.colorPalettes = [...palettes, imported];
      }

      if (fonts.heading || fonts.body) {
        updates.typography = {
          ...settings.typography,
          headingFont: fonts.heading || settings.typography?.headingFont || '',
          bodyFont: fonts.body || settings.typography?.bodyFont || '',
          fontPairings: settings.typography?.fontPairings || [],
        };
      }

      onUpdate(updates);
      toast.success(`Imported ${colors.length} color${colors.length === 1 ? '' : 's'}${fonts.heading || fonts.body ? ' and font families' : ''}`);
    } catch (err: any) {
      console.error('[Branding] Token import failed:', err);
      toast.error(`Could not read ${file.name}: ${err?.message || 'invalid JSON'}`);
    }
  };

  // ── Stock photos ───────────────────────────────────────────────────────────

  const searchPhotos = async () => {
    const q = query.trim();
    if (!q) return toast.error('Type what you are looking for first.');
    try {
      setSearching(true);
      setSearchError(null);
      setSearched(true);
      const res = await fetch(`${SERVER}/stock-photos/search?q=${encodeURIComponent(q)}&perPage=24`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Search failed with status ${res.status}`);
      setPhotos(data.photos || []);
      if ((data.photos || []).length === 0) toast.info(`No photos matched “${q}”.`);
    } catch (err: any) {
      console.error('[Branding] Stock photo search failed:', err);
      setPhotos([]);
      setSearchError(err?.message || 'Stock photo search failed.');
    } finally {
      setSearching(false);
    }
  };

  const usePhoto = (photo: StockPhoto) => {
    if (!onAddAsset) {
      window.open(photo.full, '_blank', 'noopener');
      return;
    }
    onAddAsset({
      name: photo.description.slice(0, 80) || 'Stock photo',
      url: photo.full,
      credit: `Photo by ${photo.photographer} on Unsplash`,
    });
    toast.success('Added to your asset library');
  };

  // ── Exports ────────────────────────────────────────────────────────────────

  const handleExportJSON = () => {
    downloadFile(
      JSON.stringify({
        companyName: settings.companyName,
        tagline: settings.tagline,
        logos,
        colorPalettes: palettes,
        typography: settings.typography,
        exportedAt: new Date().toISOString(),
      }, null, 2),
      `brand-kit-${Date.now()}.json`,
      'application/json',
    );
    toast.success('Brand kit exported as JSON');
  };

  const buildGuideHtml = () => {
    const paletteHtml = palettes.map(p => `
      <section>
        <h3>${escapeHtml(p.name)}${p.isDefault ? ' <span class="tag">Default</span>' : ''}</h3>
        <div class="swatches">
          ${(p.colors || []).map(c => `
            <div class="swatch">
              <div class="chip" style="background:${escapeHtml(c.hex)}"></div>
              <div class="chip-name">${escapeHtml(c.name)}</div>
              <div class="chip-hex">${escapeHtml(c.hex)}</div>
              ${c.usage ? `<div class="chip-use">${escapeHtml(c.usage)}</div>` : ''}
            </div>`).join('')}
        </div>
      </section>`).join('');

    const logoHtml = logos.length ? `
      <section>
        <h3>Logos</h3>
        <div class="logos">
          ${logos.map(l => `
            <figure>
              ${l.url ? `<img src="${escapeHtml(l.url)}" alt="${escapeHtml(l.name)}" />` : '<div class="nologo">No file uploaded</div>'}
              <figcaption>${escapeHtml(l.name)}${l.isDefault ? ' · Primary' : ''}${l.description ? `<br><small>${escapeHtml(l.description)}</small>` : ''}</figcaption>
            </figure>`).join('')}
        </div>
      </section>` : '';

    const type = settings.typography;
    const typeHtml = type ? `
      <section>
        <h3>Typography</h3>
        <p class="type-sample" style="font-family:${escapeHtml(type.headingFont || 'inherit')}">
          Heading — ${escapeHtml(type.headingFont || 'not set')}
        </p>
        <p class="type-sample body" style="font-family:${escapeHtml(type.bodyFont || 'inherit')}">
          Body — ${escapeHtml(type.bodyFont || 'not set')}. The quick brown fox jumps over the lazy dog.
        </p>
        ${(type.fontPairings || []).length ? `<ul>${type.fontPairings.map(f =>
          `<li>${escapeHtml(f.name)}: ${escapeHtml(f.heading)} + ${escapeHtml(f.body)}${f.isActive ? ' (active)' : ''}</li>`).join('')}</ul>` : ''}
      </section>` : '';

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(settings.companyName || 'Brand')} — Brand Guidelines</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 48px 24px; color: #111; }
  header { border-bottom: 4px solid #ea580c; padding-bottom: 24px; margin-bottom: 40px; }
  h1 { margin: 0; font-size: 40px; }
  .tagline { color: #666; font-size: 18px; margin-top: 8px; }
  section { margin-bottom: 48px; page-break-inside: avoid; }
  h3 { font-size: 20px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .tag { font-size: 11px; background: #ea580c; color: #fff; padding: 2px 8px; border-radius: 999px; vertical-align: middle; }
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
  .chip { height: 80px; border-radius: 8px; border: 1px solid rgba(0,0,0,.1); }
  .chip-name { font-weight: 600; font-size: 13px; margin-top: 8px; }
  .chip-hex { font-family: ui-monospace, monospace; font-size: 12px; color: #666; }
  .chip-use { font-size: 11px; color: #888; margin-top: 4px; }
  .logos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
  figure { margin: 0; }
  figure img { max-width: 100%; background: #f6f6f6; border-radius: 8px; padding: 12px; }
  .nologo { background: #f6f6f6; border-radius: 8px; padding: 32px; text-align: center; color: #999; font-size: 12px; }
  figcaption { font-size: 13px; margin-top: 8px; color: #444; }
  .type-sample { font-size: 30px; margin: 16px 0 4px; }
  .type-sample.body { font-size: 16px; color: #444; }
  footer { border-top: 1px solid #eee; padding-top: 16px; color: #999; font-size: 12px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(settings.companyName || 'Brand Guidelines')}</h1>
    ${settings.tagline ? `<p class="tagline">${escapeHtml(settings.tagline)}</p>` : ''}
  </header>
  ${logoHtml}
  ${paletteHtml || '<section><h3>Colors</h3><p>No palettes have been added yet.</p></section>'}
  ${typeHtml}
  <footer>Generated ${new Date().toLocaleString('en-US')}</footer>
</body></html>`;
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return toast.error('Your browser blocked the popup — allow popups for this site to export the PDF guide.');
    win.document.write(buildGuideHtml());
    win.document.close();
    // Give images a moment to load so they aren't blank in the printed output.
    win.onload = () => setTimeout(() => win.print(), 400);
    toast.success('Brand guide opened — choose “Save as PDF” in the print dialog');
  };

  const handleExportWebPage = () => {
    downloadFile(buildGuideHtml(), `brand-guide-${Date.now()}.html`, 'text/html');
    toast.success('Brand guide exported as a standalone web page');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <input
        ref={kitInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportKit(file);
          e.target.value = '';
        }}
      />
      <input
        ref={tokenInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportTokens(file);
          e.target.value = '';
        }}
      />

      {/* Import */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-[#ea580c]" />
          Import a brand kit
        </h4>

        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Bring in colors, fonts and logos from a brand kit you exported here, or from a design
            token file exported out of Figma, Style Dictionary or Tailwind.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => kitInputRef.current?.click()}
              className="p-4 text-left bg-[#0A0A0A] hover:bg-[#151515] border border-[#2A2A2A] hover:border-[#ea580c]/50 rounded-xl transition"
            >
              <LayoutGrid className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Import Brand Kit</p>
              <p className="text-xs text-gray-400 mt-1">A brand-kit JSON file exported from here</p>
            </button>

            <button
              onClick={() => tokenInputRef.current?.click()}
              className="p-4 text-left bg-[#0A0A0A] hover:bg-[#151515] border border-[#2A2A2A] hover:border-[#ea580c]/50 rounded-xl transition"
            >
              <Palette className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Import Design Tokens</p>
              <p className="text-xs text-gray-400 mt-1">Colors and font families from a tokens JSON</p>
            </button>
          </div>
        </div>
      </div>

      {/* Stock photos */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#ea580c]" />
          Stock photos
        </h4>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchPhotos(); }}
              placeholder="Search photos — e.g. “kitchen remodel”, “roofing crew”"
              className="w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-[#ea580c] focus:outline-none"
            />
          </div>
          <button
            onClick={searchPhotos}
            disabled={searching}
            className="px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {searchError && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertCircle className="mt-0.5 w-5 h-5 flex-shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200/90">{searchError}</p>
          </div>
        )}

        {photos.length > 0 && (
          <>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-[#2A2A2A]">
                  <img src={photo.thumb} alt={photo.description} className="w-full h-32 object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                    <button
                      onClick={() => usePhoto(photo)}
                      className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3" /> {onAddAsset ? 'Add to assets' : 'Open full size'}
                    </button>
                    <a
                      href={photo.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-300 hover:text-white text-center"
                    >
                      {photo.photographer} / Unsplash
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-600">
              Photos from Unsplash. Their license asks that you credit the photographer wherever the photo appears.
            </p>
          </>
        )}

        {searched && !searching && !searchError && photos.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">No photos matched that search.</p>
        )}
      </div>

      {/* Export */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#ea580c]" />
          Export Brand Kit
        </h4>

        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Export your logos, palettes and typography as a shareable guide or a machine-readable file.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleExportPDF}
              className="p-4 text-left bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <FileText className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">PDF Guide</p>
              <p className="text-xs text-gray-400 mt-1">Opens a print view — save as PDF</p>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-4 text-left bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <Download className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">JSON Export</p>
              <p className="text-xs text-gray-400 mt-1">Developer-friendly, re-importable</p>
            </button>

            <button
              onClick={handleExportWebPage}
              className="p-4 text-left bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <ExternalLink className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Web Page</p>
              <p className="text-xs text-gray-400 mt-1">Standalone HTML brand guide</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
