import { prisma } from '../libs/prisma.js';

const addressService = {
  async findByUserId(userId) {
    return await prisma.address.findMany({
      where: { UserId: userId },
      orderBy: { id: 'asc' },
    });
  },

  async create(userId, data) {
    const { cep, street, number, complement } = data;
    return await prisma.address.create({
      data: {
        UserId: userId,
        cep,
        street,
        number,
        complement: complement || null,
      },
    });
  },

  async update(id, userId, data) {
    await prisma.address.findFirstOrThrow({
      where: { id, UserId: userId },
    });
    const { cep, street, number, complement } = data;
    return await prisma.address.update({
      where: { id },
      data: {
        ...(cep != null && { cep }),
        ...(street != null && { street }),
        ...(number != null && { number }),
        ...(complement != null && { complement }),
      },
    });
  },

  async delete(id, userId) {
    await prisma.address.findFirstOrThrow({
      where: { id, UserId: userId },
    });
    return await prisma.address.delete({ where: { id } });
  },
};

export { addressService };
