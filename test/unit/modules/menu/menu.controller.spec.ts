// 这个测试文件验证对应后端单元的关键行为。
import 'reflect-metadata'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { RequestMethod } from '@nestjs/common'
import { MenuController } from 'src/modules/menu/menu.controller'

describe('MenuController routes', () => {
  it('uses GET for query endpoints and POST for write endpoints', () => {
    const prototype = MenuController.prototype as any

    expect(Reflect.getMetadata(METHOD_METADATA, prototype.getMenuList)).toBe(RequestMethod.GET)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.getMenuList)).toBe('list')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.getMenuTree)).toBe(RequestMethod.GET)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.getMenuTree)).toBe('tree')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.createMenu)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.createMenu)).toBe('create')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.updateMenu)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.updateMenu)).toBe('update')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.deleteMenu)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.deleteMenu)).toBe('delete')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.getButtonList)).toBe(RequestMethod.GET)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.getButtonList)).toBe('button/list')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.createButton)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.createButton)).toBe('button/create')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.updateButton)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.updateButton)).toBe('button/update')
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.deleteButton)).toBe(RequestMethod.POST)
    expect(Reflect.getMetadata(PATH_METADATA, prototype.deleteButton)).toBe('button/delete')
  })
})
