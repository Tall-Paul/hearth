import { shell } from 'electron'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import type { AppShortcut } from '../../shared/types'

/** Expands %APPDATA%-style tokens — some installers (e.g. NOW TV Player) install per-user under AppData. */
function expandEnvTokens(path: string): string {
  return path.replace(/%([^%]+)%/g, (match, name: string) => process.env[name] ?? match)
}

function findEdge(): string | null {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ]
  return candidates.find((c) => existsSync(c)) ?? null
}

/**
 * Best-effort: newly launched Store apps (Netflix, Prime Video, Disney+, Minecraft)
 * open windowed with their own title bar — there's no launch flag to force a UWP app
 * fullscreen. Poll for a window whose title contains `hint`, focus it, and send F11
 * (the fullscreen toggle these apps support). Most apps remember the preference after
 * the first successful toggle, so this is mainly a one-time nudge per app.
 */
function sendFullscreenToggle(hint: string): void {
  const safeHint = hint.replace(/'/g, "''")
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class HearthWin32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
}
"@
$global:hearthFound = [IntPtr]::Zero
$hint = '${safeHint}'
for ($i = 0; $i -lt 20 -and $global:hearthFound -eq [IntPtr]::Zero; $i++) {
  Start-Sleep -Milliseconds 500
  [HearthWin32]::EnumWindows({
    param($hWnd, $lParam)
    if ([HearthWin32]::IsWindowVisible($hWnd)) {
      $sb = New-Object System.Text.StringBuilder 256
      [HearthWin32]::GetWindowText($hWnd, $sb, 256) | Out-Null
      if ($sb.ToString() -like "*$hint*") {
        $global:hearthFound = $hWnd
        return $false
      }
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
}
if ($global:hearthFound -ne [IntPtr]::Zero) {
  [HearthWin32]::SetForegroundWindow($global:hearthFound) | Out-Null
  Start-Sleep -Milliseconds 300
  [System.Windows.Forms.SendKeys]::SendWait("{F11}")
}
`
  const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], {
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
}

/**
 * Launch an external app or streaming service.
 * - exe: run the executable directly
 * - uwp: launch a Store app by its AppUserModelID via the shell AppsFolder
 * - webapp: open a URL in Edge's chromeless fullscreen app mode (Widevine DRM works,
 *   so Netflix/Prime/Disney+ play; falls back to the default browser if Edge is absent)
 * - url: open in the default browser
 */
export async function launchApp(app: AppShortcut): Promise<void> {
  switch (app.kind) {
    case 'url': {
      await shell.openExternal(app.target)
      return
    }
    case 'webapp': {
      const edge = findEdge()
      if (!edge) {
        await shell.openExternal(app.target)
        return
      }
      const child = spawn(
        edge,
        [`--app=${app.target}`, '--start-fullscreen', '--new-window'],
        { detached: true, stdio: 'ignore' }
      )
      child.unref()
      return
    }
    case 'exe': {
      const child = spawn(expandEnvTokens(app.target), [], { detached: true, stdio: 'ignore' })
      child.unref()
      return
    }
    case 'uwp': {
      // e.g. target = "Microsoft.MinecraftUWP_8wekyb3d8bbwe!Game"
      const child = spawn('explorer.exe', [`shell:AppsFolder\\${app.target}`], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      sendFullscreenToggle(app.name)
      return
    }
    default:
      throw new Error(`Unknown app kind: ${(app as AppShortcut).kind}`)
  }
}
