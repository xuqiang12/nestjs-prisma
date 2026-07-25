import { BadRequestException, Injectable } from '@nestjs/common'

export type PromptVariable = {
  name: string
  required?: boolean
}

@Injectable()
export class PromptRendererService {
  render(
    template: string,
    variables: PromptVariable[] = [],
    values: Record<string, string | number | boolean | null | undefined> = {},
  ) {
    const missingVariable = variables.find(
      (item) => item.required && (values[item.name] === undefined || values[item.name] === null),
    )
    if (missingVariable) {
      throw new BadRequestException(`缺少提示词变量：${missingVariable.name}`)
    }

    return variables.reduce((content, item) => {
      const value = values[item.name]
      return content.replace(new RegExp(`\\{${item.name}\\}`, 'g'), value === undefined || value === null ? '' : String(value))
    }, template)
  }
}
