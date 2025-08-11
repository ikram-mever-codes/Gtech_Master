import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Invoice } from "../models/invoice";
import { Customer } from "../models/customers";
import { InvoiceItem } from "../models/invoice";

export class InvoiceController {
  // Create a new invoice
  static createInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);
    const customerRepository = getRepository(Customer);
    const itemRepository = getRepository(InvoiceItem);

    try {
      const { customerId, ...invoiceData } = req.body;

      const customer = await customerRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Create invoice
      const invoice = invoiceRepository.create({
        ...invoiceData,
        customer,
      });

      // Save invoice to get the ID
      const savedInvoice: any = await invoiceRepository.save(invoice);
      if (req.body.items && req.body.items.length > 0) {
        const items = req.body.items.map((item: any) => {
          return itemRepository.create({
            ...item,
            invoice: savedInvoice,
          });
        });
        await itemRepository.save(items);
      }
      const completeInvoice = await invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ["customer", "items"],
      });

      return res.status(201).json({
        success: true,
        data: completeInvoice,
        message: "Invoice created sucessfully!",
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Update an existing invoice
  static updateInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);
    const itemRepository = getRepository(InvoiceItem);

    try {
      const { id } = req.params;
      const { items, ...invoiceData } = req.body;

      // Find the invoice
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["items"],
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Update invoice fields
      invoiceRepository.merge(invoice, invoiceData);
      const updatedInvoice = await invoiceRepository.save(invoice);

      // Handle items update (delete existing and create new)
      if (items) {
        // Remove existing items
        await itemRepository.delete({ invoice: invoice });

        // Create new items
        const newItems = items.map((item: any) => {
          return itemRepository.create({
            ...item,
            invoice: updatedInvoice,
          });
        });
        await itemRepository.save(newItems);
      }

      // Fetch the complete updated invoice
      const completeInvoice = await invoiceRepository.findOne({
        where: { id: updatedInvoice.id },
        relations: ["customer", "items"],
      });

      return res.json(completeInvoice);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Delete an invoice
  static deleteInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);

    try {
      const { id } = req.params;

      const result = await invoiceRepository.delete(id);
      if (result.affected === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res
        .status(204)
        .json({ success: true, message: "Invoice Deleted Succssfully" });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Get all invoices
  static getAllInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);

    try {
      const invoices = await invoiceRepository.find({
        relations: ["customer", "items"],
        order: { invoiceDate: "DESC" },
      });
      return res.json({ success: true, data: invoices });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Get a single invoice by ID
  static getInvoiceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);

    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["customer", "items"],
      });

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res.json({ success: true, data: invoice });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static getInvoicesByCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = getRepository(Invoice);

    try {
      const { customerId } = req.params;
      const invoices = await invoiceRepository.find({
        where: { customer: { id: customerId } },
        relations: ["items"],
        order: { invoiceDate: "DESC" },
      });

      return res.json(invoices);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };
}
