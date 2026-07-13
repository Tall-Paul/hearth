import type { HearthApi } from './index'

declare global {
  interface Window {
    api: HearthApi
  }
}

export {}
