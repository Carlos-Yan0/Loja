import type { MenuConfig } from '../domain/menu'

export interface MenuConfigRepository {
  get(): Promise<MenuConfig>
  save(config: MenuConfig): Promise<MenuConfig>
}
