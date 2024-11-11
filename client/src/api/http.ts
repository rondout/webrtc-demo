/*
 * @Author: shufei.han
 * @Date: 2024-11-07 17:33:39
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:02:29
 * @FilePath: \webrtc-demo\client\src\api\http.ts
 * @Description: 
 */
import type { UserInfo } from "@/models/base.model";
import type { MessageContent } from "@/models/ws.model";
import { HttpService } from "@gl/main";

export const httService = new HttpService({}, () => { }, (res) => {
    return res
}, (err) => {
    return Promise.reject(err.response.data.info)
})

export const mainService = {
    async login (data: UserInfo) {
        return await httService.post<UserInfo>('/api/login', data)
    },
    async logout () {
        return await httService.get('/api/logout')
    },
    async getAllUser () {
        return await httService.get<UserInfo[]>('/api/user')
    },
    getAllMessages () {
        return httService.get<MessageContent[]>('/api/msgs')
    },
}