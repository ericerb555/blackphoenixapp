/**
 * The company logo, as bytes jsPDF can actually draw.
 *
 * WHY A HOOK RATHER THAN A COPY
 *
 * `doc.addImage` is SYNCHRONOUS and wants a data URL; the company record
 * holds an http URL. So the fetch and the base64 decode have to have
 * finished before the Download click, not during it. That is fiddly enough
 * to get subtly wrong twice — the quote editor already does it, and the
 * invoice preview now needs exactly the same thing. Two copies of an async
 * decode that silently yields an unmarked PDF when it fails is one copy too
 * many.
 *
 * A LOGO THAT WILL NOT LOAD IS NOT AN ERROR
 *
 * It resolves to an empty string and the PDF simply has no mark on it. The
 * layout sets the company name in type when there is no image. A missing
 * logo is a worse-looking document; a thrown error is no document at all,
 * and the document is the thing somebody is trying to send.
 */
import { useEffect, useState } from 'react';
import { CompanyDatabaseService } from './services/companyDatabaseService';
import { pickMainAppCompany } from './config/companyInfo';

/**
 * Resolve the main app company's logo and decode it.
 *
 * Returns '' until it is ready, and '' forever if there is none — callers
 * pass it straight to the PDF layout, which treats empty as "no logo".
 */
export function useCompanyLogoDataUrl(): string {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let url = '';
      try {
        /**
         * Always the main app business, never the ecommerce store. A quote
         * or an invoice is from the building company, and picking whichever
         * company came back first put the wrong mark on paperwork.
         */
        const { data: companies } = await CompanyDatabaseService.getCompanies({ withLogos: true });
        url = pickMainAppCompany(companies || [])?.logo_url || '';

        if (!url) {
          // Only as a fallback. The cache can be stale, and a stale logo is
          // better than none but worse than the record's own.
          const cached = localStorage.getItem('company_logo_variants');
          if (cached) {
            const parsed = JSON.parse(cached);
            url = parsed?.logo_primary || parsed?.logo_secondary || '';
          }
        }
      } catch {
        // Nothing to say. The document prints without a logo.
      }

      if (cancelled || !url) { if (!cancelled) setDataUrl(''); return; }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const decoded: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setDataUrl(decoded);
      } catch {
        if (!cancelled) setDataUrl('');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return dataUrl;
}
