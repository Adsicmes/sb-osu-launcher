from buff import *
from enum import IntEnum
from rich import print
from typing import List, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel, Field
import struct


class GameMode(IntEnum):
    osu = 0
    taiko = 1
    catch = 2
    mania = 3

class RankedStatus(IntEnum):
    unknown = 0
    unsubmitted = 1
    pending_wip_graveyard = 2
    unused = 3
    ranked = 4
    approved = 5
    qualified = 6
    loved = 7

class Grade(IntEnum):
    none = 0
    F = 1  # 失败
    D = 2
    C = 3
    B = 4
    A = 5
    S = 6  # 银S
    SH = 7  # 银S+
    X = 8  # 金S
    XH = 9  # 金S+

class TimingPoint(BaseModel):
    bpm: float
    offset: float  # 毫秒
    is_inherited: bool

class StarRating(BaseModel):
    mod_combination: int
    star_rating: float

class BeatmapInfo(BaseModel):
    artist: str
    artist_unicode: str
    song_title: str
    song_title_unicode: str
    creator: str
    difficulty: str
    audio_filename: str
    md5_hash: str
    osu_filename: str
    ranked_status: RankedStatus
    num_hitcircles: int
    num_sliders: int
    num_spinners: int
    last_modification_time: datetime
    approach_rate: float
    circle_size: float
    hp_drain: float
    overall_difficulty: float
    slider_velocity: float
    star_rating_osu: List[StarRating] = Field(default_factory=list)
    star_rating_taiko: List[StarRating] = Field(default_factory=list)
    star_rating_catch: List[StarRating] = Field(default_factory=list)
    star_rating_mania: List[StarRating] = Field(default_factory=list)
    drain_time: int  # 秒
    total_time: int  # 毫秒
    preview_time: int  # 毫秒
    timing_points: List[TimingPoint] = Field(default_factory=list)
    difficulty_id: int
    beatmap_id: int
    thread_id: int
    grade_osu: Grade
    grade_taiko: Grade
    grade_catch: Grade
    grade_mania: Grade
    local_offset: int
    stack_leniency: float
    gameplay_mode: GameMode
    song_source: str
    song_tags: str
    online_offset: int
    font_title: str
    is_unplayed: bool
    last_played: datetime
    is_osz2: bool
    folder_name: str
    last_checked: datetime
    ignore_sound: bool
    ignore_skin: bool
    disable_storyboard: bool
    disable_video: bool
    visual_override: bool
    mania_scroll_speed: int = 0

class OsuDb(BaseModel):
    version: int
    folder_count: int
    account_unlocked: bool
    unlock_date: datetime
    player_name: str
    beatmaps: List[BeatmapInfo] = Field(default_factory=list)
    user_permissions: int

def read_byte(f):
    """读取一个字节并转换为整数"""
    return int.from_bytes(f.read(1), byteorder='little')

def read_short(f):
    """读取两个字节并转换为短整数"""
    return int.from_bytes(f.read(2), byteorder='little')

def read_int(f):
    """读取四个字节并转换为整数"""
    return int.from_bytes(f.read(4), byteorder='little')

def read_long(f):
    """读取八个字节并转换为长整数"""
    return int.from_bytes(f.read(8), byteorder='little')

def read_single(f):
    """读取四个字节并转换为单精度浮点数"""
    import struct
    return struct.unpack('<f', f.read(4))[0]

def read_double(f):
    """读取八个字节并转换为双精度浮点数"""
    import struct
    return struct.unpack('<d', f.read(8))[0]

def read_boolean(f):
    """读取一个字节并转换为布尔值"""
    return bool(int.from_bytes(f.read(1), byteorder='little'))

def read_uleb128(f):
    """
    从文件或缓冲区读取 ULEB128 编码的无符号整数
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        解码后的无符号整数
    """
    result = 0
    shift = 0
    
    while True:
        byte = int.from_bytes(f.read(1), byteorder='little')
        result |= ((byte & 0x7F) << shift)
        if (byte & 0x80) == 0:
            break
        shift += 7
    return result
    
