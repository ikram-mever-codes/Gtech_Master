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
exports.NumberSequenceService = void 0;
const database_1 = require("../config/database");
const number_sequence_1 = require("../models/number_sequence");
const customers_1 = require("../models/customers");
const cargos_1 = require("../models/cargos");
const invoice_1 = require("../models/invoice");
const offer_1 = require("../models/offer");
const orders_1 = require("../models/orders");
const entityMapping = {
    customer: { entity: customers_1.Customer, column: "customerNumber" },
    cargo: { entity: cargos_1.Cargo, column: "cargo_no" },
    closed_ci: { entity: invoice_1.Invoice, column: "invoiceNumber" },
    offer: { entity: offer_1.Offer, column: "offerNumber" },
    order: { entity: orders_1.Order, column: "order_no" },
    transfer_order: { entity: orders_1.Order, column: "order_no" },
    invoice: { entity: invoice_1.Invoice, column: "invoiceNumber" },
    invoice_correction: { entity: invoice_1.Invoice, column: "invoiceNumber" },
    delivery_note: { entity: invoice_1.Invoice, column: "invoiceNumber" },
};
class NumberSequenceService {
    static getNextNumber(sequenceKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return database_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const sequence = yield manager
                    .createQueryBuilder(number_sequence_1.NumberSequence, "seq")
                    .setLock("pessimistic_write")
                    .where("seq.sequenceKey = :sequenceKey", { sequenceKey })
                    .getOne();
                if (!sequence) {
                    throw new Error(`Number sequence "${sequenceKey}" not found`);
                }
                if (!sequence.isActive) {
                    throw new Error(`Number sequence "${sequenceKey}" is not active`);
                }
                if (sequenceKey === "customer") {
                    sequence.minDigits = 1;
                }
                let runningNo = sequence.nextRunningNo;
                const mapping = entityMapping[sequenceKey];
                if (mapping) {
                    const defaultStart = sequenceKey === "customer" ? 83777 : 1;
                    if (sequenceKey === "customer") {
                        const customers = yield manager
                            .getRepository(customers_1.Customer)
                            .createQueryBuilder("c")
                            .select(["c.customerNumber"])
                            .where("c.customerNumber LIKE 'K%'")
                            .getMany();
                        let maxNum = 0;
                        for (const cust of customers) {
                            if (cust.customerNumber) {
                                const match = cust.customerNumber.match(/\d+/);
                                if (match) {
                                    const n = parseInt(match[0], 10);
                                    if (!isNaN(n) && n > maxNum) {
                                        maxNum = n;
                                    }
                                }
                            }
                        }
                        runningNo = Math.max(defaultStart, maxNum + 1);
                    }
                    else {
                        const maxRecord = yield manager
                            .getRepository(mapping.entity)
                            .createQueryBuilder("entity")
                            .orderBy(`entity.${mapping.column}`, "DESC")
                            .getOne();
                        if (!maxRecord) {
                            runningNo = defaultStart;
                        }
                        else {
                            const maxVal = maxRecord[mapping.column];
                            const match = String(maxVal).match(/\d+$/);
                            if (match) {
                                let maxNum = parseInt(match[0], 10);
                                if (sequenceKey === "closed_ci" &&
                                    match[0].length > sequence.minDigits) {
                                    const suffix = match[0].slice(-sequence.minDigits);
                                    maxNum = parseInt(suffix, 10);
                                }
                                const nextAligned = maxNum + 1;
                                if (runningNo > nextAligned) {
                                    runningNo = Math.max(defaultStart, nextAligned);
                                }
                            }
                        }
                    }
                }
                let generatedNumber = "";
                let isDuplicate = true;
                while (isDuplicate) {
                    generatedNumber = this.formatNumber(sequence, runningNo);
                    if (mapping) {
                        const existing = yield manager.getRepository(mapping.entity)
                            .createQueryBuilder("entity")
                            .where(`entity.${mapping.column} = :val`, { val: generatedNumber })
                            .getOne();
                        if (existing) {
                            runningNo++;
                        }
                        else {
                            isDuplicate = false;
                        }
                    }
                    else {
                        isDuplicate = false;
                    }
                }
                sequence.nextRunningNo = runningNo + 1;
                yield manager.save(sequence);
                return generatedNumber;
            }));
        });
    }
    static formatNumber(sequence, runningNo) {
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const yy = yyyy.slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const number = String(runningNo).padStart(sequence.minDigits, "0");
        return sequence.formatPattern
            .replace("{prefix}", sequence.prefix)
            .replace("{yyyy}", yyyy)
            .replace("{yy}", yy)
            .replace("{mm}", mm)
            .replace("{number}", number);
    }
    static seedDefaultSequences() {
        return __awaiter(this, void 0, void 0, function* () {
            const repo = database_1.AppDataSource.getRepository(number_sequence_1.NumberSequence);
            const defaults = [
                { sequenceKey: "offer", name: "Angebot", prefix: "A", formatPattern: "{prefix}{yyyy}{mm}-{number}", minDigits: 1 },
                { sequenceKey: "order", name: "Auftrag", prefix: "MA", formatPattern: "{prefix}{yyyy}{mm}-{number}", minDigits: 1 },
                { sequenceKey: "transfer_order", name: "Bestellung", prefix: "DE", formatPattern: "{prefix}{yyyy}{mm}-{number}", minDigits: 1 },
                { sequenceKey: "invoice", name: "Rechnung", prefix: "R", formatPattern: "{prefix}{yyyy}{mm}-{number}", minDigits: 1 },
                {
                    sequenceKey: "invoice_correction",
                    name: "Rechnungskorrektur",
                    prefix: "RK",
                    formatPattern: "{prefix}{yyyy}{mm}-{number}",
                    minDigits: 1,
                },
                { sequenceKey: "delivery_note", name: "Lieferschein", prefix: "L", formatPattern: "{prefix}{yyyy}{mm}-{number}", minDigits: 1 },
                {
                    sequenceKey: "customer",
                    name: "Kunde",
                    prefix: "K",
                    formatPattern: "{prefix}{number}",
                    minDigits: 1,
                },
                {
                    sequenceKey: "cargo",
                    name: "Cargo",
                    prefix: "C",
                    formatPattern: "{prefix}{yyyy}{mm}-{number}",
                    minDigits: 1,
                },
                {
                    sequenceKey: "closed_ci",
                    name: "Commercial Invoice",
                    prefix: "CI",
                    formatPattern: "{prefix}{yyyy}{mm}-{number}",
                    minDigits: 1,
                },
            ];
            for (const def of defaults) {
                const exists = yield repo.findOne({
                    where: { sequenceKey: def.sequenceKey },
                });
                if (!exists) {
                    const startNo = def.sequenceKey === "customer" ? 83777 : 1;
                    yield repo.save(repo.create(Object.assign(Object.assign({}, def), { nextRunningNo: startNo })));
                }
                else {
                    exists.prefix = def.prefix;
                    exists.formatPattern = def.formatPattern;
                    exists.minDigits = 1;
                    if (def.sequenceKey === "customer" && exists.nextRunningNo < 83777) {
                        exists.nextRunningNo = 83777;
                    }
                    yield repo.save(exists);
                }
            }
        });
    }
}
exports.NumberSequenceService = NumberSequenceService;
