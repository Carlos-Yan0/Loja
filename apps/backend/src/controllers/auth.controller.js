import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../libs/prisma';
import { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_SECRET } from '../libs/jwt';

export const authController = {
    async me(req, res) {
        return res.json({ id: req.userId, role: req.role });
    },
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

            const payload = {sub: user.id, role: user.role};
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

           return res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            }).cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 60 * 60 * 1000,
            }).json({ message: "Login successfully"});

        } catch(err) {
            return res.status(500).json({ message: "failed to login"});
        }
    },

    async refreshToken(req, res) {
        const token = req.cookies.refreshToken;
        if(!token) {
            return res.status(401).json({ message: "No refresh Token avaliable" });
        }
        jwt.verify(token, REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if(err){
                return res.status(401).json({ message: "Invalid Refresh Token" });
            }
            const payload = {sub: decoded.id, role: decoded.role}

            const newAccessToken = generateAccessToken(payload);
            const newRefreshToken = generateRefreshToken(payload);

            return res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            }).cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 60 * 60 * 1000,
            }).json({ message: "New token created" });
        });    
    },

    async logout(req, res) {
        return res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        }).clearCookie('accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        }).json({ message: "Logout Realizado" });
    }
};