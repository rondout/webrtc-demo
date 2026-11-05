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
import { getUserSettings, saveUserSettings } from './settings'
import { createServer } from 'https'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { randomBytes } from 'crypto'

const HTTP_PORT = 4004
const app = express()
// 仅用于登录状态校验：随机令牌保存在 HttpOnly Cookie，身份由服务端记录。
const loginSessions = new Map<string, { username: string; expiresAt: number }>()
const sessionMaxAge = 8 * 60 * 60 * 1000
const sessionCookieOptions = { secure: true, httpOnly: true, sameSite: 'lax' as const, path: '/' }
const sessionCleanup = setInterval(() => {
    for (const [token, session] of loginSessions) if (session.expiresAt <= Date.now()) loginSessions.delete(token)
}, 60000)
sessionCleanup.unref()

app.use(logger('dev'))
app.use(express.json())
app.use(express.static(resolve(__dirname, '../public')))

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

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
        loginSessions.delete(parseCookies(req.headers.cookie).session)
        const token = randomBytes(32).toString('hex')
        loginSessions.set(token, { username: user.username, expiresAt: Date.now() + sessionMaxAge })
        res.cookie('session', token, { ...sessionCookieOptions, maxAge: sessionMaxAge })
            .cookie('user', user.username, sessionCookieOptions)
            .send(new BaseResponse(true, { username: user.username, online: user.online }))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

app.get('/api/auth/check', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const token = parseCookies(req.headers.cookie).session
    const session = loginSessions.get(token)
    if (!session || session.expiresAt <= Date.now()) {
        loginSessions.delete(token)
        res.clearCookie('session', sessionCookieOptions).status(401).send(new BaseResponse(false, '请先登录'))
        return
    }
    try {
        const user = (await getUsers()).find(user => user.username === session.username)
        if (!user) {
            loginSessions.delete(token)
            res.status(401).send(new BaseResponse(false, '用户已不存在'))
            return
        }
        res.send(new BaseResponse(true, { username: user.username, online: user.online }))
    } catch {
        res.status(500).send(new BaseResponse(false, '登录状态校验失败'))
    }
})

app.get('/api/logout', async (req, res) => {
    loginSessions.delete(parseCookies(req.headers.cookie).session)
    res.clearCookie('session', sessionCookieOptions).clearCookie('user').send(new BaseResponse(true))
})

app.get('/api/msgs', async (req, res) => {
    try {
        await messageHandler.getAllMessages()
        res.send(new BaseResponse(true, messageHandler.getUserRelatedMessages(parseCookies(req.headers.cookie).user)))
    } catch (error) {
        res.status(500).send(new BaseResponse(false, error))
    }
})

app.get('/api/settings', async (req, res) => {
    try {
        const username = parseCookies(req.headers.cookie).user
        if (!username || !(await getUsers()).some(user => user.username === username)) {
            res.status(401).send(new BaseResponse(false, '请先登录'))
            return
        }
        res.send(new BaseResponse(true, await getUserSettings(username)))
    } catch {
        res.status(500).send(new BaseResponse(false, '读取用户设置失败'))
    }
})

app.put('/api/settings', async (req, res) => {
    try {
        const username = parseCookies(req.headers.cookie).user
        if (!username || !(await getUsers()).some(user => user.username === username)) {
            res.status(401).send(new BaseResponse(false, '请先登录'))
            return
        }
        const { microphoneEnabled, cameraEnabled } = req.body || {}
        if (typeof microphoneEnabled !== 'boolean' || typeof cameraEnabled !== 'boolean') {
            res.status(400).send(new BaseResponse(false, '设备设置必须为布尔值'))
            return
        }
        res.send(new BaseResponse(true, await saveUserSettings(username, { microphoneEnabled, cameraEnabled })))
    } catch {
        res.status(500).send(new BaseResponse(false, '保存用户设置失败'))
    }
})

// HTTPS 与 WSS 共用同一个 TLS 服务和开发证书。
const server = createServer({
    key: readFileSync(resolve(__dirname, '../../.certs/dev-key.pem')),
    cert: readFileSync(resolve(__dirname, '../../.certs/dev-cert.pem')),
}, app)
server.listen(HTTP_PORT, '0.0.0.0', () => console.log('listening on: https://localhost:' + HTTP_PORT))
const wsServer = new WebSocketServer({ server })

configWsServer(wsServer)

