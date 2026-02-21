const {prisma} = require('../libs/prisma');

const userService = {

    async criar(data){
        const user = await prisma.user.create({data});
        return user;
    },

    async buscarTodos() {
        return await prisma.user.findMany();
    },

    async buscarPorId(id) {
        return await prisma.user.findUnique({where: {id}});
    },

    async atualizar(id, data){
        return await prisma.user.update({where: {id}, data});
    },

    async deletar(id) {
        return await prisma.user.delete({where: {id}});
    },
}

module.exports = {userService};