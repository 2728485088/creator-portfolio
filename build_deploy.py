#!/usr/bin/env python3.11
"""
构建部署包 —— 将网站打包为单个自包含 HTML 文件
用法: python3.11 build_deploy.py
输出: deploy.html（可直接部署到任意静态托管平台）
"""
import json
from pathlib import Path

BASE = Path(__file__).parent

# 读取源文件
with open(BASE / 'index.html', 'r', encoding='utf-8') as f:
    html = f.read()
with open(BASE / 'styles.css', 'r', encoding='utf-8') as f:
    css = f.read()
with open(BASE / 'script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 读取作品数据
works_file = BASE / 'data' / 'works.json'
if works_file.exists():
    with open(works_file, 'r', encoding='utf-8') as f:
        works = json.load(f)
else:
    works = []

# 1. 内联 CSS
html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    f'<style>\n{css}\n</style>'
)

# 2. 内联作品数据
works_json = json.dumps(works, ensure_ascii=False)
html = html.replace(
    '<script src="works-data.js"></script>',
    f'<script>window.__WORKS_DATA__ = {works_json};</script>'
)

# 3. 内联 JS
html = html.replace(
    '<script src="script.js"></script>',
    f'<script>\n{js}\n</script>'
)

# 输出
output = BASE / 'deploy.html'
with open(output, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = len(html) / 1024
print(f'✅ deploy.html 已生成 ({size_kb:.1f} KB)')
print(f'   包含 {len(works)} 个作品')
print(f'   可直接部署到: Vercel / Netlify / GitHub Pages / 任意静态托管')
