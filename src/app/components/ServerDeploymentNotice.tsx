/**
 * Server Deployment Notice
 * 
 * Shows a one-time dismissible notice when the backup server isn't deployed
 */

import { useState, useEffect } from 'react';
import { X, Server, ExternalLink } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER_PREFIX = '/make-server-57095a78';
const NOTICE_DISMISSED_KEY = 'serverDeploymentNoticeDismissed';

export default function ServerDeploymentNotice() {
  // Notification disabled - not needed for production
  return null;
}
