declare module '@seth0x41/doppio' {
  interface DoppioJvm {
    runClass(name: string, args: string[], callback: (exitCode: number) => void): void
  }

  interface DoppioJvmOptions {
    doppioHomePath: string
    javaHomePath: string
    bootstrapClasspath: string[]
    classpath: string[]
    tmpDir: string
    responsiveness: number
    properties?: Record<string, string>
  }

  type NativeModule = Record<
    string,
    Record<string, (thread: unknown, value?: { toString(): string }) => void>
  >

  interface DoppioJvmConstructor {
    new (
      options: DoppioJvmOptions,
      callback: (error: Error | null, jvm: DoppioJvm) => void,
    ): DoppioJvm
    registerNativeModule(factory: () => NativeModule): void
  }

  const Doppio: {
    VM: {
      JVM: DoppioJvmConstructor
    }
  }

  export default Doppio
}
