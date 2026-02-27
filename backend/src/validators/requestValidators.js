import { ApiError } from "../utils/ApiError.js";

const nonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const optionalString = (value) => value === undefined || typeof value === "string";

const isPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const isIntegerId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

const isIsoDateLike = (value) => {
  if (!nonEmptyString(value)) return false;
  return !Number.isNaN(Date.parse(value));
};

const failValidation = (details) => {
  throw new ApiError(422, "Validation failed", details);
};

export const validateLogin = (req, res, next) => {
  try {
    const { usernameOrMobile, password } = req.body || {};
    const errors = [];
    if (!nonEmptyString(usernameOrMobile)) errors.push("usernameOrMobile is required");
    if (!nonEmptyString(password)) errors.push("password is required");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateUserList = (req, res, next) => {
  try {
    const { role, branchName } = req.query || {};
    const errors = [];
    if (!optionalString(role)) errors.push("role must be a string");
    if (!optionalString(branchName)) errors.push("branchName must be a string");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCreateUser = (req, res, next) => {
  try {
    const { username, password, role, branches } = req.body || {};
    const errors = [];

    if (!nonEmptyString(username)) errors.push("username is required");
    if (!nonEmptyString(password) || password.length < 6) {
      errors.push("password is required and must be at least 6 characters");
    }
    if (!["Super Admin", "Branch", "Vendor"].includes(role)) {
      errors.push("role must be one of: Super Admin, Branch, Vendor");
    }
    if (!Array.isArray(branches) || branches.length === 0) {
      errors.push("branches must be a non-empty array");
    } else if (!branches.every((b) => nonEmptyString(b))) {
      errors.push("branches must contain non-empty string values");
    }

    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdateUser = (req, res, next) => {
  try {
    const errors = [];
    const { full_name, mobile_number, username, password, role, branches } = req.body || {};

    if (!isIntegerId(req.params.id)) errors.push("id param must be a positive integer");
    if (full_name !== undefined && !optionalString(full_name)) errors.push("full_name must be a string");
    if (mobile_number !== undefined && !optionalString(mobile_number)) {
      errors.push("mobile_number must be a string");
    }
    if (username !== undefined && !nonEmptyString(username)) errors.push("username must be a non-empty string");
    if (password !== undefined && (!nonEmptyString(password) || password.length < 6)) {
      errors.push("password must be at least 6 characters");
    }
    if (role !== undefined && !["Super Admin", "Branch", "Vendor"].includes(role)) {
      errors.push("role must be one of: Super Admin, Branch, Vendor");
    }
    if (branches !== undefined) {
      if (!Array.isArray(branches) || !branches.every((b) => nonEmptyString(b))) {
        errors.push("branches must be an array of non-empty strings");
      }
    }
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateIdParam = (req, res, next) => {
  try {
    if (!isIntegerId(req.params.id)) failValidation(["id param must be a positive integer"]);
    next();
  } catch (error) {
    next(error);
  }
};

export const validatePurchaseList = (req, res, next) => {
  try {
    const { workerId, vendorId, branchName, startDate, endDate, searchTerm } = req.query || {};
    const errors = [];
    if (workerId !== undefined && !isIntegerId(workerId)) errors.push("workerId must be a positive integer");
    if (vendorId !== undefined && !isIntegerId(vendorId)) errors.push("vendorId must be a positive integer");
    if (branchName !== undefined && !optionalString(branchName)) errors.push("branchName must be a string");
    if (searchTerm !== undefined && !optionalString(searchTerm)) errors.push("searchTerm must be a string");
    if (startDate !== undefined && !isIsoDateLike(startDate)) errors.push("startDate must be a valid date");
    if (endDate !== undefined && !isIsoDateLike(endDate)) errors.push("endDate must be a valid date");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCreatePurchase = (req, res, next) => {
  try {
    const {
      item_name,
      quantity,
      unit,
      price,
      branch_name,
      created_by,
      status,
    } = req.body || {};
    const errors = [];

    if (!nonEmptyString(item_name)) errors.push("item_name is required");
    if (!nonEmptyString(unit)) errors.push("unit is required");
    if (!nonEmptyString(branch_name)) errors.push("branch_name is required");
    if (!isPositiveNumber(quantity)) errors.push("quantity must be a positive number");
    if (!isPositiveNumber(price)) errors.push("price must be a positive number");
    if (!isIntegerId(created_by)) errors.push("created_by must be a positive integer");
    if (status !== undefined && !["Pending", "Verified"].includes(status)) {
      errors.push("status must be Pending or Verified");
    }

    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateUpdatePurchase = (req, res, next) => {
  try {
    const errors = [];
    if (!isIntegerId(req.params.id)) errors.push("id param must be a positive integer");
    if (!req.body || typeof req.body !== "object") errors.push("request body must be an object");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validatePaymentsList = (req, res, next) => {
  try {
    const { vendorId, startDate, endDate } = req.query || {};
    const errors = [];
    if (vendorId !== undefined && !isIntegerId(vendorId)) errors.push("vendorId must be a positive integer");
    if (startDate !== undefined && !isIsoDateLike(startDate)) errors.push("startDate must be a valid date");
    if (endDate !== undefined && !isIsoDateLike(endDate)) errors.push("endDate must be a valid date");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateCreateVendorTransaction = (req, res, next) => {
  try {
    const { vendor_id, branch_name, amount, created_by } = req.body || {};
    const errors = [];
    if (!isIntegerId(vendor_id)) errors.push("vendor_id must be a positive integer");
    if (!nonEmptyString(branch_name)) errors.push("branch_name is required");
    if (Number.isNaN(Number(amount)) || Number(amount) === 0) {
      errors.push("amount must be a non-zero number");
    }
    if (!isIntegerId(created_by)) errors.push("created_by must be a positive integer");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateLedgerQuery = (req, res, next) => {
  try {
    const errors = [];
    if (!isIntegerId(req.params.vendorId)) errors.push("vendorId param must be a positive integer");
    if (!nonEmptyString(req.query.branchName)) errors.push("branchName query param is required");
    if (errors.length) failValidation(errors);
    next();
  } catch (error) {
    next(error);
  }
};
