"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCargoType = exports.updateCargoType = exports.getCargoTypeById = exports.getCargoTypes = exports.createCargoType = void 0;
const database_1 = require("../config/database");
const cargo_types_1 = require("../models/cargo_types");
const createCargoType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(cargo_types_1.CargoType);
        const cargoType = repo.create(req.body);
        yield repo.save(cargoType);
        res.status(201).json({ success: true, data: cargoType });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.createCargoType = createCargoType;
const getCargoTypes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(cargo_types_1.CargoType);
        const cargoTypes = yield repo.find({
            order: {
                id: "ASC"
            }
        });
        res.status(200).json({ success: true, data: cargoTypes });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCargoTypes = getCargoTypes;
const getCargoTypeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(cargo_types_1.CargoType);
        const cargoType = yield repo.findOne({ where: { id: Number(req.params.id) } });
        if (!cargoType)
            return res.status(404).json({ success: false, message: "Cargo type not found" });
        res.status(200).json({ success: true, data: cargoType });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCargoTypeById = getCargoTypeById;
const updateCargoType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(cargo_types_1.CargoType);
        const id = Number(req.params.id);
        const cargoType = yield repo.findOne({ where: { id } });
        if (!cargoType)
            return res.status(404).json({ success: false, message: "Cargo type not found" });
        repo.merge(cargoType, req.body);
        yield repo.save(cargoType);
        res.status(200).json({ success: true, data: cargoType });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateCargoType = updateCargoType;
const deleteCargoType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(cargo_types_1.CargoType);
        const id = Number(req.params.id);
        const cargoType = yield repo.findOne({ where: { id } });
        if (!cargoType)
            return res.status(404).json({ success: false, message: "Cargo type not found" });
        yield repo.remove(cargoType);
        res.status(200).json({ success: true, message: "Cargo type deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.deleteCargoType = deleteCargoType;
