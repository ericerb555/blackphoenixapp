import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { installSessionExpiryNotice } from './app/lib/sessionExpiryNotice'
import { installStaleChunkReload } from './app/lib/staleChunkReload'
import { installErrorReporting } from './app/lib/errorReport'
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

// Wrapped last so it sees what the other two did to fetch, and because the one
// failure that leaves no trace anywhere else is a request the browser refuses
// to send. That is the shape of bug that took three rounds and a hand-run curl
// to find. See the file.
installErrorReporting()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

