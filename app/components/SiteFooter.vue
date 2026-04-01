<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="footer-shell">
      <section class="footer-top">
        <div class="footer-brand">
          <h3 class="brand-title">UEGEE</h3>
          <p class="brand-motto">曾几何时 稚嫩的小手也拥有了追越我们的坚强</p>
          <p class="brand-copy">© 2018-{{ currentYear }}</p>
          <p class="brand-powered">Powered by <a href="#">NeHex</a>,Theme By NeHex</p>
          <p class="brand-status">
            <span class="status-dot" />
            正在长期主义编写中
          </p>
        </div>

        <nav class="footer-col" aria-label="关于">
          <h4>关于</h4>
          <NuxtLink to="/about">关于本站</NuxtLink>
          <NuxtLink to="/friends">关于我</NuxtLink>
          <a href="#">关于项目 ↗</a>
        </nav>

        <nav class="footer-col" aria-label="更多">
          <h4>更多</h4>
          <NuxtLink to="/album">照片墙</NuxtLink>
          <NuxtLink to="/archive">归档</NuxtLink>
          <NuxtLink to="/article">博客 ↗</NuxtLink>
        </nav>

        <nav class="footer-col" aria-label="联系">
          <h4>联系</h4>
          <a href="#">写留言</a>
          <a href="#">发邮件 ↗</a>
          <a href="https://github.com/nehex" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
        </nav>
      </section>

      <section class="footer-bottom">
        <div class="bottom-left">
          <a href="#">RSS 订阅</a>
          <span>·</span>
          <a href="#">站点地图订阅</a>
          <span>·</span>
          <a href="#">Light</a>
          <span>·</span>
          <a href="#">System</a>
          <span>·</span>
          <a href="#">Dark</a>
          <span>·</span>
          <a href="#">简体中文</a>
        </div>

        <p class="bottom-right">浙ICP备20236136号</p>
      </section>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  padding: .5rem 0 max(0.35rem, env(safe-area-inset-bottom));
  background: #030714;
  overflow: hidden;
}

.footer-shell {
  width: var(--site-max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-top {
  display: grid;
  grid-template-columns: 1.9fr 0.8fr 0.8fr 0.8fr;
  gap: 2.1rem;
  padding: 0.85rem 0 1rem;
}

.footer-brand {
  min-width: 0;
}

.brand-title {
  margin: 0;
  font-size: 1.42rem;
  color: rgba(236, 246, 255, 0.96);
}

.brand-motto {
  margin: 0.46rem 0 0;
  color: rgba(199, 216, 235, 0.9);
  font-size: 0.86rem;
  font-style: italic;
}

.brand-copy,
.brand-powered,
.brand-status {
  margin: 0.56rem 0 0;
  color: rgba(155, 179, 203, 0.82);
  font-size: 0.82rem;
}

.brand-status {
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
}

.status-dot {
  width: 0.34rem;
  height: 0.34rem;
  border-radius: 50%;
  background: #39e58f;
  box-shadow: 0 0 8px rgba(57, 229, 143, 0.56);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.footer-col h4 {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(200, 219, 239, 0.66);
  font-weight: 600;
}

.footer-col a {
  width: fit-content;
  color: rgba(219, 233, 247, 0.92);
  text-decoration: none;
  font-size: 0.82rem;
}

.footer-col a:hover {
  color: #ffffff;
}

.footer-bottom {
  margin-top: 0.15rem;
  border-top: 1px solid rgba(118, 170, 194, 0.16);
  padding: 0.72rem 0 0.08rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.95rem;
}

.bottom-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  color: rgba(147, 172, 196, 0.72);
  font-size: 0.75rem;
}

.bottom-left a {
  color: rgba(172, 196, 221, 0.82);
  text-decoration: none;
}

.bottom-left a:hover {
  color: rgba(230, 242, 255, 0.95);
}

.bottom-right {
  margin: 0;
  color: rgba(147, 172, 196, 0.72);
  font-size: 0.75rem;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    gap: 1.3rem;
  }
}

@media (max-width: 760px) {
  .site-footer {
    padding-top: 0.5rem;
  }

  .footer-shell {
    width: min(96%, 1560px);
    padding: 0;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding-bottom: 0.85rem;
  }

  .footer-bottom {
    padding-top: 0.66rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
