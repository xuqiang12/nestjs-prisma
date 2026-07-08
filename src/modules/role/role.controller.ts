import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateRoleDto } from './dto/create-role.dto'
import { DeleteRoleDto } from './dto/delete-role.dto'
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { RoleService } from './role.service'

@ApiTags('角色模块')
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: '查询角色列表' })
  @Get('list')
  getRoleList() {
    return this.roleService.getRoleList()
  }

  @ApiOperation({ summary: '查询角色详情' })
  @Get('detail')
  getRoleDetail(@Query('id', ParseIntPipe) id: number) {
    return this.roleService.getRoleDetail(id)
  }

  @ApiOperation({ summary: '新增角色' })
  @Post('create')
  createRole(@Body() dto: CreateRoleDto) {
    return this.roleService.createRole(dto)
  }

  @ApiOperation({ summary: '修改角色' })
  @Post('update')
  updateRole(@Body() dto: UpdateRoleDto) {
    return this.roleService.updateRole(dto)
  }

  @ApiOperation({ summary: '删除角色' })
  @Post('delete')
  deleteRole(@Body() dto: DeleteRoleDto) {
    return this.roleService.deleteRole(dto)
  }

  @ApiOperation({ summary: '保存角色授权' })
  @Post('permission')
  updateRolePermission(@Body() dto: UpdateRolePermissionDto) {
    return this.roleService.updateRolePermission(dto)
  }
}
