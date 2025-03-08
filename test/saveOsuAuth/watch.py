import os
import sys
import time
import shutil
import getpass
import re
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 配置路径
OSU_ROOT = r"D:\UserFiles\Games\OSU\stable"
DATA_A_DIR = os.path.join(OSU_ROOT, "Data", "a")
SAVE_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users")  # saveOsuAuth/users 文件夹

def get_osu_username_and_cfg_path():
    """从 osu!.{用户名}.cfg 文件中获取 Username 字段的值，并返回配置文件路径"""
    current_user = getpass.getuser()
    cfg_path = os.path.join(OSU_ROOT, f"osu!.{current_user}.cfg")
    
    if not os.path.exists(cfg_path):
        # 尝试查找任何 osu!.*.cfg 文件
        for file in os.listdir(OSU_ROOT):
            if file.startswith("osu!.") and file.endswith(".cfg"):
                cfg_path = os.path.join(OSU_ROOT, file)
                break
    
    if not os.path.exists(cfg_path):
        print(f"错误: 无法找到 osu! 配置文件")
        return "unknown_user", None
    
    username = "unknown_user"
    try:
        with open(cfg_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith("Username = "):
                    username = line.strip().split(" = ")[1]
                    break
    except Exception as e:
        print(f"读取配置文件时出错: {e}")
    
    return username, cfg_path

def get_username_from_cfg(cfg_path):
    """从配置文件中获取用户名"""
    if not cfg_path or not os.path.exists(cfg_path):
        return "unknown_user"
    
    try:
        with open(cfg_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith("Username = "):
                    return line.strip().split(" = ")[1]
    except Exception as e:
        print(f"读取配置文件时出错: {e}")
    
    return "unknown_user"

def sync_data_a_and_cfg(cfg_path):
    """完全同步 Data/a 文件夹和配置文件到用户名文件夹"""
    if not os.path.exists(DATA_A_DIR) and not cfg_path:
        print(f"错误: Data/a 目录和配置文件都不存在")
        return False
    
    # 每次同步时重新获取用户名
    username = get_username_from_cfg(cfg_path)
    print(f"当前用户名: {username}")
    
    # 创建以用户名命名的目标文件夹
    target_dir = os.path.join(SAVE_ROOT, username)
    os.makedirs(target_dir, exist_ok=True)
    
    success = True
    
    # 同步 Data/a 目录
    if os.path.exists(DATA_A_DIR):
        target_a_dir = os.path.join(target_dir, "a")
        
        # 如果目标目录已存在，先删除
        if os.path.exists(target_a_dir):
            shutil.rmtree(target_a_dir)
        
        # 复制整个目录
        try:
            shutil.copytree(DATA_A_DIR, target_a_dir)
            print(f"已成功同步 Data/a 目录到 {target_a_dir}")
        except Exception as e:
            print(f"同步 Data/a 目录时出错: {e}")
            success = False
    
    # 同步配置文件
    if cfg_path and os.path.exists(cfg_path):
        cfg_filename = os.path.basename(cfg_path)
        target_cfg = os.path.join(target_dir, cfg_filename)
        
        try:
            shutil.copy2(cfg_path, target_cfg)
            print(f"已成功同步配置文件到 {target_cfg}")
        except Exception as e:
            print(f"同步配置文件时出错: {e}")
            success = False
    
    # 创建同步时间标记文件
    if success:
        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        with open(os.path.join(target_dir, "last_sync.txt"), "w") as f:
            f.write(f"最后同步时间: {timestamp}\n")
            f.write(f"用户名: {username}\n")
    
    return success

class OsuFileHandler(FileSystemEventHandler):
    def __init__(self, cfg_path):
        self.cfg_path = cfg_path
        self.last_sync_time = 0
        self.cooldown = 0.3  # 冷却时间（秒）
    
    def on_modified(self, event):
        current_time = time.time()
        # 检查是否在冷却期内
        if current_time - self.last_sync_time < self.cooldown:
            return
        
        # 检查是否是我们关注的文件/目录
        is_data_a = event.src_path.startswith(DATA_A_DIR)
        is_cfg = self.cfg_path and event.src_path == self.cfg_path
        
        if not (is_data_a or is_cfg):
            return
        
        if is_data_a:
            print(f"检测到 Data/a 目录变化: {event.src_path}")
        elif is_cfg:
            print(f"检测到配置文件变化: {event.src_path}")
            print(f"配置文件变化，将重新同步 Data/a 目录")
        
        # 无论是哪种变化，都同步两者
        if sync_data_a_and_cfg(self.cfg_path):
            self.last_sync_time = current_time

def main():
    # 检查 osu 根目录是否存在
    if not os.path.exists(OSU_ROOT):
        print(f"错误: osu 根目录不存在: {OSU_ROOT}")
        return
    
    # 确保 users 目录存在
    os.makedirs(SAVE_ROOT, exist_ok=True)
    
    # 获取配置文件路径
    _, cfg_path = get_osu_username_and_cfg_path()
    if cfg_path:
        print(f"配置文件路径: {cfg_path}")
    
    # 如果 Data/a 目录不存在，创建它
    if not os.path.exists(DATA_A_DIR):
        print(f"警告: Data/a 目录不存在，将创建空目录: {DATA_A_DIR}")
        os.makedirs(DATA_A_DIR, exist_ok=True)
    
    # 初始同步
    print("执行初始同步...")
    sync_data_a_and_cfg(cfg_path)
    
    # 设置文件系统监控
    event_handler = OsuFileHandler(cfg_path)
    observer = Observer()
    
    # 监控 Data/a 目录
    if os.path.exists(DATA_A_DIR):
        observer.schedule(event_handler, DATA_A_DIR, recursive=True)
        print(f"开始监控 {DATA_A_DIR} 目录的变化...")
    
    # 监控配置文件所在目录
    if cfg_path:
        cfg_dir = os.path.dirname(cfg_path)
        observer.schedule(event_handler, cfg_dir, recursive=False)
        print(f"开始监控 {cfg_path} 文件的变化...")
    
    observer.start()
    
    username = get_username_from_cfg(cfg_path)
    print(f"同步备份将保存到 {os.path.join(SAVE_ROOT, username)} 目录")
    print("按 Ctrl+C 停止监控")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    
    observer.join()
    print("监控已停止")

if __name__ == "__main__":
    main()