def read_string(f):
    """
    从文件或缓冲区读取 osu! 格式的字符串
    
    字符串格式:
    - 1字节标志 (0x00 表示空字符串，0x0b 表示有内容)
    - 如果标志是 0x0b，接下来是 ULEB128 编码的字符串长度
    - 然后是 UTF-8 编码的字符串内容
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        解码后的字符串，如果标志是 0x00 则返回空字符串
    """
    flag = int.from_bytes(f.read(1), byteorder='little')
    
    if flag == 0x00:
        return ""
    
    if flag != 0x0b:
        raise ValueError(f"无效的字符串标志: {flag}，应为 0x00 或 0x0b")
    
    string_length = read_uleb128(f)
    string_bytes = f.read(string_length)
    
    try:
        return string_bytes.decode('utf-8')
    except UnicodeDecodeError:
        print(f"警告: UTF-8 解码失败，使用 latin-1 编码")
        return string_bytes.decode('latin-1')

def read_int_float_pair(f):
    """
    从文件或缓冲区读取 int_float_pair 数据类型
    
    格式:
    - 1字节标志 (0x08)
    - 4字节整数
    - 1字节标志 (0x0c)
    - 4字节浮点数
    
    总共10字节
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        (整数, 浮点数) 的元组
    """
    # 读取第一个标志字节 (应为 0x08)
    flag1 = int.from_bytes(f.read(1), byteorder='little')
    if flag1 != 0x08:
        raise ValueError(f"无效的 int_float_pair 第一个标志: {flag1}，应为 0x08")
    
    # 读取整数
    int_value = int.from_bytes(f.read(4), byteorder='little')
    
    # 读取第二个标志字节 (应为 0x0c)
    flag2 = int.from_bytes(f.read(1), byteorder='little')
    if flag2 != 0x0c:
        raise ValueError(f"无效的 int_float_pair 第二个标志: {flag2}，应为 0x0c")
    
    # 读取浮点数
    import struct
    float_value = struct.unpack('<f', f.read(4))[0]
    
    return (int_value, float_value)

def read_int_double_pair(f):
    """
    从文件或缓冲区读取 int_double_pair 数据类型
    
    格式:
    - 1字节标志 (0x08)
    - 4字节整数
    - 1字节标志 (0x0d)
    - 8字节双精度浮点数
    
    总共14字节
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        (整数, 双精度浮点数) 的元组
    """
    # 读取第一个标志字节 (应为 0x08)
    flag1 = int.from_bytes(f.read(1), byteorder='little')
    if flag1 != 0x08:
        raise ValueError(f"无效的 int_double_pair 第一个标志: {flag1}，应为 0x08")
    
    # 读取整数
    int_value = int.from_bytes(f.read(4), byteorder='little')
    
    # 读取第二个标志字节 (应为 0x0d)
    flag2 = int.from_bytes(f.read(1), byteorder='little')
    if flag2 != 0x0d:
        raise ValueError(f"无效的 int_double_pair 第二个标志: {flag2}，应为 0x0d")
    
    # 读取双精度浮点数
    import struct
    double_value = struct.unpack('<d', f.read(8))[0]
    
    return (int_value, double_value)

def read_timing_point(f):
    """
    从文件或缓冲区读取 timing_point 数据类型
    
    格式:
    - 8字节双精度浮点数 (BPM)
    - 8字节双精度浮点数 (偏移量，毫秒)
    - 1字节布尔值 (是否为继承时间点)
    
    总共17字节
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        (bpm, 偏移量, 是否继承) 的元组
    """
    import struct
    
    # 读取 BPM (双精度浮点数)
    bpm = struct.unpack('<d', f.read(8))[0]
    
    # 读取偏移量 (双精度浮点数)
    offset = struct.unpack('<d', f.read(8))[0]
    
    # 读取是否继承 (布尔值)
    # 在 osu! 文件中，布尔值为 0 表示 True，1 表示 False
    # 但这里我们将其转换为 Python 的布尔值，所以 0 为 False，非 0 为 True
    is_inherited = int.from_bytes(f.read(1), byteorder='little') == 0
    
    return (bpm, offset, is_inherited)

