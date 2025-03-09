import { invoke } from "@tauri-apps/api/core";
import { DPAPIUtil } from "./dpapi";
import { Server } from "@/zustand/osu-auth";

export interface ServerUserCredentials {
    username: string;
    plain_password: string;
}

export class OsuUtil {
    /**
     * 修改osu配置文件中的服务器凭据
     * @param configFile osu配置文件路径
     * @param credentials 用户凭据
     * @param server 服务器信息
     */
    public static setServerCredentials(configFile: string, credentials: ServerUserCredentials, server: Server): void {
        try {
            invoke("set_osu_server_credentials", {
                configFile,
                credentials,
                server,
            });
        } catch (error) {
            console.error("修改配置文件失败:", error);
        }
    }
}

export class Credentials {
    private _username: string;
    private _password: string;
    private readonly SECRET_KEY = "cu24180ncjeiu0ci1nwui"; // 与原项目相同的密钥

    constructor(username: string = "", plainPassword: string = "") {
        this._username = username;
        this._password = plainPassword;
    }

    get username(): string {
        return this._username;
    }

    set username(value: string) {
        this._username = value;
    }

    // 用于JSON序列化时使用的加密密码属性
    get encryptedPassword(): string {
        return DPAPIUtil.encrypt(this._password, this.SECRET_KEY);
    }

    set encryptedPassword(value: string) {
        this._password = DPAPIUtil.decrypt(value, this.SECRET_KEY);
    }

    // 明文密码，仅程序内部使用
    get plainPassword(): string {
        return this._password;
    }

    set plainPassword(value: string) {
        this._password = value;
    }

    // 序列化为JSON时使用
    toJSON() {
        return {
            username: this._username,
            password: this.encryptedPassword,
        };
    }

    // 从JSON反序列化
    static fromJSON(json: any): Credentials {
        const credentials = new Credentials();
        credentials.username = json.username;
        credentials.encryptedPassword = json.password;
        return credentials;
    }
}
