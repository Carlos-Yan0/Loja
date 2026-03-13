import jwt from 'jsonwebtoken';
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export function generateAccessToken(payload) {
    return jwt.sign(
        payload,
        ACCESS_TOKEN_SECRET,
        {expiresIn: "60m" }
    );
}

export function generateRefreshToken(payload) {
    return jwt.sign(
        payload,
        REFRESH_TOKEN_SECRET,
        {expiresIn: "7d"}
    );
}