def read_datetime(f):
    """
    从文件或缓冲区读取 datetime 数据类型
    
    格式:
    - 8字节长整数，表示自 0001-01-01 00:00:00 UTC 以来的 100 纳秒间隔数（ticks）
    
    参数:
        f: 文件对象或具有 read 方法的缓冲区
        
    返回:
        datetime 对象
    """
    import struct
    from datetime import datetime, timedelta
    
    # 读取 ticks (64位整数)
    ticks = struct.unpack('<q', f.read(8))[0]
    
    # 转换为 datetime 对象
    # .NET 的 ticks 是自 0001-01-01 00:00:00 UTC 以来的 100 纳秒间隔数
    # Python 的 datetime 从 1 年 1 月 1 日开始，所以可以直接使用
    # 1 tick = 100 纳秒 = 0.0000001 秒
    seconds = ticks / 10000000  # 转换为秒
    
    # 创建基准日期 (0001-01-01 00:00:00 UTC)
    base_date = datetime(1, 1, 1)
    
    # 添加秒数
    result_date = base_date + timedelta(seconds=seconds)
    
    return result_date


def write_byte(f, value):
    """写入一个字节"""
    f.write(value.to_bytes(1, byteorder='little'))

def write_short(f, value):
    """写入两个字节（短整数）"""
    f.write(value.to_bytes(2, byteorder='little'))

def write_int(f, value):
    """写入四个字节（整数）"""
    f.write(value.to_bytes(4, byteorder='little'))

def write_long(f, value):
    """写入八个字节（长整数）"""
    f.write(value.to_bytes(8, byteorder='little'))

def write_single(f, value):
    """写入单精度浮点数"""
    import struct
    f.write(struct.pack('<f', value))

def write_double(f, value):
    """写入双精度浮点数"""
    import struct
    f.write(struct.pack('<d', value))

def write_boolean(f, value):
    """写入布尔值"""
    f.write(b'\x01' if value else b'\x00')

def write_string(f, value):
    """写入字符串（osu! 格式）"""
    if not value:
        f.write(b'\x00')  # 空字符串
        return
    
    f.write(b'\x0b')  # 字符串标志
    
    # 编码为 UTF-8
    encoded = value.encode('utf-8')
    
    # 写入长度（ULEB128 编码）
    length = len(encoded)
    while True:
        byte = length & 0x7F
        length >>= 7
        if length == 0:
            f.write(byte.to_bytes(1, byteorder='little'))
            break
        f.write((byte | 0x80).to_bytes(1, byteorder='little'))
    
    # 写入字符串内容
    f.write(encoded)

def write_datetime(f, dt):
    """写入日期时间（.NET ticks 格式）"""
    from datetime import datetime, timedelta
    
    # 计算自 0001-01-01 以来的 ticks
    base_date = datetime(1, 1, 1)
    delta = dt - base_date
    ticks = int(delta.total_seconds() * 10000000)
    
    # 写入 ticks
    write_long(f, ticks)

def write_int_float_pair(f, int_value, float_value):
    """写入整数-浮点数对"""
    f.write(b'\x08')  # 第一个标志
    write_int(f, int_value)
    f.write(b'\x0c')  # 第二个标志
    write_single(f, float_value)

def write_int_double_pair(f, int_value, double_value):
    """写入整数-双精度浮点数对"""
    f.write(b'\x08')  # 第一个标志
    write_int(f, int_value)
    f.write(b'\x0d')  # 第二个标志
    write_double(f, double_value)

def write_timing_point(f, bpm, offset, is_inherited):
    """写入时间点"""
    write_double(f, bpm)
    write_double(f, offset)
    write_boolean(f, is_inherited)

def write_star_rating(f, star_ratings, version):
    """写入星级信息"""
    write_int(f, len(star_ratings))
    for sr in star_ratings:
        if version >= 20250107:
            write_int_float_pair(f, sr.mod_combination, sr.star_rating)
        else:
            write_int_double_pair(f, sr.mod_combination, sr.star_rating)

