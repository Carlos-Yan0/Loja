import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const App = express();
const PORT = process.env.PORT || 3001;

import {router} from './routes/routes.js';

App.use(cors({
  origin: [
    'https://gf-store.vercel.app',
    'https://gf-store-frontend-lbpw8vy5q-carlos-yan0s-projects.vercel.app'
  ],
  credentials: true
}));

App.use(express.json());
App.use(cookieParser());

App.use('/', router);

App.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});