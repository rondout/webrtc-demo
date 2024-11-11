export interface UserInfo {
    username: string;
    password: string;
    online?: boolean;
}

export const UserLoginStatusStorageKey = 'userLoginStatus'

export const getUserLoggedIn = () => {
    try {
        const user = JSON.parse(localStorage.getItem(UserLoginStatusStorageKey) as string) as UserInfo
        if (user.username && user.password) {
            return user
        } else {
            return null

        }
    } catch (error) {
        return null
    }
}

export const setUserLoggedIn = (userInfo?: UserInfo) => localStorage.setItem(UserLoginStatusStorageKey, JSON.stringify(userInfo))

export enum UserConnectMethods {
    MESSAGE,
    VIDEO
}