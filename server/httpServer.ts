/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:17:49
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 17:58:19
 * @FilePath: \webrtc-demo\server\httpServer.ts
 * @Description: 
 */
import express from 'express'
import { addUser, BaseResponse, getUsers, login } from './tools'
import logger from 'morgan'

const HTTP_PORT = 4000
const app = express()

app.use(logger('dev'))
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/api/user', async (req, res) => {
    const users = await getUsers()
    res.send(new BaseResponse(true, users))
})

app.post('/api/user', async (req, res) => {
    try {
        const data = req.body
        await addUser(data)
        res.send(new BaseResponse(true))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

app.post('/api/login', async (req, res) => {
    try {
        const data = req.body
        const user = await login(data)
        res.send(new BaseResponse(true, user))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

app.listen(HTTP_PORT, undefined, () => console.log('listening on: http://localhost:' + HTTP_PORT))