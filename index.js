import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from "joi"


const stringSchema = joi.string().required().min(1)

const bodySchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.any().required().valid("message", "private_message")
})


const server = express()

//configs
server.use(express.json())
server.use(cors())
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db("batePapoUol")
} catch (err) {
    console.log(err)
}


server.get("/participants", async (req, res) => {

    try {
        const promise = await db.collection("participants").find().toArray()

        res.send(promise)

    } catch (err) {

        console.log(err)
        res.sendStatus(500)
    }
})

server.post("/participants", async (req, res) => {

    const { name } = req.body
    const validationName = stringSchema.validate(name)

    if (validationName.error) {
        res.status(422).send(validationName.error.message)
        return
    }

    try {
        const userFound = await db
            .collection("participants")
            .findOne({ name: name })

        if (userFound) {
            res.status(409).send("nome de usuário já cadastrado")
            return
        }

        await db.collection("participants").insert({
            name,
            lastStatus: Date.now()
        })

        await db.collection("messages").insert({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`    
        })

        res.sendStatus(201)

    } catch (err) {

        console.log(err)
        res.sendStatus(500)
    }

})

server.get("/messages", async (req, res) => {

    const { limit } = req.query
    const { user } = req.headers

    function filtragem(msg) {
        if (msg.type === "message" || msg.type === "status") {
            return true
        } else if (msg.to === user || msg.from === user) {
            return true
        } else {
            return false
        }
    }

    try {
        const promise = await db
            .collection("messages")
            .find()
            .toArray()
            
        const filteredPromisse = promise.filter(message => filtragem(message))

        res.send(filteredPromisse.slice(-limit).reverse())

    } catch (err) {
        console.log(err)
        res.sendStatus(500)

    }

})

server.post("/messages", async (req, res) => {

    const body = req.body
    const { user } = req.headers
    const validation = bodySchema.validate(body, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        res.status(422).send(errors)
        return
    }

    try {
        const userFound = await db
            .collection("participants")
            .findOne({ name: user })

        if (!userFound) {
            res.status(422)
            return
        }

        await db.collection("messages").insert({
            ...body, from: user, time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        })

        res.sendStatus(201)

    } catch (err) {

        console.log(err)
        res.sendStatus(500)
    }
})

server.put("/messages/:id", async (req, res) => {
    const { id } = req.params
    const body = req.body
    const { user } = req.headers

    const validation = bodySchema.validate(body, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        res.status(422).send(errors)
        return
    }

    try {
        const userFound = await db
            .collection("messages")
            .findOne({ _id: new ObjectId(id) })

        if (!userFound) {
            res.status(422)
            return
        }

        const foundID = await db
            .collection("messages")
            .findOne({ _id: new ObjectId(id) })

        if (!foundID) {
            res.status(404)
            return
        }

        if(user !== foundID.from){
            res.status(401)
            return
        }

        await db.collection("messages").updateOne({ _id: new ObjectId(id) }, {
            $set: {
                ...body, from: user, time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
            }
        })
        res.send(200)

    } catch (err) {
        console.log(err)
        res.sendStatus(404)
    }
})

server.post("/status", async (req, res) => {
    const { user } = req.headers

    const userFound = await db
        .collection("participants")
        .findOne({ name: user })

    if (!userFound) {
        res.status(404)
        return
    }

    try {
        await db.collection("participants").updateOne({ name: user }, {
            $set: { name: user, lastStatus: Date.now() }
        })
        res.status(200)

    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

})

server.listen(5000)