def write_beatmap(f, beatmap, version):
    """写入谱面信息"""
    # 如果版本较旧，需要先写入谱面大小
    # 由于无法预先知道大小，我们先记录位置，写入0，然后在写完后回来更新
    size_pos = None
    if version < 20191106:
        size_pos = f.tell()
        write_int(f, 0)  # 临时写入0
    
    # 写入基本信息
    write_string(f, beatmap.artist)
    write_string(f, beatmap.artist_unicode)
    write_string(f, beatmap.song_title)
    write_string(f, beatmap.song_title_unicode)
    write_string(f, beatmap.creator)
    write_string(f, beatmap.difficulty)
    write_string(f, beatmap.audio_filename)
    write_string(f, beatmap.md5_hash)
    write_string(f, beatmap.osu_filename)
    write_byte(f, int(beatmap.ranked_status))
    write_short(f, beatmap.num_hitcircles)
    write_short(f, beatmap.num_sliders)
    write_short(f, beatmap.num_spinners)
    
    # 写入修改时间
    write_datetime(f, beatmap.last_modification_time)
    
    # 根据版本写入难度参数
    if version < 20140609:
        write_byte(f, int(beatmap.approach_rate))
        write_byte(f, int(beatmap.circle_size))
        write_byte(f, int(beatmap.hp_drain))
        write_byte(f, int(beatmap.overall_difficulty))
    else:
        write_single(f, beatmap.approach_rate)
        write_single(f, beatmap.circle_size)
        write_single(f, beatmap.hp_drain)
        write_single(f, beatmap.overall_difficulty)
    
    write_double(f, beatmap.slider_velocity)
    
    # 写入星级信息
    if version >= 20140609:
        write_star_rating(f, beatmap.star_rating_osu, version)
        write_star_rating(f, beatmap.star_rating_taiko, version)
        write_star_rating(f, beatmap.star_rating_catch, version)
        write_star_rating(f, beatmap.star_rating_mania, version)
    
    # 写入其他信息
    write_int(f, beatmap.drain_time)
    write_int(f, beatmap.total_time)
    write_int(f, beatmap.preview_time)
    
    # 写入时间点
    write_int(f, len(beatmap.timing_points))
    for tp in beatmap.timing_points:
        write_timing_point(f, tp.bpm, tp.offset, tp.is_inherited)
    
    write_int(f, beatmap.difficulty_id)
    write_int(f, beatmap.beatmap_id)
    write_int(f, beatmap.thread_id)
    
    write_byte(f, int(beatmap.grade_osu))
    write_byte(f, int(beatmap.grade_taiko))
    write_byte(f, int(beatmap.grade_catch))
    write_byte(f, int(beatmap.grade_mania))
    
    write_short(f, beatmap.local_offset)
    write_single(f, beatmap.stack_leniency)
    write_byte(f, int(beatmap.gameplay_mode))
    write_string(f, beatmap.song_source)
    write_string(f, beatmap.song_tags)
    write_short(f, beatmap.online_offset)
    write_string(f, beatmap.font_title)
    write_boolean(f, beatmap.is_unplayed)
    write_datetime(f, beatmap.last_played)
    write_boolean(f, beatmap.is_osz2)
    write_string(f, beatmap.folder_name)
    write_datetime(f, beatmap.last_checked)
    write_boolean(f, beatmap.ignore_sound)
    write_boolean(f, beatmap.ignore_skin)
    write_boolean(f, beatmap.disable_storyboard)
    write_boolean(f, beatmap.disable_video)
    write_boolean(f, beatmap.visual_override)
    
    # 写入未知字段（如果版本较旧）
    if version < 20140609:
        write_short(f, 0)  # 未知字段
    
    write_int(f, 0)  # 最后修改时间（？）
    write_byte(f, beatmap.mania_scroll_speed)
    
    # 如果需要，更新谱面大小
    if size_pos is not None:
        current_pos = f.tell()
        size = current_pos - size_pos - 4  # 减去 size 字段本身的大小
        f.seek(size_pos)
        write_int(f, size)
        f.seek(current_pos)  # 恢复位置

def write_osu_db(file_path, osu_db):
    """
    将 OsuDb 对象写入文件
    
    参数:
        file_path: 输出文件路径
        osu_db: OsuDb 对象
    """
    with open(file_path, "wb") as f:
        # 写入头部信息
        write_int(f, osu_db.version)
        write_int(f, osu_db.folder_count)
        write_boolean(f, osu_db.account_unlocked)
        write_datetime(f, osu_db.unlock_date)
        write_string(f, osu_db.player_name)
        write_int(f, len(osu_db.beatmaps))
        
        # 写入谱面信息
        for beatmap in osu_db.beatmaps:
            write_beatmap(f, beatmap, osu_db.version)
        
        # 写入用户权限
        write_int(f, osu_db.user_permissions)
