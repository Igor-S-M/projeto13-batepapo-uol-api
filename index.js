import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from "joi"


const bodySchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.any().required().valid("message","private_message")
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
        res.send(promise.reverse())
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

server.post("/participants", async (req, res) => {

    const { name } = req.body

    if (!name) {
        res.sendStatus(422)
        return

    }

    const userFound = await db
        .collection("participants")
        .findOne({ name: name })

    if (userFound) {
        res.status(400)
        return
    }

    try {
        await db.collection("participants").insert({
            name,
            lastStatus: Date.now()
        })
        res.sendStatus(201)

    } catch (err) {
        res.sendStatus(500)
    }

})

server.get("/messages", async (req, res) => {

    const {limit} = req.query
    const {user} = req.headers

    function filtragem(msg){
        if(msg.type === "message"){
            return true
        }else if(msg.to === user || msg.from === user){
            return true
        }else{
            return false
        }     
    }

    try {
        const promise = await db.collection("messages").find().toArray()
        const valid =  promise.filter(message => filtragem(message))
        res.send(valid.slice(-limit).reverse())

    } catch (err) {
        console.log(err)
        res.sendStatus(500)

    }

})

server.post("/messages", async (req, res) => {

    const { to, text, type } = req.body
    const { user } = req.headers

    const validation = bodySchema.validate({ to, text, type }, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        res.status(422).send(errors)
        return
    }

    const userFound = await db
        .collection("participants")
        .findOne({ name: user })

    if (!userFound) {
        res.status(422)
        return
    }

    const seg = (dayjs().second())
    const min = (dayjs().minute())
    const hora = (dayjs().hour())

    try {
        await db.collection("messages").insert({
            from: user,
            to,
            text,
            type,
            time: `${hora}:${min}:${seg}`
        })
        res.sendStatus(201)

    } catch (err) {
        res.sendStatus(500)
    }

})

server.put("/messages/:id", async (req, res) => {
    const { id } = req.params
    const { to, text, type } = req.body
    const { user } = req.headers

    const seg = (dayjs().second())
    const min = (dayjs().minute())
    const hora = (dayjs().hour())

    const validation = bodySchema.validate({ to, text, type }, { abortEarly: false })

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

        await db.collection("messages").updateOne({ _id: new ObjectId(id) }, {
            $set: {
                from: user,
                to,
                text,
                type,
                time: `${hora}:${min}:${seg}`
            }
        })

        res.send("atualizei a msg")
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
            $set: { name: user, lastStatus : Date.now() }
        })
        res.status(200)

    }catch(err){
        console.log(err)
        res.sendStatus(500)
    }

})

server.listen(5000)