declare global {
  interface Global {
    log: {
      info(moduleName: string, configObj?: Record<string, any>): void
      success(moduleName: string, configObj?: Record<string, any>): void
      warn(moduleName: string, configObj?: Record<string, any>): void
      error(moduleName: string, configObj?: Record<string, any>): void
    }
  }

  const log: {
    info(moduleName: string, configObj?: Record<string, any>): void
    success(moduleName: string, configObj?: Record<string, any>): void
    warn(moduleName: string, configObj?: Record<string, any>): void
    error(moduleName: string, configObj?: Record<string, any>): void
  }

  namespace Express {
    namespace Multer {
      interface File {
        buffer: Buffer
        originalname: string
        mimetype: string
        size: number
      }
    }
  }
}

export {}
