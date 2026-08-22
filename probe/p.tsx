import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/globals.css';
import DirectoryLandingPage from '../src/app/pages/DirectoryLandingPage';

const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e: any) => errors.push('rej: ' + String(e.reason?.message || e.reason)));

const realFetch = window.fetch.bind(window);
window.fetch = async (input: any, init?: any) => {
  const url = String(typeof input === 'string' ? input : input?.url || '');
  if (url.includes('supabase.co')) return new Response(JSON.stringify({ success: true, ads: [], data: [], towns: [] }), { headers: { 'Content-Type': 'application/json' } });
  return realFetch(input, init);
};

createRoot(document.getElementById('root')!).render(<StrictMode><DirectoryLandingPage onNavigate={() => {}} /></StrictMode>);

setTimeout(() => {
  // Anything that sits over the page: fixed/absolute full-cover layers, and
  // anything with a high z-index that is actually visible.
  const overlays = [...document.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e as HTMLElement);
    const r = (e as HTMLElement).getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    if (!['fixed', 'absolute'].includes(cs.position)) return false;
    const coversMost = r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.5;
    const highZ = Number(cs.zIndex) >= 40;
    return coversMost || (highZ && r.width > 200 && r.height > 100);
  }).map((e) => {
    const cs = getComputedStyle(e as HTMLElement); const r = (e as HTMLElement).getBoundingClientRect();
    return `${(e as HTMLElement).tagName}.${String((e as HTMLElement).className).slice(0, 52)} z=${cs.zIndex} pos=${cs.position} ${Math.round(r.width)}x${Math.round(r.height)} :: ${((e as HTMLElement).innerText || '').replace(/\s+/g, ' ').slice(0, 60)}`;
  });

  (window as any).__probe = {
    errors, rendered: (document.body.innerText || '').length,
    overlays: overlays.slice(0, 8), overlayCount: overlays.length,
    bodyOverflow: getComputedStyle(document.body).overflow,
    firstText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 260),
  };
  document.title = 'PROBE-DONE';
}, 3200);
