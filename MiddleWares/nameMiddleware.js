import joi from "joi"
export const nameSchema = joi.string().required().min(1)

