export interface UserInfo {
    username: string;
    password?: string;
    online?: boolean;
}

export enum UserConnectMethods {
    MESSAGE,
    VIDEO
}
