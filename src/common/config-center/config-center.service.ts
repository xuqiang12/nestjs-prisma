// 这个文件读取根目录 nacos/config 下随应用发布的 JSON 配置。
import { Injectable } from '@nestjs/common'
import { readFileSync } from 'fs'
import { join } from 'path'

export type ConfigCenterKey = {
  dataId: string
}

@Injectable()
export class ConfigCenterService {
  // 读取根目录 nacos/config 下指定名称的 JSON 配置。
  readJsonConfig<T>(key: ConfigCenterKey) {
    const filePath = join(process.cwd(), 'nacos', 'config', `${key.dataId}.json`)
    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  }
}
