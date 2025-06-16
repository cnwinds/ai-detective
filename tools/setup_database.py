#!/usr/bin/env python3
"""
数据库初始化脚本
用于设置AI侦探推理游戏的MySQL数据库
"""

import sys
import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 切换到项目根目录并加载环境变量
os.chdir(project_root)
load_dotenv()

def create_database():
    """创建数据库"""
    try:
        # 连接到MySQL服务器（不指定数据库）
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '3306')),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'password')
        )
        
        cursor = connection.cursor()
        
        # 创建数据库
        db_name = os.getenv('DB_NAME', 'ai_detective')
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"✅ 数据库 '{db_name}' 创建成功或已存在")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Error as e:
        print(f"❌ 创建数据库失败: {e}")
        return False

def create_tables():
    """创建数据表"""
    try:
        # 导入数据库模块
        from backend.database import init_database
        
        success = init_database()
        if success:
            print("✅ 数据表创建成功")
            return True
        else:
            print("❌ 数据表创建失败")
            return False
            
    except Exception as e:
        print(f"❌ 创建数据表失败: {e}")
        return False

def test_connection():
    """测试数据库连接"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '3306')),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'ai_detective')
        )
        
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        print("✅ 数据库连接测试成功")
        return True
        
    except Error as e:
        print(f"❌ 数据库连接测试失败: {e}")
        return False

def show_config():
    """显示数据库配置"""
    print("📋 当前数据库配置:")
    print(f"   主机: {os.getenv('DB_HOST', 'localhost')}")
    print(f"   端口: {os.getenv('DB_PORT', '3306')}")
    print(f"   用户: {os.getenv('DB_USER', 'root')}")
    print(f"   密码: {'已设置' if os.getenv('DB_PASSWORD') else '未设置'}")
    print(f"   数据库: {os.getenv('DB_NAME', 'ai_detective')}")
    print()

def main():
    """主函数"""
    print("🔧 AI侦探推理游戏 - 数据库初始化工具")
    print("=" * 50)
    
    # 显示配置
    show_config()
    
    # 检查环境变量
    if not os.getenv('DB_PASSWORD'):
        print("⚠️  警告: 未设置DB_PASSWORD环境变量")
        print("请在.env文件中设置您的MySQL密码")
        response = input("是否继续使用默认密码 'password'? (y/N): ")
        if response.lower() != 'y':
            print("请设置正确的数据库密码后重新运行")
            return
    
    print("开始初始化数据库...")
    print()
    
    # 步骤1: 创建数据库
    print("📋 步骤1: 创建数据库")
    if not create_database():
        print("❌ 数据库创建失败，请检查MySQL连接和权限")
        return
    
    # 步骤2: 创建数据表
    print("\n📋 步骤2: 创建数据表")
    if not create_tables():
        print("❌ 数据表创建失败")
        return
    
    # 步骤3: 测试连接
    print("\n📋 步骤3: 测试数据库连接")
    if not test_connection():
        print("❌ 数据库连接测试失败")
        return
    
    print("\n🎉 数据库初始化完成！")
    print("\n数据库已包含以下表:")
    print("   - game_sessions: 游戏会话表")
    print("   - conversations: 对话记录表")
    print("   - game_evaluations: 游戏评价表")
    print("\n现在可以启动游戏服务器了！")
    print("运行命令: python start_game.py")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n操作被用户取消")
    except Exception as e:
        print(f"\n❌ 初始化过程中发生错误: {e}")
        print("请检查您的配置和MySQL服务是否正常运行") 