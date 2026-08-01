import { Request, Response } from 'express';
import Branch from '../models/Branch';

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await Branch.find({ isActive: true });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const name = (req.body?.name || '').trim();
    const address = (req.body?.address || '').trim();
    const phone = (req.body?.phone || '').trim();

    if (!name || !address) {
      return res.status(400).json({ message: 'Nombre y dirección son obligatorios' });
    }

    const exists = await Branch.findOne({
      isActive: true,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe una sucursal con ese nombre' });
    }

    const branch = new Branch({
      name,
      address,
      phone,
      city: (req.body?.city || '').trim() || undefined,
      province: (req.body?.province || '').trim() || undefined,
      postalCode: (req.body?.postalCode || '').trim() || undefined,
      country: (req.body?.country || 'Argentina').trim(),
    });
    await branch.save();
    res.status(201).json(branch);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = (req.body?.name || '').trim();
    const address = (req.body?.address || '').trim();
    const phone = (req.body?.phone || '').trim();

    if (!name || !address) {
      return res.status(400).json({ message: 'Nombre y dirección son obligatorios' });
    }

    const exists = await Branch.findOne({
      _id: { $ne: id },
      isActive: true,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe una sucursal con ese nombre' });
    }

    const branch = await Branch.findByIdAndUpdate(
      id,
      {
        name,
        address,
        phone,
        city: (req.body?.city || '').trim() || undefined,
        province: (req.body?.province || '').trim() || undefined,
        postalCode: (req.body?.postalCode || '').trim() || undefined,
        country: (req.body?.country || 'Argentina').trim(),
      },
      { new: true }
    );
    if (!branch) return res.status(404).json({ message: 'Sucursal no encontrada' });
    res.json(branch);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Branch.findByIdAndUpdate(id, { isActive: false });
    res.json({ message: 'Branch deactivated' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};