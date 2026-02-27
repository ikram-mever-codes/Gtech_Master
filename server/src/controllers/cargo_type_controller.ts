import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { CargoType } from "../models/cargo_types";

export const createCargoType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(CargoType);
        const cargoType = repo.create(req.body);
        await repo.save(cargoType);
        res.status(201).json({ success: true, data: cargoType });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCargoTypes = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(CargoType);
        const cargoTypes = await repo.find({
            order: {
                id: "ASC"
            }
        });
        res.status(200).json({ success: true, data: cargoTypes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCargoTypeById = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(CargoType);
        const cargoType = await repo.findOne({ where: { id: Number(req.params.id) } });
        if (!cargoType) return res.status(404).json({ success: false, message: "Cargo type not found" });
        res.status(200).json({ success: true, data: cargoType });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCargoType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(CargoType);
        const id = Number(req.params.id);
        const cargoType = await repo.findOne({ where: { id } });
        if (!cargoType) return res.status(404).json({ success: false, message: "Cargo type not found" });

        repo.merge(cargoType, req.body);
        await repo.save(cargoType);
        res.status(200).json({ success: true, data: cargoType });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCargoType = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(CargoType);
        const id = Number(req.params.id);
        const cargoType = await repo.findOne({ where: { id } });
        if (!cargoType) return res.status(404).json({ success: false, message: "Cargo type not found" });

        await repo.remove(cargoType);
        res.status(200).json({ success: true, message: "Cargo type deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
