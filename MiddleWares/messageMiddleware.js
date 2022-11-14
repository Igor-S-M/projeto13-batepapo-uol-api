import joi from "joi"

export const bodySchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.any().required().valid("message", "private_message")
})

