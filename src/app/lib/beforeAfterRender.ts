/**
 * Draw the composition. Decides nothing.
 *
 * The other half of `beforeAfterLayout`: that one works out where everything
 * goes and touches no pixels, this one puts pixels where it is told and makes
 * no choices of its own. Keeping that line sharp is what lets the geometry be
 * tested at all — and it means a layout bug is in a file the test runner can
 * load, while a drawing bug is visible the moment you look at the preview.
 *
 * THE PHOTOGRAPHS ARE NOT TOUCHED
 *
 * No filter, no colour match, no sharpening, no "enhancement" of the after.
 * `drawImage` with the crop the layout chose, and nothing else. A
 * before-and-after is the one piece of marketing a builder has that the
 * customer can check against their own memory of the room, and a corrected
 * white balance on the after is the moment it stops being evidence.
 */
import type { Composition, Pane } from './beforeAfterLayout';

export interface Brand {
  name: string;
  website?: string;
  callToAction?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

export interface RenderInput {
  composition: Composition;
  before: HTMLImageElement | null;
  after: HTMLImageElement | null;
  brand: Brand;
  logo?: HTMLImageElement | null;
  /** Drawn across the foot of the image when set — a promotional line. */
  overlayText?: string;
}

/** Load an image from a URL or data URI, with CORS set for canvas export. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    /**
     * Without this a remote photograph taints the canvas and `toBlob` throws
     * a security error at the very end — after the design is on screen and
     * looking finished, which is the worst moment to discover it.
     */
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be loaded.'));
    img.src = src;
  });
}

const roundRect = (
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

/** The half of the canvas a seam layout clips each pane to. */
function clipForSeam(
  ctx: CanvasRenderingContext2D, comp: Composition, pane: Pane,
) {
  const { x, y, width, height } = pane.dest;
  ctx.beginPath();
  if (comp.divider.kind === 'diagonal') {
    // A corner-to-corner cut: before above the line, after below it.
    if (pane.role === 'before') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x, y + height);
    } else {
      ctx.moveTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
    }
  } else if (pane.role === 'before') {
    ctx.rect(x, y, width / 2, height);
  } else {
    ctx.rect(x + width / 2, y, width / 2, height);
  }
  ctx.closePath();
  ctx.clip();
}

