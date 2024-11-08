/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:21:33
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 17:31:52
 * @FilePath: \webrtc-demo\server\tools\index.ts
 * @Description: 
 */
import fs from 'fs/promises'
import { resolve } from 'path'

export interface UserInfo {
    username: string;
    password: string;
}

export class BaseResponse<T> {
    constructor(public success: boolean = true, public info?: T) {
    }
}

const userListPath = resolve(__dirname, "../db/users.json")

export const getUsers = async () => {
    const data = await fs.readFile(userListPath, "utf-8")
    return (JSON.parse(data) || []) as UserInfo[]
}

export const addUser = async (user: UserInfo) => {
    try {
        const userList = await getUsers()
        console.log(user);

        if (userList.find(u => u.username === user.username))
            throw "user already exist"
        if (!user.username || !user.password)
            throw "user not valid"
        userList.push(user)
        await fs.writeFile(userListPath, JSON.stringify(userList))
    } catch (error) {
        throw error?.toString() || "user not valid"
    }
}

export const login = async (user: UserInfo) => {
    const users = await getUsers()
    const foundUser = users.find(u => u.username === user.username && u.password === user.password)
    if (!foundUser)
        throw "username or password is not correct"
    return foundUser
}