const {userService} = require('../services/user.service');

const userController = {
    async criar(req, res) {
        try {
            const {name, email, password, phone} = req.body;
            await userService.criar({name, email, password, phone});

            return res.status(201).json({message: "created user sucessfully"});
        } catch(err) {
            return res.status(500).json({message: "failed to create a user"});
        }
    },
}

module.exports = {userController};