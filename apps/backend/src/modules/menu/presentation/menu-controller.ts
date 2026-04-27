import type { MenuService } from '../application/menu-service'
import type { MenuConfigInput } from '../domain/menu'

export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  getPublicMenu(options?: { includeHomeProducts?: boolean }) {
    return this.menuService.getPublicMenu(options)
  }

  getAdminState() {
    return this.menuService.getAdminState()
  }

  updateSelection(config: MenuConfigInput) {
    return this.menuService.updateSelection(config)
  }
}
