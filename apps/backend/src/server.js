const express = require('express');
const App = express();
const PORT = 3001

const {router} = require('./routes/routes');

App.use(express.json());

App.use('/', router);

App.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});