export function renderBeforeAfter(canvas: HTMLCanvasElement, input: RenderInput): void {
  const { composition: comp, brand } = input;
  canvas.width = comp.canvas.width;
  canvas.height = comp.canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the design.');

  ctx.fillStyle = brand.secondaryColor || '#0A0A0A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* The photographs, each clipped to its own share of the canvas. */
  const seam = comp.divider.kind === 'diagonal'
    || (comp.divider.kind === 'vertical' && comp.panes.length === 2
      && comp.panes[0].dest.x === comp.panes[1].dest.x);

  for (const pane of comp.panes) {
    const img = pane.role === 'before' ? input.before : input.after;
    if (!img) {
      /* A pane with no photograph says so rather than drawing a black hole. */
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(pane.dest.x, pane.dest.y, pane.dest.width, pane.dest.height);
      continue;
    }
    ctx.save();
    if (seam) clipForSeam(ctx, comp, pane);
    ctx.drawImage(
      img,
      pane.source.x, pane.source.y, pane.source.width, pane.source.height,
      pane.dest.x, pane.dest.y, pane.dest.width, pane.dest.height,
    );
    ctx.restore();
  }

  /* The seam itself, so the cut reads as a design rather than a glitch. */
  if (comp.divider.kind !== 'none' && comp.panes.length === 2) {
    ctx.save();
    ctx.strokeStyle = brand.primaryColor || '#ea580c';
    ctx.lineWidth = comp.divider.width;
    const a = comp.panes[0].dest;
    ctx.beginPath();
    if (comp.divider.kind === 'diagonal') {
      ctx.moveTo(a.x + a.width, a.y);
      ctx.lineTo(a.x, a.y + a.height);
    } else if (seam) {
      ctx.moveTo(a.x + a.width / 2, a.y);
      ctx.lineTo(a.x + a.width / 2, a.y + a.height);
    } else if (comp.divider.kind === 'vertical') {
      const gapCentre = (a.x + a.width + comp.panes[1].dest.x) / 2;
      ctx.moveTo(gapCentre, a.y);
      ctx.lineTo(gapCentre, a.y + a.height);
    } else {
      const gapCentre = (a.y + a.height + comp.panes[1].dest.y) / 2;
      ctx.moveTo(a.x, gapCentre);
      ctx.lineTo(a.x + a.width, gapCentre);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* The inset in the collage gets a border, or it reads as a mistake. */
  if (comp.panes.length === 2 && comp.panes[1].dest.width < comp.panes[0].dest.width * 0.6) {
    const inset = comp.panes[1].dest;
    ctx.save();
    ctx.strokeStyle = brand.primaryColor || '#ea580c';
    ctx.lineWidth = Math.max(2, comp.divider.width);
    ctx.strokeRect(inset.x, inset.y, inset.width, inset.height);
    ctx.restore();
  }

  /* Labels, each on a plate so they are readable over any photograph. */
  for (const label of comp.labels) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    roundRect(ctx, label.x, label.y, label.width, label.height, label.height * 0.22);
    ctx.fill();
    ctx.strokeStyle = brand.primaryColor || '#ea580c';
    ctx.lineWidth = Math.max(1.5, label.fontSize * 0.06);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${label.fontSize}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.text, label.x + label.width / 2, label.y + label.height / 2, label.width * 0.92);
    ctx.restore();
  }

  /* A promotional line, if one was asked for, above the brand strip. */
  if (input.overlayText) {
    const strip = comp.brand;
    const fontSize = comp.canvas.width * 0.042;
    const y = (strip ? strip.y : comp.canvas.height) - fontSize * 2.1;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, y - fontSize * 0.7, comp.canvas.width, fontSize * 1.9);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${fontSize}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(input.overlayText, comp.canvas.width / 2, y + fontSize * 0.25, comp.canvas.width * 0.92);
    ctx.restore();
  }

  /* The brand strip: logo, name, website, call to action. */
  if (comp.brand) {
    const b = comp.brand;
    ctx.save();
    ctx.fillStyle = brand.secondaryColor || '#0A0A0A';
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = brand.primaryColor || '#ea580c';
    ctx.fillRect(b.x, b.y, b.width, Math.max(2, b.height * 0.05));

    let textLeft = b.x + b.height * 0.3;
    if (input.logo) {
      const logoSize = b.height * 0.56;
      const ratio = input.logo.width / Math.max(1, input.logo.height);
      const logoWidth = Math.min(logoSize * ratio, b.width * 0.3);
      ctx.drawImage(
        input.logo,
        textLeft, b.y + (b.height - logoSize) / 2 + b.height * 0.02,
        logoWidth, logoSize,
      );
      textLeft += logoWidth + b.height * 0.22;
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${b.fontSize}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(brand.name, textLeft, b.y + b.height * 0.47, b.width * 0.5);

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `400 ${b.fontSize * 0.68}px Inter, "Helvetica Neue", Arial, sans-serif`;
    if (brand.website) ctx.fillText(brand.website, textLeft, b.y + b.height * 0.78, b.width * 0.5);

    if (brand.callToAction) {
      ctx.textAlign = 'right';
      ctx.fillStyle = brand.primaryColor || '#ea580c';
      ctx.font = `700 ${b.fontSize * 0.82}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(brand.callToAction, b.x + b.width - b.height * 0.3, b.y + b.height * 0.62, b.width * 0.42);
    }
    ctx.restore();
  }
}

/** The finished design as a file, ready to download or upload. */
export function canvasToBlob(
  canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The design could not be exported.'))),
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      format === 'jpeg' ? 0.92 : undefined,
    );
  });
}
