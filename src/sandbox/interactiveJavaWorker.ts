import * as BrowserFS from 'browserfs'
import type {
  RuntimeExecutionEvent,
  RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'
import { resolveJavaEntryPoint } from './javaEntryPoint'
import rtJarUrl from '@seth0x41/doppio/java_home/rt.jar?url'
import charsetsJarUrl from '@seth0x41/doppio/java_home/charsets.jar?url'
import doppioJarUrl from '@seth0x41/doppio/java_home/doppio.jar?url'
import jceJarUrl from '@seth0x41/doppio/java_home/jce.jar?url'
import toolsJarUrl from '@seth0x41/doppio/java_home/tools.jar?url'
import currencyDataUrl from '@seth0x41/doppio/java_home/currency.data?url'

type DoppioRuntime = typeof import('@seth0x41/doppio').default
type BrowserFs = ReturnType<typeof BrowserFS.BFSRequire>
type BrowserProcess = ReturnType<typeof BrowserFS.BFSRequire> & {
  initializeTTYs(): void
}

const JAVA_HOME = '/java_home'
const WORK_DIR = '/work'
const BOOTSTRAP_CLASSPATH = [
  `${JAVA_HOME}/lib/rt.jar`,
  `${JAVA_HOME}/lib/charsets.jar`,
  `${JAVA_HOME}/lib/doppio.jar`,
  `${JAVA_HOME}/lib/jce.jar`,
]
const RUNTIME_FILES = [
  ['rt.jar', rtJarUrl],
  ['charsets.jar', charsetsJarUrl],
  ['doppio.jar', doppioJarUrl],
  ['jce.jar', jceJarUrl],
  ['tools.jar', toolsJarUrl],
  ['currency.data', currencyDataUrl],
] as const

let runtimePromise: Promise<{
  Doppio: DoppioRuntime
  fs: BrowserFs
  process: BrowserProcess
}> | undefined
let running = false
let inputEnabled = false
let waitingRequestId: number | undefined
let nextRequestId = 1
let activeBridgeClass = 'AlgoViz'

const post = (event: RuntimeExecutionEvent) => self.postMessage(event)

self.addEventListener('error', event => {
  event.preventDefault()
  post({
    type: 'error',
    message: event.error instanceof Error
      ? event.error.stack || event.error.message
      : event.message,
  })
})

function bridgeSource(packageName: string): string {
  return `${packageName ? `package ${packageName};\n` : ''}final class AlgoViz {
  private AlgoViz() {}
  static native void emitResult(String json);
  static native void emitTrace(String json);
}
`
}

function clearDirectory(fs: BrowserFs, path: string): void {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
    return
  }
  for (const name of fs.readdirSync(path)) {
    const child = `${path}/${name}`
    if (fs.statSync(child).isDirectory()) {
      clearDirectory(fs, child)
      fs.rmdirSync(child)
    } else {
      fs.unlinkSync(child)
    }
  }
}

function ensureDirectory(fs: BrowserFs, path: string): void {
  let current = ''
  for (const segment of path.split('/').filter(Boolean)) {
    current += `/${segment}`
    if (!fs.existsSync(current)) fs.mkdirSync(current)
  }
}

function parseBridgeJson(channel: 'result' | 'trace', value?: { toString(): string }): void {
  const json = value?.toString() ?? ''
  try {
    const parsed = JSON.parse(json)
    post(channel === 'result'
      ? { type: 'result', value: parsed }
      : { type: 'trace', event: parsed })
  } catch {
    if (channel === 'trace') {
      post({ type: 'trace', event: json })
    } else {
      post({ type: 'error', message: 'AlgoViz.emitResult() 必须传入合法 JSON' })
    }
  }
}

