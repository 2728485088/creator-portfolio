"""
个人作品展示网站 - 后端服务器
Flask + JSON 文件存储 + 文件上传
"""
import json
import os
import uuid
import subprocess
import shutil
from datetime import datetime, timezone
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, session
from functools import wraps

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'creator-secret-key-' + str(uuid.uuid4()))

# 配置
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / 'data' / 'works.json'
WORKS_JS_FILE = BASE_DIR / 'works-data.js'
COVERS_DIR = BASE_DIR / 'assets' / 'covers'
VIDEOS_DIR = BASE_DIR / 'assets' / 'videos'
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'creator2024')

# 确保目录存在
COVERS_DIR.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
ALLOWED_VIDEO_EXT = {'.mp4', '.webm', '.mov', '.mkv'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def load_works():
    """加载作品数据"""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_works(works):
    """保存作品数据，同时生成静态 JS 数据文件供 GitHub Pages 使用"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(works, f, ensure_ascii=False, indent=2)

    # 生成 works-data.js —— 纯静态站点可直接引用
    works_json = json.dumps(works, ensure_ascii=False)
    js_content = f'// 自动生成，请勿手动编辑\n// 由管理后台每次保存时更新\nwindow.__WORKS_DATA__ = {works_json};\n'
    with open(WORKS_JS_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)


def auth_required(f):
    """管理后台认证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('X-Admin-Password', '')
        if auth_header == ADMIN_PASSWORD:
            return f(*args, **kwargs)
        return jsonify({'error': '需要管理员密码'}), 401
    return decorated


# ==================== 静态文件 ====================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/admin')
@app.route('/admin.html')
def admin():
    return send_from_directory('.', 'admin.html')


# ==================== API: 作品 CRUD ====================

@app.route('/api/works', methods=['GET'])
def api_get_works():
    """获取全部作品"""
    works = load_works()
    return jsonify(works)


@app.route('/api/works/<work_id>', methods=['GET'])
def api_get_work(work_id):
    """获取单个作品"""
    works = load_works()
    for w in works:
        if w['id'] == work_id:
            return jsonify(w)
    return jsonify({'error': '作品不存在'}), 404


@app.route('/api/works', methods=['POST'])
@auth_required
def api_create_work():
    """新增作品"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400

    work = {
        'id': 'w' + uuid.uuid4().hex[:8],
        'category': data.get('category', 'media'),
        'title': data.get('title', '未命名作品'),
        'description': data.get('description', ''),
        'tags': data.get('tags', []),
        'cover': data.get('cover', ''),
        'video': data.get('video', ''),
        'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    }

    works = load_works()
    works.append(work)
    save_works(works)
    return jsonify(work), 201


@app.route('/api/works/<work_id>', methods=['PUT'])
@auth_required
def api_update_work(work_id):
    """更新作品"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '无效的请求数据'}), 400

    works = load_works()
    for w in works:
        if w['id'] == work_id:
            # 只更新提供的字段
            for field in ['category', 'title', 'description', 'tags', 'cover', 'video']:
                if field in data:
                    w[field] = data[field]
            save_works(works)
            return jsonify(w)
    return jsonify({'error': '作品不存在'}), 404


@app.route('/api/works/<work_id>', methods=['DELETE'])
@auth_required
def api_delete_work(work_id):
    """删除作品"""
    works = load_works()
    new_works = [w for w in works if w['id'] != work_id]
    if len(new_works) == len(works):
        return jsonify({'error': '作品不存在'}), 404
    save_works(new_works)
    return jsonify({'success': True})


# ==================== API: 文件上传 ====================

@app.route('/api/upload', methods=['POST'])
@auth_required
def api_upload():
    """上传文件（封面或视频）"""
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400

    file = request.files['file']
    file_type = request.form.get('type', 'cover')  # cover 或 video

    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    # 检查扩展名
    ext = Path(file.filename).suffix.lower()

    if file_type == 'cover':
        if ext not in ALLOWED_IMAGE_EXT:
            return jsonify({'error': f'不支持的图片格式: {ext}，支持: {", ".join(ALLOWED_IMAGE_EXT)}'}), 400
        target_dir = COVERS_DIR
    else:
        if ext not in ALLOWED_VIDEO_EXT:
            return jsonify({'error': f'不支持的视频格式: {ext}，支持: {", ".join(ALLOWED_VIDEO_EXT)}'}), 400
        target_dir = VIDEOS_DIR

    # 生成唯一文件名
    safe_name = f"{file_type}-{uuid.uuid4().hex[:8]}{ext}"
    file_path = target_dir / safe_name

    # 保存文件
    file.save(str(file_path))

    # 返回相对路径
    rel_path = f"assets/{file_type}s/{safe_name}"

    return jsonify({
        'success': True,
        'path': rel_path,
        'filename': safe_name,
        'size': file_path.stat().st_size
    })


# ==================== API: 同步到 GitHub ====================

GITHUB_REMOTE = os.environ.get('GITHUB_REMOTE', '')


@app.route('/api/sync', methods=['POST'])
@auth_required
def api_sync_to_github():
    """将当前数据同步到 GitHub Pages"""
    # 1. 先生成最新的 deploy.html 和 works-data.js
    try:
        result = subprocess.run(
            ['python3.11', 'build_deploy.py'],
            cwd=str(BASE_DIR),
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return jsonify({'error': f'构建失败: {result.stderr}'}), 500
    except Exception as e:
        return jsonify({'error': f'构建异常: {str(e)}'}), 500

    # 2. Git add + commit + push
    try:
        git_cmds = [
            ['git', 'add', '-A'],
            ['git', 'commit', '-m', '🔄 管理后台更新作品数据'],
            ['git', 'push', 'origin', 'main'],
        ]
        for cmd in git_cmds:
            r = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True, timeout=30)
            # commit 可能返回 "nothing to commit" 不是错误
            if r.returncode != 0 and 'nothing to commit' not in r.stdout + r.stderr:
                return jsonify({'error': f'Git 失败 ({cmd[0]}): {r.stderr}'}), 500

        return jsonify({
            'success': True,
            'message': '已同步到 GitHub，Pages 将在 1-2 分钟内自动更新',
            'pagesUrl': 'https://2728485088.github.io/creator-portfolio/'
        })
    except Exception as e:
        return jsonify({'error': f'推送异常: {str(e)}'}), 500


# ==================== API: 认证 ====================

@app.route('/api/auth', methods=['POST'])
def api_auth():
    """验证管理员密码"""
    data = request.get_json()
    if not data or data.get('password', '') != ADMIN_PASSWORD:
        return jsonify({'error': '密码错误'}), 401
    return jsonify({'success': True, 'token': ADMIN_PASSWORD})


# ==================== 启动 ====================

if __name__ == '__main__':
    print(f"🖥  服务器启动中...")
    print(f"   前台页面: http://localhost:8000")
    print(f"   管理后台: http://localhost:8000/admin")
    print(f"   管理密码: {ADMIN_PASSWORD}")
    app.run(host='0.0.0.0', port=8000, debug=False)
