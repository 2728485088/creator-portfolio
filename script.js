/* ============================================
   个人作品展示网站 - 交互脚本
   功能：导航、筛选、视频弹窗播放、表单
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ========== 导航栏滚动效果 ==========
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-link');

    function updateNav() {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // ========== 移动端菜单 ==========
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    navLinkItems.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    });

    // ========== 平滑滚动 ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = nav.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    // ========== 从 API 加载作品数据 ==========
    const worksGrid = document.getElementById('worksGrid');
    const worksLoading = document.getElementById('worksLoading');
    let allWorks = [];
    let currentFilter = 'all';

    async function loadWorks() {
        // 先在客户端就绪时使用静态数据渲染（零等待）
        if (window.__WORKS_DATA__ && window.__WORKS_DATA__.length > 0) {
            allWorks = window.__WORKS_DATA__;
            renderWorks(currentFilter);
        }

        // 后台尝试从 API 获取最新数据（仅本地开发环境有效）
        try {
            const res = await fetch('/api/works');
            if (res.ok) {
                const apiData = await res.json();
                allWorks = apiData;
                renderWorks(currentFilter);
            }
        } catch (err) {
            // API 不可用，静态数据已经渲染过了
        }
    }

    function renderWorks(filter) {
        if (!worksGrid) return;

        const catLabels = { media: '自媒体', corporate: '企业宣传', photo: '摄影', video: '摄像', ai: 'AI 作品' };

        // 筛选
        const filtered = filter === 'all'
            ? allWorks
            : allWorks.filter(w => w.category === filter);

        if (filtered.length === 0) {
            worksGrid.innerHTML = '<div class="works-loading"><p>暂无作品</p></div>';
            return;
        }

        worksGrid.innerHTML = filtered.map(w => {
            const tagsHtml = (w.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
            const videos = w.videos && w.videos.length > 0 ? w.videos : (w.video ? [w.video] : []);
            const hasVideo = videos.length > 0;
            const vCount = videos.length;
            const isPhoto = w.category === 'photo';

            // 摄影作品：纯照片展示，无播放按钮
            if (isPhoto) {
                return `
                    <div class="work-card work-card-photo reveal" data-category="${w.category || ''}"
                         data-cover="${escapeHtml(w.cover || '')}">
                        <div class="work-card-media" style="cursor:zoom-in">
                            <img class="work-card-cover" src="${escapeHtml(w.cover || '')}" alt="${escapeHtml(w.title)}" loading="lazy"
                                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                                 ${w.cover ? '' : 'style="display:none"'}>
                            <div class="work-card-placeholder" style="display:${w.cover ? 'none' : 'flex'}">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                                    <rect x="6" y="10" width="36" height="28" rx="3"/>
                                    <circle cx="18" cy="22" r="4"/>
                                    <path d="M6 30l10-10 8 8 6-6 10 10"/>
                                </svg>
                                <span>暂无照片</span>
                            </div>
                        </div>
                        <div class="work-card-info">
                            <span class="work-card-category">${catLabels[w.category] || w.category}</span>
                            <h3 class="work-card-title">${escapeHtml(w.title)}</h3>
                            <p class="work-card-desc">${escapeHtml(w.description || '')}</p>
                            <div class="work-card-tags">${tagsHtml}</div>
                        </div>
                    </div>
                `;
            }

            // 其他类型：视频展示
            return `
                <div class="work-card reveal" data-category="${w.category || ''}"
                     data-cover="${escapeHtml(w.cover || '')}"
                     data-videos='${escapeHtml(JSON.stringify(videos))}'>
                    <div class="work-card-media">
                        <img class="work-card-cover" src="${escapeHtml(w.cover || '')}" alt="${escapeHtml(w.title)}" loading="lazy"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                             ${w.cover ? '' : 'style="display:none"'}>
                        <div class="work-card-placeholder" style="display:${w.cover ? 'none' : 'flex'}">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                                <polygon points="16,10 38,24 16,38"/>
                            </svg>
                            <span>暂无封面</span>
                        </div>
                        ${hasVideo ? `
                        <div class="work-card-overlay">
                            <span class="work-card-play">▶ ${vCount > 1 ? '播放列表 (' + vCount + '集)' : '播放视频'}</span>
                        </div>` : ''}
                    </div>
                    <div class="work-card-info">
                        <span class="work-card-category">${catLabels[w.category] || w.category}</span>
                        <h3 class="work-card-title">${escapeHtml(w.title)}</h3>
                        <p class="work-card-desc">${escapeHtml(w.description || '')}</p>
                        <div class="work-card-tags">${tagsHtml}</div>
                    </div>
                </div>
            `;
        }).join('');

        // 触发滚动动画
        setTimeout(checkReveal, 100);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // 初始加载
    loadWorks();

    // ========== 视频播放模态窗口（支持多视频列表） ==========
    const videoModal = document.getElementById('videoModal');
    const videoModalWrapper = document.getElementById('videoModalWrapper');
    const videoModalClose = document.getElementById('videoModalClose');
    let videoList = [];
    let currentVideoIndex = 0;

    function openVideo(videos) {
        if (!videoModal || !videoModalWrapper) return;
        if (!videos || videos.length === 0) return;

        videoList = videos;
        currentVideoIndex = 0;
        renderVideoPlayer();
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function renderVideoPlayer() {
        if (!videoModalWrapper) return;
        const src = videoList[currentVideoIndex];
        if (!src) return;

        videoModalWrapper.innerHTML = '';

        // 创建播放器容器
        const playerContainer = document.createElement('div');
        playerContainer.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';

        // 播放器区域
        const playerArea = document.createElement('div');
        playerArea.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;background:#000;position:relative;';

        // 判断视频来源并嵌入
        const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/.test(src);
        const isBilibili = /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/.test(src);
        const isURL = /^https?:\/\//.test(src);

        if (isYouTube) {
            const videoId = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)?.[1] || '';
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'width:100%;height:100%;border:none;';
            playerArea.appendChild(iframe);
        } else if (isBilibili) {
            const bvid = src.match(/BV[a-zA-Z0-9]+/)?.[0] || '';
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&high_quality=1`;
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'width:100%;height:100%;border:none;';
            playerArea.appendChild(iframe);
        } else if (isURL) {
            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'width:100%;height:100%;border:none;';
            playerArea.appendChild(iframe);
        } else {
            const video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.style.cssText = 'width:100%;height:100%;outline:none;';
            video.addEventListener('error', () => {
                playerArea.innerHTML = '<span class="video-modal-loading">视频加载失败，请检查文件路径</span>';
            });
            playerArea.appendChild(video);
        }

        playerContainer.appendChild(playerArea);

        // 如果有多个视频，添加底部导航
        if (videoList.length > 1) {
            const navBar = document.createElement('div');
            navBar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,0.85);flex-shrink:0;';

            // 上一集按钮
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '‹';
            prevBtn.style.cssText = `padding:6px 14px;border:1px solid rgba(255,255,255,0.25);border-radius:6px;background:transparent;color:#fff;font-size:18px;cursor:pointer;${currentVideoIndex === 0 ? 'opacity:0.3;cursor:default;' : ''}`;
            prevBtn.disabled = currentVideoIndex === 0;
            prevBtn.addEventListener('click', () => {
                if (currentVideoIndex > 0) { currentVideoIndex--; renderVideoPlayer(); }
            });

            // 下一集按钮
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '›';
            nextBtn.style.cssText = `padding:6px 14px;border:1px solid rgba(255,255,255,0.25);border-radius:6px;background:transparent;color:#fff;font-size:18px;cursor:pointer;${currentVideoIndex >= videoList.length - 1 ? 'opacity:0.3;cursor:default;' : ''}`;
            nextBtn.disabled = currentVideoIndex >= videoList.length - 1;
            nextBtn.addEventListener('click', () => {
                if (currentVideoIndex < videoList.length - 1) { currentVideoIndex++; renderVideoPlayer(); }
            });

            // 进度指示
            const indicator = document.createElement('span');
            indicator.textContent = `${currentVideoIndex + 1} / ${videoList.length}`;
            indicator.style.cssText = 'flex:1;text-align:center;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;font-family:monospace;';

            // 剧集列表按钮
            const listBtn = document.createElement('button');
            listBtn.innerHTML = '☰ 列表';
            listBtn.style.cssText = 'padding:6px 14px;border:1px solid rgba(255,255,255,0.25);border-radius:6px;background:transparent;color:#fff;font-size:12px;cursor:pointer;';
            listBtn.addEventListener('click', () => {
                // 展开剧集列表选择器
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;';
                const panel = document.createElement('div');
                panel.style.cssText = 'background:rgba(20,20,25,0.95);border-radius:12px;padding:20px;max-width:400px;width:90vw;max-height:60vh;overflow-y:auto;';
                panel.innerHTML = `<div style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">共 ${videoList.length} 集</div>
                    ${videoList.map((v, i) => `<div style="padding:10px 14px;margin:2px 0;border-radius:6px;cursor:pointer;background:${i === currentVideoIndex ? 'rgba(255,255,255,0.15)' : 'transparent'};color:${i === currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.7)'};font-size:13px;" data-i="${i}">第 ${i + 1} 集</div>`).join('')}
                    <div style="text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);">
                        <button style="padding:6px 20px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:transparent;color:rgba(255,255,255,0.6);font-size:13px;cursor:pointer;">关闭</button>
                    </div>`;
                overlay.appendChild(panel);
                document.body.appendChild(overlay);

                panel.querySelectorAll('[data-i]').forEach(el => {
                    el.addEventListener('click', () => {
                        const i = parseInt(el.getAttribute('data-i'));
                        currentVideoIndex = i;
                        renderVideoPlayer();
                        overlay.remove();
                    });
                });
                overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
                panel.querySelector('button')?.addEventListener('click', () => overlay.remove());
            });

            navBar.appendChild(prevBtn);
            navBar.appendChild(indicator);
            navBar.appendChild(listBtn);
            navBar.appendChild(nextBtn);
            playerContainer.appendChild(navBar);
        }

        videoModalWrapper.appendChild(playerContainer);
    }

    function closeVideo() {
        if (!videoModal || !videoModalWrapper) return;
        videoModal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            videoModalWrapper.innerHTML = '';
            videoList = [];
        }, 400);
    }

    // 点击作品卡片 → 播放视频 / 摄影作品放大查看
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.work-card');
        if (!card) return;
        const media = card.querySelector('.work-card-media');
        if (!media || !media.contains(e.target)) return;

        // 摄影作品 → 放大查看
        if (card.classList.contains('work-card-photo')) {
            const cover = card.getAttribute('data-cover');
            if (cover) openPhotoViewer(cover, card.querySelector('.work-card-title')?.textContent || '');
            return;
        }

        // 其他作品 → 播放视频
        const videosAttr = card.getAttribute('data-videos');
        if (videosAttr) {
            try {
                const videos = JSON.parse(videosAttr);
                if (videos && videos.length > 0) {
                    openVideo(videos);
                }
            } catch (err) { /* ignore */ }
        }
    });

    // ========== 摄影作品放大查看 ==========
    function openPhotoViewer(src, title) {
        let viewer = document.getElementById('photoViewer');
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'photoViewer';
            viewer.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;cursor:zoom-out;';
            viewer.innerHTML = `
                <img style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);" />
                <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;color:rgba(255,255,255,0.7);font-size:14px;letter-spacing:1px;"></div>
                <button style="position:absolute;top:16px;right:20px;background:none;border:none;color:rgba(255,255,255,0.6);font-size:28px;cursor:pointer;">&times;</button>
            `;
            document.body.appendChild(viewer);
            viewer.addEventListener('click', (e) => {
                if (e.target === viewer || e.target.tagName === 'BUTTON') {
                    viewer.style.opacity = '0';
                    document.body.style.overflow = '';
                    setTimeout(() => viewer.style.display = 'none', 300);
                }
            });
        }
        const img = viewer.querySelector('img');
        const label = viewer.querySelector('div');
        img.src = src;
        label.textContent = title;
        viewer.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => viewer.style.opacity = '1');
    }

    // 关闭按钮
    if (videoModalClose) {
        videoModalClose.addEventListener('click', closeVideo);
    }

    // 点击遮罩关闭
    if (videoModal) {
        videoModal.querySelector('.video-modal-backdrop')?.addEventListener('click', closeVideo);
    }

    // ESC 关闭视频
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (videoModal && videoModal.classList.contains('active')) {
                closeVideo();
            }
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    });

    // ========== 作品分类筛选 ==========
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-filter');
            renderWorks(currentFilter);
        });
    });

    // ========== 加载更多（重新加载最新数据） ==========
    const loadMoreBtn = document.getElementById('loadMore');

    if (loadMoreBtn && worksGrid) {
        loadMoreBtn.addEventListener('click', async () => {
            loadMoreBtn.textContent = '加载中...';
            loadMoreBtn.disabled = true;
            await loadWorks();
            loadMoreBtn.textContent = '刷新作品';
            loadMoreBtn.disabled = false;
            setTimeout(() => {
                loadMoreBtn.textContent = '加载更多作品';
            }, 2000);
        });
    }

    // ========== 联系表单 ==========
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('请填写必填字段（姓名、邮箱、项目描述）');
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.textContent = '发送中...';
            submitBtn.disabled = true;

            setTimeout(() => {
                contactForm.reset();
                contactForm.style.opacity = '0';
                contactForm.style.pointerEvents = 'none';
                formSuccess.classList.add('visible');

                setTimeout(() => {
                    contactForm.style.opacity = '1';
                    contactForm.style.pointerEvents = 'auto';
                    formSuccess.classList.remove('visible');
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                }, 3000);
            }, 1000);
        });
    }

    // ========== 滚动渐入动画 ==========
    const animatableSelectors = ['.work-card', '.about-card', '.service-item', '.contact-item'];
    animatableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.classList.contains('reveal')) el.classList.add('reveal');
        });
    });

    function checkReveal() {
        const windowHeight = window.innerHeight;
        document.querySelectorAll('.reveal').forEach(el => {
            if (el.getBoundingClientRect().top < windowHeight - 120) {
                el.classList.add('visible');
            }
        });
    }

    window.addEventListener('scroll', checkReveal, { passive: true });
    window.addEventListener('resize', checkReveal, { passive: true });
    setTimeout(checkReveal, 100);
});
