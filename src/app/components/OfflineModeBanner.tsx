/**
 * Offline Mode Banner
 * Shows when server is not deployed
 */

import { CloudOff, Terminal } from 'lucide-react';
import { useState } from 'react';

interface OfflineModeBannerProps {
  show: boolean;
}

export default function OfflineModeBanner({ show }: OfflineModeBannerProps) {
  // Banner disabled - not needed for production
  return null;
}
