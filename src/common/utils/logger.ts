// 全局日志工具（左边文字变色，右边配置永远蓝色）
const logger = {
  // 信息（左边：蓝色）
  info(moduleName: string, configObj?: Record<string, any>) {
    this.print(moduleName, configObj, '\x1b[34m')
  },

  // 成功（左边：绿色）
  success(moduleName: string, configObj?: Record<string, any>) {
    this.print(moduleName, configObj, '\x1b[32m')
  },

  // 警告（左边：黄色）
  warn(moduleName: string, configObj?: Record<string, any>) {
    this.print(moduleName, configObj, '\x1b[33m')
  },

  // 错误（左边：红色）
  error(moduleName: string, configObj?: Record<string, any>) {
    this.print(moduleName, configObj, '\x1b[31m')
  },

  // 核心打印（左边变色 + 右边永远蓝色）
  print(moduleName: string, configObj?: Record<string, any>, color: string = '\x1b[34m') {
    // 左边内容 + 左边文字颜色
    const leftContent = `[${moduleName}]`
    const leftColored = `${color}${leftContent}\x1b[0m`

    // 固定占 100 宽度（保证对齐）
    const left = leftColored.padEnd(100, ' ')

    // 不传第二个参数，只打印左边
    if (!configObj) {
      console.log(left.trim())
      return
    }

    // 右边永远 蓝色！！！
    const items = Object.entries(configObj)
      .map(([k, v]) => ` \x1b[34m${k}:\x1b[0m ${v}`)
      .join(' | ')

    console.log(left + items)
  },
}

// 全局挂载
;(global as any).log = logger
