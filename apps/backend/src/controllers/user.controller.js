import {userService} from '../services/user.service.js';

const userController = {
    async create(req, res) {
        try {
            const {name, email, password, phone} = req.body;
            await userService.create({name, email, password, phone});

            return res.status(201).json({message: "created user sucessfully"});
        } catch(err) {
            return res.status(500).json({message: "failed to create a user"});
        }
    },
    async findAll(req, res){
        try {
            const users = await userService.findAll();
            return res.status(200).json(users);
        } catch(err){
            return res.status(500).json({ message: "failed to get all users"});
        }
    },
    async update(req, res){
        try {
            const { id } = req.params;
            const allowed = ['name', 'email', 'password', 'phone', 'role'];
            const data = {};
            for (const key of allowed) {
                if (req.body[key] !== undefined) data[key] = req.body[key];
            }
            if (Object.keys(data).length === 0) {
                return res.status(400).json({ message: "no fields to update" });
            }
            await userService.update(id, data);
            return res.status(200).json({ message: "user updated successfully" });
        } catch(err){
            return res.status(500).json({ message: "failed to update user" });
        }
    },
}
export {userController};