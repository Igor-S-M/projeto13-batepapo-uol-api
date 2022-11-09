import express from "express"
import cors from "cors"

const server = express()
server.use(express.json())
server.use(cors())

const participants = []

server.get("/participants", (req, res) => {
    res.send(participants)
})

server.post("/participants", (req, res) => {

    const { name } = req.body

    if (!name) {
        res.sendStatus(422)
        return

    }else if(participants.find(i=>i.name === name)){
        res.sendStatus(409)
        return

    }else{

        let participant = {
            name,
            lastStatus: "Date.now()"
        } 

        participants.push(participant)
        res.sendStatus(201)
    }


})

server.listen(5000)