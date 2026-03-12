import { orderService } from '../services/order.service.js';

const orderController = {

    async create(req, res) {
        try {
            const { userId, items, PayMethod } = req.body;
            let total = 0;
            items.forEach(element => {
                total += element.quantity * element.price; 
            });
            
            await orderService.create({ userId, total, PayMethod, items});
            return res.status(201).json({ message: "order created successfully"});
        } catch(err) {
            return res.status(500).json({ message: "failed to create order", error: err.message})
        }
    },

    async findAll(req, res) {
        try {
            const orders = await orderService.findAll();
            return res.status(200).json(orders);
        } catch(err) {
            return res.status(500).json({ message: "failed to get all orders", error: err.message})
        }
    },

    async update(req, res) {
        try{
            const { id } = req.params;
            const allowed = ["status"];
            const data = {};
            for(const key of allowed){
                if(req.body[key] !== undefined) {
                    data[key] = req.body[key];
                };
            };
            if(Object.keys(data).length === 0){
                return res.status(400).json({ message: "no fields to update" });
            };
            await orderService.update(id, data);
            return res.status(200).json({ message: "Order updated successfully" });
        } catch (err){
            console.error('Order update error:', err);
            return res.status(500).json({
              message: "failed to update order",
              error: err.message,
            });
        }
    }
}

export {orderController};