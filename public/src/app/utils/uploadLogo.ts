/**
 * uploadLogo — permanent cross-device logo upload
 *
 * Sends the logo to the server, which stores it in Supabase Storage and
 * writes the public URL to the `public_branding` KV key. After this call,
 * every device (including anonymous visitors) will see the logo immediately.
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

interface UploadLogoOptions {
  /** Base64 data URL, e.g. from FileReader.readAsDataURL */
  logo_base64: string;
  mime_type?: string;
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  /** Access token from supabase.auth.getSession() */
  access_token: string;
}

interface UploadLogoResult {
  success: boolean;
  logo_url?: string;
  error?: string;
}

export async function uploadLogo(opts: UploadLogoOptions): Promise<UploadLogoResult> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/logo/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${opts.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logo_base64: opts.logo_base64,
          mime_type: opts.mime_type || 'image/png',
          company_name: opts.company_name,
          primary_color: opts.primary_color,
          secondary_color: opts.secondary_color,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      console.error('❌ [uploadLogo] Server error:', err);
      return { success: false, error: err.error || 'Upload failed' };
    }

    const data = await response.json();
    console.log('✅ [uploadLogo] Logo permanently stored at:', data.logo_url);
    return { success: true, logo_url: data.logo_url };
  } catch (error: any) {
    console.error('❌ [uploadLogo] Network error:', error);
    return { success: false, error: error.message };
  }
}