async function loadRuntime() {
  runtimePromise ??= (async () => {
    const runtimeGlobal = globalThis as typeof globalThis & {
      BrowserFS: typeof BrowserFS
      _crypto: Crypto
    }
    runtimeGlobal.BrowserFS = BrowserFS
    // Doppio's bundled crypto-browserify predates module workers and assigns
    // this legacy global while loading. Seed it with native Web Crypto.
    runtimeGlobal._crypto = globalThis.crypto
    const { default: Doppio } = await import('@seth0x41/doppio')

    BrowserFS.initialize(new BrowserFS.FileSystem.InMemory())
    const fs = BrowserFS.BFSRequire('fs')
    const process = BrowserFS.BFSRequire('process') as BrowserProcess
    const Buffer = BrowserFS.BFSRequire('buffer').Buffer
    for (const directory of [JAVA_HOME, `${JAVA_HOME}/lib`, WORK_DIR, '/tmp']) {
      if (!fs.existsSync(directory)) fs.mkdirSync(directory)
    }

    await Promise.all(RUNTIME_FILES.map(async ([name, url]) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Java 运行时资源加载失败: ${name} (${response.status})`)
      const bytes = new Uint8Array(await response.arrayBuffer())
      fs.writeFileSync(`${JAVA_HOME}/lib/${name}`, Buffer.from(bytes))
    }))

    process.initializeTTYs()
    for (const stream of [process.stdin, process.stdout, process.stderr]) {
      const write = stream.write.bind(stream) as (...args: unknown[]) => boolean
      stream.write = ((chunk: unknown, ...args: unknown[]) =>
        write(typeof chunk === 'string' ? Buffer.from(chunk) : chunk, ...args)
      ) as typeof stream.write
    }
    process.stdout.on('data', (data: { toString(): string }) => {
      post({ type: 'stdout', data: data.toString() })
    })
    process.stderr.on('data', (data: { toString(): string }) => {
      post({ type: 'stderr', data: data.toString() })
    })

    const stdin = process.stdin
    const read = stdin.read.bind(stdin)
    stdin.read = ((size?: number) => {
      const value = read(size)
      if (value === null && inputEnabled && waitingRequestId === undefined) {
        waitingRequestId = nextRequestId++
        post({ type: 'stdin-request', requestId: waitingRequestId })
      }
      return value
    }) as typeof stdin.read

    Doppio.VM.JVM.registerNativeModule(() => ({
      [activeBridgeClass]: {
        'emitResult(Ljava/lang/String;)V': (_thread, value) => parseBridgeJson('result', value),
        'emitTrace(Ljava/lang/String;)V': (_thread, value) => parseBridgeJson('trace', value),
      },
    }))

    return { Doppio, fs, process }
  })()
  return runtimePromise
}

function createJvm(Doppio: DoppioRuntime): Promise<InstanceType<DoppioRuntime['VM']['JVM']>> {
  return new Promise((resolve, reject) => {
    new Doppio.VM.JVM({
      doppioHomePath: '/sys',
      javaHomePath: JAVA_HOME,
      bootstrapClasspath: BOOTSTRAP_CLASSPATH,
      classpath: [`${JAVA_HOME}/lib/tools.jar`, WORK_DIR],
      tmpDir: '/tmp',
      responsiveness: 100,
      properties: { 'java.awt.headless': 'true' },
    }, (error, jvm) => error ? reject(error) : resolve(jvm))
  })
}

function runClass(
  jvm: InstanceType<DoppioRuntime['VM']['JVM']>,
  name: string,
  args: string[],
): Promise<number> {
  return new Promise(resolve => jvm.runClass(name, args, resolve))
}

async function execute(code: string): Promise<void> {
  if (running) {
    post({ type: 'error', message: 'Java 会话仍在运行' })
    return
  }
  const entry = resolveJavaEntryPoint(code)
  if (!entry) {
    post({ type: 'error', message: 'Java 真实执行需要 public static void main(String[] args) 入口' })
    return
  }

  running = true
  inputEnabled = false
  waitingRequestId = undefined
  post({ type: 'compiling' })

  try {
    const { Doppio, fs } = await loadRuntime()
    clearDirectory(fs, WORK_DIR)
    const packagePath = entry.packageName.replace(/\./g, '/')
    const sourceDir = packagePath ? `${WORK_DIR}/${packagePath}` : WORK_DIR
    ensureDirectory(fs, sourceDir)
    const sourcePath = `${sourceDir}/${entry.sourceFile}`
    const bridgePath = `${sourceDir}/AlgoViz.java`
    fs.writeFileSync(sourcePath, code)
    fs.writeFileSync(bridgePath, bridgeSource(entry.packageName))
    activeBridgeClass = entry.packageName
      ? `${entry.packageName.replace(/\./g, '/')}/AlgoViz`
      : 'AlgoViz'

    const compiler = await createJvm(Doppio)
    const javacExit = await runClass(compiler, 'com.sun.tools.javac.Main', [
      '-encoding',
      'UTF-8',
      '-d',
      WORK_DIR,
      sourcePath,
      bridgePath,
    ])
    if (javacExit !== 0) {
      post({ type: 'error', message: `Java 编译失败，javac 退出码 ${javacExit}` })
      return
    }

    post({ type: 'running' })
    inputEnabled = true
    const runtime = await createJvm(Doppio)
    const exitCode = await runClass(runtime, entry.className, [])
    post({ type: 'exit', code: exitCode })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    running = false
    inputEnabled = false
    waitingRequestId = undefined
  }
}

self.onmessage = (event: MessageEvent<RuntimeWorkerRequest>) => {
  const request = event.data
  if (request.type === 'start') {
    void execute(request.code)
    return
  }
  if (
    request.type === 'stdin'
    && waitingRequestId !== undefined
    && request.requestId === waitingRequestId
  ) {
    const current = runtimePromise
    waitingRequestId = undefined
    post({ type: 'running' })
    void current
      ?.then(({ process }) => {
        process.stdin.write(`${request.value}\n`)
      })
      .catch(error => {
        post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      })
  }
}
