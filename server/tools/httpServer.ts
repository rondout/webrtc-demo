/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:17:49
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 14:54:11
 * @FilePath: \webrtc-demo\server\tools\httpServer.ts
 * @Description: 
 */
import express from 'express'
import { addUser, BaseResponse, getUsers, login, MessageContent, messageHandler } from '.'
import logger from 'morgan'
import { WebSocketServer } from 'ws'
import configWsServer from './wsServer'
import { parseCookies } from './util'

const HTTP_PORT = 4004
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
        res.cookie('user', user.username).send(new BaseResponse(true, user))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

app.get('/api/logout', async (req, res) => {
    res.clearCookie('user').send(new BaseResponse(true))
})

app.get('/api/msgs', async (req, res) => {
    try {
        await messageHandler.getAllMessages()
        res.send(new BaseResponse(true, messageHandler.getUserRelatedMessages(parseCookies(req.headers.cookie).user)))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

const server = app.listen(HTTP_PORT, undefined, () => console.log('listening on: http://localhost:' + HTTP_PORT))
const wsServer = new WebSocketServer({ server })

configWsServer(wsServer)

