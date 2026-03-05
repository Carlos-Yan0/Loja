import { prisma } from '../libs/prisma.js';

const productService = {
    async create(data) {
        await prisma.product.create({ data });
    },
    async findAll() {
        return await prisma.product.findMany();
    },
    async findById(id) {
        return await prisma.product.findUnique({ where: { id } });
    },
    async update(id, data) {
        return await prisma.product.update({ where: { id }, data });
    },
    async delete(id) {
        return await prisma.product.delete({ where: { id } });
    },
}

export { productService };