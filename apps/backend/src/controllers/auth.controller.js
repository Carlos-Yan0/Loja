import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../libs/prisma';
const JWT_SECRET = process.env.JWT_SECRET;

export const authController = {
    async login(req, res) {
        try{
            const {email, password} = req.body;

            const user = await prisma.user.findUnique({where: {email}});
            if(!user){
                return res.status(401).json({message: "invalid Credentials"});
            };

            const ok = await bcrypt.compare(password, user.password);
            if(!ok){
                return res.status(401).json({ message: "invalid Credentials" });
            }

            const token = jwt.sign(
                {sub: user.id, role: user.role },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.json({token});
        } catch(err) {
            return res.status(500).json({ message: "failed to login"});
        }
    },
};