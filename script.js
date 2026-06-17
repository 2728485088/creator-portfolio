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

    // ========== 从 API 加载作品数据（API 不可用时 fallback 到静态数据） ==========
    const worksGrid = document.getElementById('worksGrid');
    const worksLoading = document.getElementById('worksLoading');
    let allWorks = [];
    let currentFilter = 'all';

    async function loadWorks() {
        try {
            const res = await fetch('/api/works');
            if (res.ok) {
                allWorks = await res.json();
            } else {
                throw new Error('API error');
            }
        } catch (err) {
            // API 不可用 → fallback 到 works-data.js 提供的静态数据
            if (window.__WORKS_DATA__ && window.__WORKS_DATA__.length > 0) {
                allWorks = window.__WORKS_DATA__;
            } else {
                allWorks = [];
            }
        }
        renderWorks(currentFilter);
    }

    function renderWorks(filter) {
        if (!worksGrid) return;

        const catLabels = { media: '自媒体', corporate: '企业宣传', ai: 'AI 短剧' };

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
            const hasVideo = w.video && w.video.trim() !== '';

            return `
                <div class="work-card reveal" data-category="${w.category || ''}"
                     data-cover="${escapeHtml(w.cover || '')}"
                     data-video="${escapeHtml(w.video || '')}">
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
                            <span class="work-card-play">▶ 播放视频</span>
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

    // ========== 视频播放模态窗口 ==========
    const videoModal = document.getElementById('videoModal');
    const videoModalWrapper = document.getElementById('videoModalWrapper');
    const videoModalClose = document.getElementById('videoModalClose');

    // 打开视频
    function openVideo(videoSrc) {
        if (!videoModal || !videoModalWrapper) return;

        // 清除旧内容
        videoModalWrapper.innerHTML = '';

        // 判断是外链（YouTube / B站 / 其他URL）还是本地视频
        const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/.test(videoSrc);
        const isBilibili = /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/.test(videoSrc);
        const isURL = /^https?:\/\//.test(videoSrc);

        if (isYouTube) {
            // YouTube 嵌入
            let videoId = '';
            const ytMatch = videoSrc.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
            if (ytMatch) videoId = ytMatch[1];
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.allowFullscreen = true;
            videoModalWrapper.appendChild(iframe);
        } else if (isBilibili) {
            // B站嵌入
            const bvMatch = videoSrc.match(/BV[a-zA-Z0-9]+/);
            const bvid = bvMatch ? bvMatch[0] : '';
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&high_quality=1`;
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
            videoModalWrapper.appendChild(iframe);
        } else if (isURL) {
            // 其他外链 → 直接用 iframe 嵌入
            const iframe = document.createElement('iframe');
            iframe.src = videoSrc;
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
            videoModalWrapper.appendChild(iframe);
        } else {
            // 本地视频文件
            const video = document.createElement('video');
            video.src = videoSrc;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.outline = 'none';

            // 错误处理
            video.addEventListener('error', () => {
                videoModalWrapper.innerHTML = '<span class="video-modal-loading">视频加载失败，请检查文件路径</span>';
            });

            videoModalWrapper.appendChild(video);
        }

        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // 关闭视频
    function closeVideo() {
        if (!videoModal || !videoModalWrapper) return;
        videoModal.classList.remove('active');
        document.body.style.overflow = '';

        // 延迟清除内容（等过渡动画结束）
        setTimeout(() => {
            videoModalWrapper.innerHTML = '';
        }, 400);
    }

    // 点击作品卡片 → 播放视频
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.work-card');
        if (!card) return;

        // 检查是否点击在媒体区域（封面或占位符）
        const media = card.querySelector('.work-card-media');
        if (!media || !media.contains(e.target)) return;

        const videoSrc = card.getAttribute('data-video');
        if (videoSrc) {
            openVideo(videoSrc);
        }
    });

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
