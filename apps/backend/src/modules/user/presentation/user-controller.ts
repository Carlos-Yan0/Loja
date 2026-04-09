import type { UserService } from '../application/user-service'
import type { CreateUserInput, UpdateUserInput } from '../domain/user'

export class UserController {
  constructor(private readonly userService: UserService) {}

  create(input: CreateUserInput) {
    return this.userService.create(input)
  }

  list(search?: string) {
    return this.userService.findAll(search)
  }

  getById(id: string) {
    return this.userService.findById(id)
  }

  update(id: string, input: UpdateUserInput) {
    return this.userService.update(id, input)
  }

  delete(id: string) {
    return this.userService.delete(id)
  }
}
