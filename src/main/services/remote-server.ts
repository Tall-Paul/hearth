import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer, Server } from 'http'
import { networkInterfaces } from 'os'
import type { RemoteCommand } from '../../shared/types'
import { REMOTE_PAGE } from './remote-page'

let httpServer: Server | null = null
let wss: WebSocketServer | null = null

function lanAddress(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
}

/**
 * Serve the phone-remote web page and accept control commands over WebSocket.
 * `onCommand` forwards each command to the renderer.
 */
export function startRemoteServer(port: number, onCommand: (cmd: RemoteCommand) => void): string {
  stopRemoteServer()

  const app = express()
  app.get('/', (_req, res) => res.type('html').send(REMOTE_PAGE))
  app.get('/health', (_req, res) => res.json({ ok: true }))

  httpServer = createServer(app)
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const cmd = JSON.parse(data.toString()) as RemoteCommand
        onCommand(cmd)
      } catch {
        // ignore malformed command
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`[remote] phone remote at http://${lanAddress()}:${port}`)
  })

  return `http://${lanAddress()}:${port}`
}

export function stopRemoteServer(): void {
  wss?.close()
  httpServer?.close()
  wss = null
  httpServer = null
}

export function remoteUrl(port: number): string {
  return `http://${lanAddress()}:${port}`
}
