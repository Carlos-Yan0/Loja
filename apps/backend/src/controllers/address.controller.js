import { addressService } from '../services/address.service.js';

const addressController = {
  async list(req, res) {
    try {
      const addresses = await addressService.findByUserId(req.userId);
      return res.status(200).json(addresses);
    } catch (err) {
      return res.status(500).json({ message: 'Falha ao listar endereços' });
    }
  },

  async create(req, res) {
    try {
      const { cep, street, number, complement } = req.body;
      if (!cep || !street || !number) {
        return res.status(400).json({
          message: 'cep, street e number são obrigatórios',
        });
      }
      const address = await addressService.create(req.userId, {
        cep,
        street,
        number,
        complement,
      });
      return res.status(201).json(address);
    } catch (err) {
      return res.status(500).json({ message: 'Falha ao criar endereço' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { cep, street, number, complement } = req.body;
      const address = await addressService.update(id, req.userId, {
        cep,
        street,
        number,
        complement,
      });
      return res.status(200).json(address);
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ message: 'Endereço não encontrado' });
      }
      return res.status(500).json({ message: 'Falha ao atualizar endereço' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await addressService.delete(id, req.userId);
      return res.status(200).json({ message: 'Endereço removido' });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ message: 'Endereço não encontrado' });
      }
      return res.status(500).json({ message: 'Falha ao remover endereço' });
    }
  },
};

export { addressController };
