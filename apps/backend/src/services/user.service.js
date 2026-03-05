import { prisma } from '../libs/prisma.js';

/** a object to select only the fields that we need */
const userSafeSelect = {
  id: true,
  name: true,
  role: true,
};

const userService = {

  async create(data) {
    await prisma.user.create({ data });
  },

  async findAll() {
    return await prisma.user.findMany({
      select: userSafeSelect,
    });
  },

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: userSafeSelect,
    });
  },

  async update(id, data) {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return await prisma.user.update({
      where: { id },
      data: clean,
      select: userSafeSelect,
    });
  },

  async delete(id) {
    return await prisma.user.delete({ where: { id } });
  },
};

export {userService};