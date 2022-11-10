import express from "express"
import cors from "cors"
import dayjs from "dayjs"


const server = express()

//configs
server.use(express.json())
server.use(cors())

//coleçoes do db - batePapoUol
const participants = []
const messages = []

server.get("/participants", (req, res) => {
    res.send(participants)
})

server.post("/participants", (req, res) => {

    const { name } = req.body

    if (!name) {
        res.sendStatus(422)
        return

    } else if (participants.find(i => i.name === name)) {
        res.sendStatus(409)
        return

    } else {

        let participant = {
            name,
            lastStatus: Date.now()
        }

        participants.push(participant)
        res.sendStatus(201)
    }
})


server.post("/messages", (req, res) => {

    const { to, text, type } = req.body
    const { user } = req.headers

    if (!to || !text) {
        res.status(422).send("errou no to/text")
        return
    //BUG estranho
    // } else if (type !== "message" || type !== "private_message") {
    //     res.status(422).send("errou no type")
    //     return
    } else if (!participants.find(i => i.name === user)) {
        res.status(422).send("errou no participants")
        return
    } else {

        const seg = (dayjs().second())
        const min = (dayjs().minute())
        const hora = (dayjs().hour())

        let msg = {
            from: user,
            to,
            text,
            type,
            time: `${hora}:${min}:${seg}`
        }

        messages.push(msg)
        res.sendStatus(201)
    }
})

server.get("/messages",(req,res)=>{
    res.send(messages)
})


server.post("/status",(req,res)=>{
    const {user} = req.headers
    const participant = participants.find((i)=>{i.name === user})

    if(!participant){
        res.status(404).send(participants)
    }else{
        participant.lastStatus =  Date.now()
        res.status(200).send(participants) 
    }
})

server.listen(5000)