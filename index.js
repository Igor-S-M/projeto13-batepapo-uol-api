import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import joi from "joi"


const messageSchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.required()
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

//coleçoes do db - batePapoUol
const participants = []


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

        // } else if (participants.filter(i => i.name === name).length === 0) {
        //     res.sendStatus(409)
        //     return

    } else {

        try {
            await db.collection("participants").insert({
                name,
                lastStatus: Date.now()
            })
            res.sendStatus(201)

        } catch (err) {
            res.sendStatus(500)
        }

    }
})

server.get("/messages", async (req, res) => {

    try {
        const promise = await db.collection("messages").find().toArray()
        res.send(promise.reverse())

    } catch (err) {
        console.log(err)
        res.sendStatus(500)

    }

})

server.post("/messages", async (req, res) => {

    const { to, text, type } = req.body
    const { user } = req.headers

    const validation = messageSchema.validate({to,text,type},{abortEarly:false})

    if(validation.error){
        const errors = validation.error.details.map(detail=> detail.message)
        res.status(422).send(errors)
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

server.post("/status", (req, res) => {
    const { user } = req.headers
    const participant = participants.filter((i) => { i.name === user })

    if (!participant) {
        res.status(404).send(participants)
    } else {
        participant.lastStatus = Date.now()
        res.status(200).send(participants)
    }
})

server.listen(5000)