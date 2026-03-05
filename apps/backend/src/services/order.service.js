import { prisma } from '../libs/prisma.js';

const orderService = {
    async create(data) {
        await prisma.order.create({ data });
    },
    async findAll() {
        return await prisma.order.findMany();
    },
    async findById(id) {
        return await prisma.order.findUnique({ where: { id } });
    },
    async update(id, data) {
        return await prisma.order.update({ where: { id }, data });
    },
    async delete(id) {
        return await prisma.order.delete({ where: { id } });
    },
}

export { orderService };