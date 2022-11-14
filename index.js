import express from "express"
import cors from "cors"
import dayjs from "dayjs"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import { bodySchema } from "./MiddleWares/messageMiddleware.js"
import { nameSchema } from "./MiddleWares/nameMiddleware.js"

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

const participantsCollection = db.collection("participants")
const messagesCollection = db.collection("messages")

async function findUserList() {
    const userList = await participantsCollection.find().toArray()
    return userList
}

async function findMessageList() {
    const messageList = await messagesCollection.find().toArray()
    return messageList
}

async function findUser(name) {

    const foundUser = await participantsCollection.findOne({ name: name })
    return foundUser
}

async function findMessage(id) {

    const foundMessage = await messagesCollection.findOne({ _id: new ObjectId(id) })
    return foundMessage
}

async function addMessage(obj) {
    await messagesCollection.insertOne({ ...obj })
}

async function addParticipant(obj) {
    await participantsCollection.insertOne({ ...obj })
}

async function removeMessage(id) {
    await messagesCollection.deleteOne({ _id: ObjectId(id) })
}

async function removeParticipant(name) {
    await participantsCollection.deleteOne({ name: name })
}

async function changeMessage(beforeID, after) {
    await messagesCollection.updateOne({ _id: new ObjectId(beforeID) }, {
        $set: after
    })
}

async function updateParticipantStatus(name) {
    await participantsCollection.updateOne({ name }, {
        $set: { name, lastStatus: Date.now() }
    })
}


server.post("/participants", async (req, res) => {

    const { name } = req.body

    const nameValidation = nameSchema.validate(name)

    if (nameValidation.error) {
        return res.status(422).send(nameValidation.error.message)
    }

    try {

        const userFound = await findUser(name)

        if (userFound) {
            return res.status(409).send("nome de usuário já cadastrado")
        }

        await addParticipant({
            name,
            lastStatus: Date.now()
        })

        await addMessage({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        })

        return res.sendStatus(201)

    } catch (err) {
        console.log(err)
        return res.sendStatus(500)
    }

})

server.get("/participants", async (req, res) => {

    try {
        const userList = await findUserList()
        return res.status(200).send(userList)
    } catch (err) {
        console.log(err)
        return res.sendStatus(500)
    }
})

server.post("/messages", async (req, res) => {

    const body = req.body
    const { user } = req.headers

    try {
        const userFound = await findUser(user)

        if (!userFound) {
            return res.sendStatus(422)
        }

        const validation = bodySchema.validate(body, { abortEarly: false })

        if (validation.error) {

            const errors = validation.error.details.map(detail => detail.message)
            return res.status(422).send(errors)
        }

        addMessage({
            ...body, from: user, time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        })

        return res.sendStatus(201)

    } catch (err) {

        console.log(err)
        return res.sendStatus(500)
    }
})

server.get("/messages", async (req, res) => {

    const { limit } = req.query
    const { user } = req.headers

    function seekPermission(msg) {
        if (msg.type === "message" || msg.type === "status") {
            return true
        } else if (msg.to === user || msg.from === user) {
            return true
        } else {
            return false
        }
    }

    try {
        const messagesList = await findMessageList()
        const allowedMessages = messagesList
            .filter(message => seekPermission(message))


        return res.status(200).send(allowedMessages.slice(-limit))

    } catch (err) {
        console.log(err)
        return res.sendStatus(500)

    }

})


server.delete("/messages/:id", async (req, res) => {
    const { id } = req.params
    const { user } = req.headers

    try {
        const messageFound = await findMessage(id)
        const userFound = await findUser(user)

        if (!messageFound) {
            return res.sendStatus(404)
        }

        if (!userFound) {
            return res.sendStatus(422)

        }
        if (userFound.name !== messageFound.from) {
            return res.sendStatus(401)
        }

        await removeMessage(id)
        return res.sendStatus(200)

    } catch (err) {
        console.log(err)
        return res.sendStatus(500)
    }
})

server.put("/messages/:id", async (req, res) => {
    const { id } = req.params
    const body = req.body
    const { user } = req.headers

    const validation = bodySchema.validate(body, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try {
        const messageFound = await findMessage(id)
        const userFound = await findUser(user)

        if (!messageFound) {
            return res.status(404).send("num achei")
        }

        if (!userFound) {
            return res.sendStatus(422)
        }

        //trava aqui
        if (userFound.name !== messageFound.from) {
            return res.sendStatus(401)
        }

        await changeMessage(id, {
            ...body,
            from: user,
            time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        })
        return res.sendStatus(200)

    } catch (err) {
        console.log(err)
        return res.sendStatus(404)
    }
})

server.post("/status", async (req, res) => {
    const { user } = req.headers

    const userFound = await findUser(user)

    if (!userFound) {
        return res.sendStatus(404)
    }

    try {
        await updateParticipantStatus(user)
        return res.sendStatus(200)

    } catch (err) {
        console.log(err)
        return res.sendStatus(500)
    }

})


setInterval(async () => {
    const userList = await findUserList()
    userList.forEach(participant => {
        if (Date.now() - participant.lastStatus > 10000) {
            addMessage({
                from: participant.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
            })
            removeParticipant(participant.name)
        }
    })


}, 5000)

server.listen(5000)