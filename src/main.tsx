import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { installSessionExpiryNotice } from './app/lib/sessionExpiryNotice'
import './styles/index.css'

// Before anything renders, so a 401 on the very first call is explained too.
// An expired session used to make every feature fail with a generic error while
// the app sat there looking perfectly healthy. See the file for the whole story.
installSessionExpiryNotice()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

