/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:21:33
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 14:52:40
 * @FilePath: \webrtc-demo\server\tools\index.ts
 * @Description: 
 */
import fs from 'fs/promises'
import { resolve } from 'path'
import { getAllOnlineUsers } from './wsServer';

export interface UserInfo {
    username: string;
    password: string;
    online?: boolean;
}

export interface MessageContent {
    from: string;
    to: string;
    content: string;
    time: string | number;
}

export interface UserRelatedMessages extends MessageContent {
    isSelf: boolean;
}

export class MessageFactory implements MessageContent {
    public time: string | number;
    constructor(public from: string, public to: string, public content: string) {
        this.time = Date.now()
    }
}

export class BaseResponse<T> {
    constructor(public success: boolean = true, public info?: T) {
    }
}

const userListPath = resolve(__dirname, "../db/users.json")
const msgListPath = resolve(__dirname, "../db/msgs.json")

export const getUsers = async () => {
    const data = await fs.readFile(userListPath, "utf-8")
    const user = (JSON.parse(data) || []) as UserInfo[]

    try {
        const allOnlineUser = getAllOnlineUsers()
        user.forEach(item => {
            if (allOnlineUser.includes(item.username)) {
                item.online = true
            } else {
                item.online = false
            }
        })
        return user
    } catch (error) {
        return user
    }
}

// 串行执行注册的读取、查重和写入，避免同时注册覆盖 JSON 或产生同名账号。
let userWriteQueue: Promise<void> = Promise.resolve()
export const addUser = (user: UserInfo) => {
    const task = userWriteQueue.then(async () => {
        if (typeof user?.username !== 'string' || !user.username.trim() ||
            typeof user?.password !== 'string' || !user.password.trim())
            throw '用户名和密码不能为空'
        const username = user.username.trim()
        const userList = await getUsers()
        if (userList.find(u => u.username === username))
            throw '用户名已存在'
        // 只保存注册所需字段，密码保留原值，不裁剪用户输入的有效空格。
        userList.push({ username, password: user.password, online: false })
        await fs.writeFile(userListPath, JSON.stringify(userList))
    })
    userWriteQueue = task.catch(() => {})
    return task
}

export const login = async (user: UserInfo) => {
    const users = await getUsers()
    const foundUser = users.find(u => u.username === user.username && u.password === user.password)
    if (!foundUser)
        throw "username or password is not correct"
    return foundUser
}

export class MessagesHandler {
    public allMessages: MessageContent[] = []
    constructor() {
        this.getAllMessages()
    }

    public async getAllMessages() {
        try {
            const data = await fs.readFile(msgListPath, "utf-8")
            const msgs = (JSON.parse(data) || []) as MessageContent[]
            this.allMessages = msgs
        } catch (error) {

        }
    }

    public getUserRelatedMessages(user: string): UserRelatedMessages[] {
        return this.allMessages.filter(item => item.from === user || item.to === user).map(item => {
            return {
                ...item,
                isSelf: item.from === user
            }
        })
    }

    public async addMessage(msg: MessageContent) {
        msg.time = Date.now()
        this.allMessages.push(msg)
        await this.saveMsgsToDb()
    }

    private async saveMsgsToDb () {
        await fs.writeFile(msgListPath, JSON.stringify(this.allMessages))
    }
}

export const messageHandler = new MessagesHandler()
