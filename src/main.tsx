import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { installSessionExpiryNotice } from './app/lib/sessionExpiryNotice'
import { installStaleChunkReload } from './app/lib/staleChunkReload'
import './styles/index.css'

// Before anything renders, so a 401 on the very first call is explained too.
// An expired session used to make every feature fail with a generic error while
// the app sat there looking perfectly healthy. See the file for the whole story.
installSessionExpiryNotice()

// Also before render, because the first navigation after a deploy is as likely
// to hit this as any later one. Anyone holding the app open when a build ships
// asks for a chunk filename that no longer exists and sits on "Loading…" for
// ever; this reloads them into the current build. See the file for the whole
// story.
installStaleChunkReload()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

