import express from "express"
import cors from "cors"

const server = express()
server.use(express.json())
server.use(cors())

server.get("/",(req,res)=>{
    res.send("get deu bom")
})

server.post("/",(req,res)=>{
    res.send("post deu bom")    
})

server.listen(5000)