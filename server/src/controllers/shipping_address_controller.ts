import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { CompanyShippingAddress } from "../models/company_shipping_address";
import { Customer } from "../models/customers";
import { Country } from "../models/country";
import ErrorHandler from "../utils/errorHandler";

export const getShippingAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId } = req.params;
    const addressRepository = AppDataSource.getRepository(CompanyShippingAddress);

    const addresses = await addressRepository.find({
      where: { company: { id: companyId } },
      relations: ["country"],
      order: {
        is_default: "DESC",
        name: "ASC",
      },
    });

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Error fetching shipping addresses:", error);
    return next(new ErrorHandler("Failed to retrieve shipping addresses", 500));
  }
};

export const createShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId } = req.params;
    const {
      name,
      address_additional_line,
      street,
      postal_code,
      city,
      country_id,
      is_default,
    } = req.body;

    if (!name || !street || !postal_code || !city) {
      return res.status(400).json({
        success: false,
        message: "Name, street, postal code, and city are required fields.",
      });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const company = await customerRepository.findOne({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company (Customer) not found.",
      });
    }

    const countryRepository = AppDataSource.getRepository(Country);
    let countryEntity = null;
    if (country_id) {
      countryEntity = await countryRepository.findOne({ where: { id: country_id } });
      if (!countryEntity) {
        return res.status(404).json({
          success: false,
          message: "Linked Country not found.",
        });
      }
    }

    const addressRepository = AppDataSource.getRepository(CompanyShippingAddress);

    const setAsDefault = !!is_default;
    if (setAsDefault) {
      await addressRepository.update(
        { company: { id: companyId } },
        { is_default: false }
      );
    }

    const newAddress = addressRepository.create({
      company,
      name: name.trim(),
      address_additional_line: address_additional_line ? address_additional_line.trim() : null,
      street: street.trim(),
      postal_code: postal_code.trim(),
      city: city.trim(),
      country: countryEntity,
      is_default: setAsDefault,
    });

    const saved = await addressRepository.save(newAddress);
    const reloaded = await addressRepository.findOne({
      where: { id: saved.id },
      relations: ["country"],
    });

    return res.status(201).json({
      success: true,
      data: reloaded,
    });
  } catch (error) {
    console.error("Error creating shipping address:", error);
    return next(new ErrorHandler("Failed to create shipping address", 500));
  }
};

export const updateShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId, addressId } = req.params;
    const {
      name,
      address_additional_line,
      street,
      postal_code,
      city,
      country_id,
      is_default,
    } = req.body;

    const addressRepository = AppDataSource.getRepository(CompanyShippingAddress);
    const address = await addressRepository.findOne({
      where: { id: addressId, company: { id: companyId } },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found for this company.",
      });
    }

    const countryRepository = AppDataSource.getRepository(Country);
    if (country_id !== undefined) {
      if (country_id === null || country_id === "") {
        address.country = null;
      } else {
        const countryEntity = await countryRepository.findOne({ where: { id: country_id } });
        if (!countryEntity) {
          return res.status(404).json({
            success: false,
            message: "Linked Country not found.",
          });
        }
        address.country = countryEntity;
      }
    }

    if (name !== undefined) address.name = name.trim();
    if (address_additional_line !== undefined)
      address.address_additional_line = address_additional_line ? address_additional_line.trim() : null;
    if (street !== undefined) address.street = street.trim();
    if (postal_code !== undefined) address.postal_code = postal_code.trim();
    if (city !== undefined) address.city = city.trim();

    if (is_default !== undefined) {
      const setAsDefault = !!is_default;
      if (setAsDefault) {

        await addressRepository.update(
          { company: { id: companyId } },
          { is_default: false }
        );
      }
      address.is_default = setAsDefault;
    }

    await addressRepository.save(address);

    const reloaded = await addressRepository.findOne({
      where: { id: address.id },
      relations: ["country"],
    });

    return res.status(200).json({
      success: true,
      data: reloaded,
    });
  } catch (error) {
    console.error("Error updating shipping address:", error);
    return next(new ErrorHandler("Failed to update shipping address", 500));
  }
};

export const deleteShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId, addressId } = req.params;
    const addressRepository = AppDataSource.getRepository(CompanyShippingAddress);

    const address = await addressRepository.findOne({
      where: { id: addressId, company: { id: companyId } },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found for this company.",
      });
    }

    await addressRepository.remove(address);

    return res.status(200).json({
      success: true,
      message: "Shipping address deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting shipping address:", error);
    return next(new ErrorHandler("Failed to delete shipping address", 500));
  }
};

export const setDefaultShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId, addressId } = req.params;
    const addressRepository = AppDataSource.getRepository(CompanyShippingAddress);

    const address = await addressRepository.findOne({
      where: { id: addressId, company: { id: companyId } },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found for this company.",
      });
    }
    await addressRepository.update(
      { company: { id: companyId } },
      { is_default: false }
    );

    address.is_default = true;
    await addressRepository.save(address);

    return res.status(200).json({
      success: true,
      message: "Default shipping address updated successfully.",
    });
  } catch (error) {
    console.error("Error setting default shipping address:", error);
    return next(new ErrorHandler("Failed to set default shipping address", 500));
  }
};