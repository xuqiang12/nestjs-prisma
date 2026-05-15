import { OrderSkill } from './order.skill'

export const skillRegistry = {
  'order.query': OrderSkill,
}

export function getSkill(name: string) {
  return skillRegistry[name]
}
