import express from 'express';
import cookieParser from 'cookie-parser';
const App = express();
const PORT = 3001

import {router} from './routes/routes.js';

App.use(express.json());
App.use(cookieParser());

App.use('/', router);

App.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});