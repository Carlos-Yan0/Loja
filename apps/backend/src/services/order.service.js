import { prisma } from '../libs/prisma.js';

const orderService = {
    async create({userId, total, PayMethod, items}) {
        await prisma.order.create({
            data: {
                userId,
                total,
                PayMethod,
                items: {
                    create: items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        price: i.price
                    }))
                }
            }
        });
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
}

export { orderService };