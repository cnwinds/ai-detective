#!/usr/bin/env python3
"""
版本号更新脚本
用法: python update_version.py [新版本号]
例如: python update_version.py 1.7.0
"""

import sys
import re
from datetime import datetime
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def update_version(new_version):
    """更新版本号"""
    
    # 验证版本号格式 (x.y.z)
    if not re.match(r'^\d+\.\d+\.\d+$', new_version):
        print(f"❌ 版本号格式错误: {new_version}")
        print("   正确格式: x.y.z (例如: 1.6.0)")
        return False
    
    try:
        # 读取当前版本文件
        with open('backend/version.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 获取当前版本号
        current_version_match = re.search(r'VERSION = "([^"]+)"', content)
        current_version = current_version_match.group(1) if current_version_match else "未知"
        
        # 生成新的构建信息
        build_date = datetime.now().strftime("%Y-%m-%d")
        build_number = datetime.now().strftime("%Y%m%d%H%M")
        
        # 更新版本号
        content = re.sub(r'VERSION = "[^"]+"', f'VERSION = "{new_version}"', content)
        
        # 更新构建日期
        content = re.sub(r'BUILD_DATE = "[^"]+"', f'BUILD_DATE = "{build_date}"', content)
        
        # 更新构建编号
        content = re.sub(r'BUILD_NUMBER = "[^"]+"', f'BUILD_NUMBER = "{build_number}"', content)
        
        # 写入文件
        with open('backend/version.py', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 版本号更新成功!")
        print(f"   {current_version} → {new_version}")
        print(f"   构建日期: {build_date}")
        print(f"   构建编号: {build_number}")
        print(f"   JS版本号: {new_version.replace('.', '')[:3]}")
        
        return True
        
    except Exception as e:
        print(f"❌ 更新版本号失败: {e}")
        return False

def show_current_version():
    """显示当前版本信息"""
    try:
        from backend.version import get_version_info
        info = get_version_info()
        
        print("📋 当前版本信息:")
        print(f"   版本号: {info['version']}")
        print(f"   构建日期: {info['build_date']}")
        print(f"   构建编号: {info['build_number']}")
        print(f"   项目名称: {info['name']}")
        
    except Exception as e:
        print(f"❌ 获取版本信息失败: {e}")

def main():
    print("🔧 侦探推理游戏 - 版本管理工具")
    print("=" * 40)
    
    if len(sys.argv) < 2:
        show_current_version()
        print("\n💡 使用方法:")
        print("   python update_version.py [新版本号]")
        print("   例如: python update_version.py 1.7.0")
        return
    
    new_version = sys.argv[1]
    
    # 显示当前版本
    show_current_version()
    print()
    
    # 确认更新
    confirm = input(f"🤔 确定要更新到版本 {new_version} 吗? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("❌ 取消更新")
        return
    
    # 执行更新
    if update_version(new_version):
        print("\n🎉 版本更新完成!")
        print("💡 提示:")
        print("   - 浏览器标题会显示新版本号")
        print("   - JavaScript文件会使用新的缓存版本")
        print("   - 重启服务器后生效")
    else:
        print("\n❌ 版本更新失败")

if __name__ == "__main__":
    main() 