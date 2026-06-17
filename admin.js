/* ============================================
   作品管理后台 - 交互脚本
   ============================================ */

(function() {
    'use strict';

    // ========== 状态 ==========
    let works = [];
    let currentWorkId = null;
    let authToken = '';
    let currentTags = [];

    // ========== DOM 引用 ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const authOverlay = $('#authOverlay');
    const authForm = $('#authForm');
    const authPassword = $('#authPassword');
    const authError = $('#authError');
    const adminApp = $('#adminApp');
    const workList = $('#workList');
    const workCount = $('#workCount');
    const editorEmpty = $('#editorEmpty');
    const editorForm = $('#editorForm');
    const btnNewWork = $('#btnNewWork');
    const btnSave = $('#btnSave');
    const btnDelete = $('#btnDelete');
    const btnVideoUpload = $('#btnVideoUpload');
    const videoTabs = $$('.video-tab');
    const videoPanelLink = $('#videoPanelLink');
    const videoPanelUpload = $('#videoPanelUpload');
    const coverUpload = $('#coverUpload');
    const coverFileInput = $('#coverFileInput');
    const coverPreview = $('#coverPreview');
    const coverPlaceholder = $('#coverPlaceholder');
    const videoFileInput = $('#videoFileInput');
    const videoUploadHint = $('#videoUploadHint');
    const tagsList = $('#tagsList');
    const tagsInput = $('#tagsInput');
    const formStatus = $('#formStatus');
    const toastContainer = $('#toastContainer');

    // ========== 认证 ==========
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = authPassword.value.trim();
        if (!password) return;

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                authToken = data.token;
                authOverlay.style.display = 'none';
                adminApp.style.display = 'block';
                loadWorks();
            } else {
                authError.textContent = data.error || '密码错误';
                authPassword.value = '';
                authPassword.focus();
            }
        } catch (err) {
            authError.textContent = '网络错误，请重试';
        }
    });

    // ========== 数据加载 ==========
    async function loadWorks() {
        try {
            const res = await fetch('/api/works');
            works = await res.json();
            renderWorkList();
            updateCount();
        } catch (err) {
            showToast('加载作品失败', 'error');
        }
    }

    function updateCount() {
        if (workCount) workCount.textContent = `${works.length} 个`;
    }

    // ========== 渲染作品列表 ==========
    function renderWorkList() {
        if (!workList) return;

        const catLabels = { media: '自媒体', corporate: '企业宣传', ai: 'AI短剧' };

        workList.innerHTML = works.map(w => `
            <div class="work-list-item ${w.id === currentWorkId ? 'active' : ''}" data-id="${w.id}">
                <div class="work-list-thumb">
                    ${w.cover ? `<img src="${w.cover}" alt="" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="work-list-info">
                    <div class="work-list-title">${escapeHtml(w.title)}</div>
                    <div class="work-list-meta">
                        <span>${catLabels[w.category] || w.category}</span>
                        <span>${(w.tags || []).slice(0, 2).join(' · ')}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // 绑定点击
        workList.querySelectorAll('.work-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                selectWork(id);
            });
        });
    }

    // ========== 选择作品 ==========
    function selectWork(id) {
        currentWorkId = id;
        const work = works.find(w => w.id === id);
        if (!work) return;

        // 更新列表高亮
        workList.querySelectorAll('.work-list-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-id') === id);
        });

        // 填充表单
        $('#editId').value = work.id;
        $('#editTitle').value = work.title;
        $('#editCategory').value = work.category;
        $('#editDesc').value = work.description;
        $('#editCover').value = work.cover || '';
        $('#editVideo').value = work.video || '';

        // 封面预览
        if (work.cover) {
            coverPreview.src = work.cover;
            coverPreview.style.display = 'block';
            coverPlaceholder.style.display = 'none';
        } else {
            coverPreview.style.display = 'none';
            coverPlaceholder.style.display = 'flex';
        }

        // 标签
        currentTags = [...(work.tags || [])];
        renderTags();

        // 视频提示
        videoUploadHint.textContent = work.video ? '已设置' : '未设置';

        // 显示编辑表单
        editorEmpty.style.display = 'none';
        editorForm.style.display = 'block';
        formStatus.textContent = '';
        formStatus.className = 'form-status';

        // 移动端：显示列表
        if (window.innerWidth <= 768) {
            $('.admin-sidebar')?.classList.remove('open');
        }
    }

    // ========== 渲染标签 ==========
    function renderTags() {
        if (!tagsList) return;
        tagsList.innerHTML = currentTags.map((tag, i) => `
            <span class="tag-item">
                ${escapeHtml(tag)}
                <button class="tag-item-remove" data-index="${i}" title="删除标签">×</button>
            </span>
        `).join('');

        tagsList.querySelectorAll('.tag-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                currentTags.splice(idx, 1);
                renderTags();
            });
        });
    }

    // 标签输入
    if (tagsInput) {
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagsInput.value.trim();
                if (val && !currentTags.includes(val)) {
                    currentTags.push(val);
                    renderTags();
                    tagsInput.value = '';
                }
            }
        });
    }

    // 点击标签区域聚焦输入框
    if ($('.tags-editor')) {
        $('.tags-editor').addEventListener('click', () => {
            tagsInput.focus();
        });
    }

    // ========== 封面上传 ==========
    if (coverUpload && coverFileInput) {
        coverUpload.addEventListener('click', () => coverFileInput.click());

        coverFileInput.addEventListener('change', async () => {
            const file = coverFileInput.files[0];
            if (!file) return;

            // 本地预览
            const reader = new FileReader();
            reader.onload = (e) => {
                coverPreview.src = e.target.result;
                coverPreview.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);

            // 上传
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'cover');

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'X-Admin-Password': authToken },
                    body: formData
                });
                const data = await res.json();
                if (res.ok && data.path) {
                    $('#editCover').value = data.path;
                    showToast('封面上传成功', 'success');
                } else {
                    showToast(data.error || '上传失败', 'error');
                }
            } catch (err) {
                showToast('上传失败，请重试', 'error');
            }
        });
    }

    // ========== 视频上传 ==========
    if (btnVideoUpload && videoFileInput) {
        btnVideoUpload.addEventListener('click', () => videoFileInput.click());

        videoFileInput.addEventListener('change', async () => {
            const file = videoFileInput.files[0];
            if (!file) return;

            videoUploadHint.textContent = `上传中: ${file.name}...`;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'video');

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'X-Admin-Password': authToken },
                    body: formData
                });
                const data = await res.json();
                if (res.ok && data.path) {
                    $('#editVideo').value = data.path;
                    videoUploadHint.textContent = `✅ ${file.name}`;
                    showToast('视频上传成功', 'success');
                } else {
                    videoUploadHint.textContent = `❌ ${data.error || '上传失败'}`;
                    showToast(data.error || '上传失败', 'error');
                }
            } catch (err) {
                videoUploadHint.textContent = '上传失败，请重试';
                showToast('上传失败，请重试', 'error');
            }
        });
    }

    // ========== 新增作品 ==========
    btnNewWork.addEventListener('click', () => {
        currentWorkId = null;
        $('#editId').value = '';
        $('#editTitle').value = '';
        $('#editCategory').value = 'media';
        $('#editDesc').value = '';
        $('#editCover').value = '';
        $('#editVideo').value = '';
        coverPreview.style.display = 'none';
        coverPlaceholder.style.display = 'flex';
        currentTags = [];
        renderTags();
        videoUploadHint.textContent = '未选择文件';
        editorEmpty.style.display = 'none';
        editorForm.style.display = 'block';
        formStatus.textContent = '';
        formStatus.className = 'form-status';

        workList.querySelectorAll('.work-list-item').forEach(el => el.classList.remove('active'));
    });

    // ========== 保存 ==========
    btnSave.addEventListener('click', async () => {
        const title = $('#editTitle').value.trim();
        if (!title) {
            formStatus.textContent = '请输入作品标题';
            formStatus.className = 'form-status error';
            return;
        }

        const data = {
            title,
            category: $('#editCategory').value,
            description: $('#editDesc').value.trim(),
            tags: currentTags,
            cover: $('#editCover').value.trim(),
            video: $('#editVideo').value.trim()
        };

        formStatus.textContent = '保存中...';
        formStatus.className = 'form-status loading';
        btnSave.disabled = true;

        try {
            let res;
            if (currentWorkId) {
                // 更新
                res = await fetch(`/api/works/${currentWorkId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': authToken
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // 新增
                res = await fetch('/api/works', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': authToken
                    },
                    body: JSON.stringify(data)
                });
            }

            const result = await res.json();

            if (res.ok) {
                if (!currentWorkId) {
                    currentWorkId = result.id;
                    $('#editId').value = result.id;
                }
                formStatus.textContent = '✅ 已保存';
                formStatus.className = 'form-status success';
                showToast('保存成功', 'success');
                loadWorks();

                setTimeout(() => {
                    formStatus.textContent = '';
                    formStatus.className = 'form-status';
                }, 2000);
            } else {
                formStatus.textContent = result.error || '保存失败';
                formStatus.className = 'form-status error';
            }
        } catch (err) {
            formStatus.textContent = '网络错误，请重试';
            formStatus.className = 'form-status error';
        }

        btnSave.disabled = false;
    });

    // ========== 删除 ==========
    btnDelete.addEventListener('click', () => {
        if (!currentWorkId) return;

        const work = works.find(w => w.id === currentWorkId);
        if (!work) return;

        showConfirm(
            `确定删除「${work.title}」吗？`,
            '删除后无法恢复。封面和视频文件不会被删除，需手动清理。',
            async () => {
                try {
                    const res = await fetch(`/api/works/${currentWorkId}`, {
                        method: 'DELETE',
                        headers: { 'X-Admin-Password': authToken }
                    });
                    if (res.ok) {
                        showToast('已删除', 'success');
                        currentWorkId = null;
                        editorForm.style.display = 'none';
                        editorEmpty.style.display = 'flex';
                        loadWorks();
                    } else {
                        const data = await res.json();
                        showToast(data.error || '删除失败', 'error');
                    }
                } catch (err) {
                    showToast('网络错误', 'error');
                }
            }
        );
    });

    // ========== 同步到 GitHub ==========
    const btnSync = $('#btnSync');
    const syncStatus = $('#syncStatus');

    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            btnSync.disabled = true;
            btnSync.textContent = '⏳ 同步中...';
            syncStatus.textContent = '';
            syncStatus.className = '';

            try {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': authToken
                    }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    btnSync.textContent = '✅ 已同步';
                    syncStatus.textContent = data.message || '同步成功';
                    syncStatus.style.color = '#4a8';
                    showToast('已同步到 GitHub Pages', 'success');
                } else {
                    btnSync.textContent = '🚀 同步到 GitHub Pages';
                    syncStatus.textContent = '❌ ' + (data.error || '同步失败');
                    syncStatus.style.color = '#c44';
                    showToast(data.error || '同步失败', 'error');
                }
            } catch (err) {
                btnSync.textContent = '🚀 同步到 GitHub Pages';
                syncStatus.textContent = '❌ 网络错误，请重试';
                syncStatus.style.color = '#c44';
                showToast('网络错误', 'error');
            }

            btnSync.disabled = false;
            setTimeout(() => {
                if (btnSync.textContent === '✅ 已同步') {
                    btnSync.textContent = '🚀 同步到 GitHub Pages';
                }
            }, 5000);
        });
    }

    // ========== 确认弹窗 ==========
    function showConfirm(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(message)}</p>
                <div class="confirm-actions">
                    <button class="btn btn-outline" id="confirmCancel">取消</button>
                    <button class="btn btn-danger" id="confirmOk">确认删除</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#confirmCancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#confirmOk').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ========== Toast ==========
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ========== 工具函数 ==========
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== 键盘快捷键 ==========
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + S 保存
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (editorForm.style.display !== 'none') {
                btnSave.click();
            }
        }
    });

    // ========== 视频标签切换 ==========
    if (videoTabs.length > 0) {
        videoTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                videoTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                if (target === 'link') {
                    videoPanelLink.style.display = 'block';
                    videoPanelUpload.style.display = 'none';
                } else {
                    videoPanelLink.style.display = 'none';
                    videoPanelUpload.style.display = 'block';
                }
            });
        });
    }

    // ========== 初始化 ==========
    // 聚焦密码输入框
    if (authPassword) authPassword.focus();

})();
