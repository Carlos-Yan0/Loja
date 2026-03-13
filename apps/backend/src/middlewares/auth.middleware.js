import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../libs/jwt';

export function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken;
    
    if(!token){
        return res.status(401).json({ message: "Não autenticado" });
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err) {
            if(err.name === 'TokenExpiredError'){
                return res.status(401).json({ message: "TOKEN_EXPIRED" });
            }
        }
        req.userId = decoded.sub;
        next()
    })
}

