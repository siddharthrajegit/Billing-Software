const { Item } = require('../models');

const itemController = {
  listItems: (req, res) => {
    const firmId = req.activeFirm.id;
    const items = Item.getByFirmId(firmId);
    const lowStockItems = Item.getLowStock(firmId);

    res.render('items/list', {
      title: 'Items & Inventory',
      items,
      lowStockCount: lowStockItems.length,
      activeMenu: 'items'
    });
  },

  getCreate: (req, res) => {
    res.render('items/form', {
      title: 'Add New Item',
      item: null,
      activeMenu: 'items'
    });
  },

  postCreate: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const {
        name, item_code, hsn_code, unit, sale_price, purchase_price,
        tax_rate, tax_inclusive, opening_stock, low_stock_threshold, description
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Item name is required.');
        return res.redirect('/items/create');
      }

      Item.create({
        firm_id: firmId,
        name: name.trim(),
        item_code: item_code ? item_code.trim() : null,
        hsn_code: hsn_code ? hsn_code.trim() : null,
        unit: unit ? unit.trim().toUpperCase() : 'PCS',
        sale_price: parseFloat(sale_price) || 0,
        purchase_price: parseFloat(purchase_price) || 0,
        tax_rate: parseFloat(tax_rate) || 0,
        tax_inclusive: tax_inclusive === 'on' || tax_inclusive === '1' ? 1 : 0,
        opening_stock: parseFloat(opening_stock) || 0,
        low_stock_threshold: parseFloat(low_stock_threshold) || 0,
        description: description ? description.trim() : null
      });

      req.flash('success_msg', `Item "${name}" added successfully!`);
      res.redirect('/items');
    } catch (err) {
      console.error('Create item error:', err);
      req.flash('error_msg', 'Failed to add item: ' + err.message);
      res.redirect('/items/create');
    }
  },

  getEdit: (req, res) => {
    const firmId = req.activeFirm.id;
    const item = Item.getById(req.params.id, firmId);
    if (!item) {
      req.flash('error_msg', 'Item not found.');
      return res.redirect('/items');
    }

    res.render('items/form', {
      title: `Edit ${item.name}`,
      item,
      activeMenu: 'items'
    });
  },

  postEdit: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const itemId = req.params.id;
      const {
        name, item_code, hsn_code, unit, sale_price, purchase_price,
        tax_rate, tax_inclusive, low_stock_threshold, description
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Item name is required.');
        return res.redirect(`/items/edit/${itemId}`);
      }

      Item.update(itemId, firmId, {
        name: name.trim(),
        item_code: item_code ? item_code.trim() : null,
        hsn_code: hsn_code ? hsn_code.trim() : null,
        unit: unit ? unit.trim().toUpperCase() : 'PCS',
        sale_price: parseFloat(sale_price) || 0,
        purchase_price: parseFloat(purchase_price) || 0,
        tax_rate: parseFloat(tax_rate) || 0,
        tax_inclusive: tax_inclusive === 'on' || tax_inclusive === '1' ? 1 : 0,
        low_stock_threshold: parseFloat(low_stock_threshold) || 0,
        description: description ? description.trim() : null
      });

      req.flash('success_msg', 'Item details updated.');
      res.redirect('/items');
    } catch (err) {
      console.error('Edit item error:', err);
      req.flash('error_msg', 'Failed to update item: ' + err.message);
      res.redirect(`/items/edit/${req.params.id}`);
    }
  },

  postAdjustStock: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const itemId = req.params.id;
      const { adjustment, action } = req.body;

      const qty = parseFloat(adjustment) || 0;
      const finalDelta = action === 'reduce' ? -Math.abs(qty) : Math.abs(qty);

      Item.adjustStock(itemId, firmId, finalDelta);
      req.flash('success_msg', 'Stock level updated.');
      res.redirect('/items');
    } catch (err) {
      console.error('Adjust stock error:', err);
      req.flash('error_msg', 'Failed to adjust stock: ' + err.message);
      res.redirect('/items');
    }
  },

  postDelete: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      Item.delete(req.params.id, firmId);
      req.flash('success_msg', 'Item deleted.');
      res.redirect('/items');
    } catch (err) {
      console.error('Delete item error:', err);
      req.flash('error_msg', 'Failed to delete item.');
      res.redirect('/items');
    }
  },

  // API endpoint for invoice fast autocomplete
  apiGetItems: (req, res) => {
    const firmId = req.activeFirm.id;
    const items = Item.getByFirmId(firmId);
    res.json(items);
  }
};

module.exports = itemController;
