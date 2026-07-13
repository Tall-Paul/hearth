import React from 'react'
import ReactDOM from 'react-dom/client'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { App } from './App'
import './styles/global.css'

// Spatial navigation: arrow keys / OK from keyboards & IR remotes are handled
// natively; gamepad and the phone remote feed synthetic key events into this.
init({
  debug: false,
  visualDebug: false,
  shouldFocusDOMNode: true
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
