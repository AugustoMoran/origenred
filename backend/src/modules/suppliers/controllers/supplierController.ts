import { Request, Response } from 'express';
import Supplier from '../models/Supplier';

const normalize = (value: string) => value.trim();

const getExactNameRegex = (name: string) => ({
  $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
  $options: 'i',
});

export const getSuppliers = async (_req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const name = normalize(req.body?.name || '');
    if (!name) return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' });

    const exists = await Supplier.findOne({ isActive: true, name: getExactNameRegex(name) });
    if (exists) return res.status(409).json({ message: 'Ya existe un proveedor con ese nombre' });

    const supplier = await Supplier.create({
      name,
      contactName: normalize(req.body?.contactName || ''),
      email: normalize(req.body?.email || ''),
      phone: normalize(req.body?.phone || ''),
    });

    res.status(201).json(supplier);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = normalize(req.body?.name || '');
    if (!name) return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' });

    const exists = await Supplier.findOne({ _id: { $ne: id }, isActive: true, name: getExactNameRegex(name) });
    if (exists) return res.status(409).json({ message: 'Ya existe un proveedor con ese nombre' });

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        name,
        contactName: normalize(req.body?.contactName || ''),
        email: normalize(req.body?.email || ''),
        phone: normalize(req.body?.phone || ''),
      },
      { new: true }
    );

    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(supplier);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor desactivado' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
