import { productService } from '../services/product.service.js';

const productController = {
    async create(req, res) {
        try {
            const { name, price, category, tags, stock, images } = req.body;
            await productService.create({ name, price, category, tags, stock, images });
            return res.status(201).json({ message: "product created successfully" });
        } catch(err) {
            return res.status(500).json({ message: "failed to create product", error: err.message });
        }
    },
    async findAll(req, res) {
        try {
            const products = await productService.findAll();
            return res.status(200).json(products);
        } catch(err) {
            return res.status(500).json({ message: "failed to get all products" });
        }
    },
    async findById(req, res) {
        try {
            const { id } = req.params;
            const product = await productService.findById(id);
            return res.status(200).json(product);
        } catch(err) {
            return res.status(500).json({ message: "failed to get product" });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const allowed = ['name', 'price', 'category', 'tags', 'stock', 'images'];
            const data = {};
            for (const key of allowed) {
                if (req.body[key] !== undefined) data[key] = req.body[key];
            }
            if (Object.keys(data).length === 0) {
                return res.status(400).json({ message: "no fields to update" });
            }
            await productService.update(id, data);
            return res.status(200).json({ message: "product updated successfully" });
        } catch(err) {
            return res.status(500).json({ message: "failed to update product" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            await productService.delete(id);
            return res.status(200).json({ message: "product deleted successfully" });
        } catch(err) {
            return res.status(500).json({ message: "failed to delete product" });
        }
    },
}

export { productController };