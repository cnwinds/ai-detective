"""
侦探推理游戏版本信息
"""

# 应用程序版本
VERSION = "1.8.0"

# 构建信息
BUILD_DATE = "2025-06-20"
BUILD_NUMBER = "202506201815"

# 版本信息字典
VERSION_INFO = {
    "version": VERSION,
    "build_date": BUILD_DATE,
    "build_number": BUILD_NUMBER,
    "name": "侦探推理游戏",
    "description": "基于AI的互动式推理游戏"
}

def get_version():
    """获取版本号"""
    return VERSION

def get_version_info():
    """获取完整版本信息"""
    return VERSION_INFO

def get_js_version():
    """获取JavaScript文件版本号（用于缓存控制）"""
    # 使用版本号的主要部分作为JS版本
    return VERSION.replace(".", "")[:3]  # 例如 "1.5.0" -> "150" 