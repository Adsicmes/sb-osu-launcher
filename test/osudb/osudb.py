from buff import *
from enum import IntEnum
from rich import print
from typing import List, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel, Field
import struct


def read_osu_db(file_path):
    with open(file_path, "rb") as f:
        # 读取头部信息
        version = read_int(f)
        folder_count = read_int(f)
        account_unlocked = read_boolean(f)
        unlock_date = read_datetime(f)
        player_name = read_string(f)
        num_beatmaps = read_int(f)
        
        # 创建数据库对象
        osu_db = OsuDb(
            version=version,
            folder_count=folder_count,
            account_unlocked=account_unlocked,
            unlock_date=unlock_date,
            player_name=player_name,
            beatmaps=[],
            user_permissions=0
        )
        
        # 读取所有谱面信息
        for _ in range(num_beatmaps):
            # 跳过谱面大小字段（如果版本较旧）
            if version < 20191106:
                _ = read_int(f)  # 跳过谱面大小
                
            # 读取谱面基本信息
            artist = read_string(f)
            artist_unicode = read_string(f)
            song_title = read_string(f)
            song_title_unicode = read_string(f)
            creator = read_string(f)
            difficulty = read_string(f)
            audio_filename = read_string(f)
            md5_hash = read_string(f)
            osu_filename = read_string(f)
            ranked_status = RankedStatus(read_byte(f))
            num_hitcircles = read_short(f)
            num_sliders = read_short(f)
            num_spinners = read_short(f)
            last_modification_time = read_datetime(f)
            
            # 根据版本读取难度参数
            if version < 20140609:
                approach_rate = float(read_byte(f))
                circle_size = float(read_byte(f))
                hp_drain = float(read_byte(f))
                overall_difficulty = float(read_byte(f))
            else:
                approach_rate = read_single(f)
                circle_size = read_single(f)
                hp_drain = read_single(f)
                overall_difficulty = read_single(f)
                
            slider_velocity = read_double(f)
            
            # 读取星级信息（如果版本较新）
            star_rating_osu = []
            star_rating_taiko = []
            star_rating_catch = []
            star_rating_mania = []
            
            if version >= 20140609:
                # 读取 osu 标准模式星级
                num_pairs = read_int(f)
                for _ in range(num_pairs):
                    if version >= 20250107:
                        mod, stars = read_int_float_pair(f)
                    else:
                        mod, stars = read_int_double_pair(f)
                    star_rating_osu.append(StarRating(mod_combination=mod, star_rating=stars))
                
                # 读取 taiko 模式星级
                num_pairs = read_int(f)
                for _ in range(num_pairs):
                    if version >= 20250107:
                        mod, stars = read_int_float_pair(f)
                    else:
                        mod, stars = read_int_double_pair(f)
                    star_rating_taiko.append(StarRating(mod_combination=mod, star_rating=stars))
                
                # 读取 catch 模式星级
                num_pairs = read_int(f)
                for _ in range(num_pairs):
                    if version >= 20250107:
                        mod, stars = read_int_float_pair(f)
                    else:
                        mod, stars = read_int_double_pair(f)
                    star_rating_catch.append(StarRating(mod_combination=mod, star_rating=stars))
                
                # 读取 mania 模式星级
                num_pairs = read_int(f)
                for _ in range(num_pairs):
                    if version >= 20250107:
                        mod, stars = read_int_float_pair(f)
                    else:
                        mod, stars = read_int_double_pair(f)
                    star_rating_mania.append(StarRating(mod_combination=mod, star_rating=stars))
            
            # 读取其他谱面信息
            drain_time = read_int(f)
            total_time = read_int(f)
            preview_time = read_int(f)
            
            # 读取时间点
            timing_points = []
            num_timing_points = read_int(f)
            for _ in range(num_timing_points):
                bpm, offset, is_inherited = read_timing_point(f)
                timing_points.append(TimingPoint(bpm=bpm, offset=offset, is_inherited=is_inherited))
            
            difficulty_id = read_int(f)
            beatmap_id = read_int(f)
            thread_id = read_int(f)
            
            grade_osu = Grade(read_byte(f))
            grade_taiko = Grade(read_byte(f))
            grade_catch = Grade(read_byte(f))
            grade_mania = Grade(read_byte(f))
            
            local_offset = read_short(f)
            stack_leniency = read_single(f)
            gameplay_mode = GameMode(read_byte(f))
            song_source = read_string(f)
            song_tags = read_string(f)
            online_offset = read_short(f)
            font_title = read_string(f)
            is_unplayed = read_boolean(f)
            last_played = read_datetime(f)
            is_osz2 = read_boolean(f)
            folder_name = read_string(f)
            last_checked = read_datetime(f)
            ignore_sound = read_boolean(f)
            ignore_skin = read_boolean(f)
            disable_storyboard = read_boolean(f)
            disable_video = read_boolean(f)
            visual_override = read_boolean(f)
            
            # 跳过未知字段（如果版本较旧）
            if version < 20140609:
                _ = read_short(f)
                
            _ = read_int(f)  # 最后修改时间（？）
            mania_scroll_speed = read_byte(f)
            
            # 创建谱面对象并添加到数据库
            beatmap = BeatmapInfo(
                artist=artist,
                artist_unicode=artist_unicode,
                song_title=song_title,
                song_title_unicode=song_title_unicode,
                creator=creator,
                difficulty=difficulty,
                audio_filename=audio_filename,
                md5_hash=md5_hash,
                osu_filename=osu_filename,
                ranked_status=ranked_status,
                num_hitcircles=num_hitcircles,
                num_sliders=num_sliders,
                num_spinners=num_spinners,
                last_modification_time=last_modification_time,
                approach_rate=approach_rate,
                circle_size=circle_size,
                hp_drain=hp_drain,
                overall_difficulty=overall_difficulty,
                slider_velocity=slider_velocity,
                star_rating_osu=star_rating_osu,
                star_rating_taiko=star_rating_taiko,
                star_rating_catch=star_rating_catch,
                star_rating_mania=star_rating_mania,
                drain_time=drain_time,
                total_time=total_time,
                preview_time=preview_time,
                timing_points=timing_points,
                difficulty_id=difficulty_id,
                beatmap_id=beatmap_id,
                thread_id=thread_id,
                grade_osu=grade_osu,
                grade_taiko=grade_taiko,
                grade_catch=grade_catch,
                grade_mania=grade_mania,
                local_offset=local_offset,
                stack_leniency=stack_leniency,
                gameplay_mode=gameplay_mode,
                song_source=song_source,
                song_tags=song_tags,
                online_offset=online_offset,
                font_title=font_title,
                is_unplayed=is_unplayed,
                last_played=last_played,
                is_osz2=is_osz2,
                folder_name=folder_name,
                last_checked=last_checked,
                ignore_sound=ignore_sound,
                ignore_skin=ignore_skin,
                disable_storyboard=disable_storyboard,
                disable_video=disable_video,
                visual_override=visual_override,
                mania_scroll_speed=mania_scroll_speed
            )
            
            osu_db.beatmaps.append(beatmap)

        osu_db.user_permissions = read_int(f)
        
        return osu_db

if __name__ == "__main__":
    db_path = r"D:\UserFiles\Games\OSU\stable\osu!.db"
    
    osu_db = read_osu_db(db_path)
    print(f"版本: {osu_db.version}")
    print(f"文件夹数量: {osu_db.folder_count}")
    print(f"账号解锁状态: {osu_db.account_unlocked}")
    print(f"账号解锁时间: {osu_db.unlock_date}")
    print(f"玩家名称: {osu_db.player_name}")
    print(f"谱面数量: {len(osu_db.beatmaps)}")
    print(f"用户权限: {osu_db.user_permissions}")

    osu_db.player_name = "Wanna Accuracy"

    write_osu_db(r"D:\UserFiles\Games\OSU\stable\osu!.db", osu_db)


