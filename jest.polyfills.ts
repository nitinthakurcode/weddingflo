/**
 * Jest polyfills for MSW v2
 * These must be loaded before MSW modules are imported
 * Based on: https://mswjs.io/docs/migrations/1.x-to-2.x#jest
 */

import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, TransformStream } from 'stream/web'
import { MessageChannel, MessagePort } from 'worker_threads'

// Polyfill globals needed by MSW v2
Object.defineProperties(globalThis, {
  TextEncoder: { value: TextEncoder },
  TextDecoder: { value: TextDecoder },
  ReadableStream: { value: ReadableStream },
  TransformStream: { value: TransformStream },
  MessageChannel: { value: MessageChannel },
  MessagePort: { value: MessagePort },
})

// Polyfill fetch APIs from undici
const { fetch, Headers, FormData, Request, Response } = require('undici')

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Headers: { value: Headers, configurable: true },
  FormData: { value: FormData, configurable: true },
  Request: { value: Request, configurable: true },
  Response: { value: Response, configurable: true },
})

// Polyfill BroadcastChannel for MSW v2
Object.defineProperty(globalThis, 'BroadcastChannel', {
  value: class BroadcastChannelPolyfill {
    name: string
    constructor(name: string) {
      this.name = name
    }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  },
})
