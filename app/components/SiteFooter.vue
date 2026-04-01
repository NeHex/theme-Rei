<script setup lang="ts">
const currentYear = new Date().getFullYear();
const footerBadgeUrl = "https://github.com/nehex";
</script>

<template>
  <div class="footer-shell section-shell">
    <footer id="site-footer" class="site-footer">
      <div class="footer-top">
        <div class="footer-col footer-brand">
          <h3 class="footer-brand-title">NeHex</h3>
          <p class="footer-brand-text">
            一个为长期记录而生的空间，把技术、生活与创意的片段好好收藏。
          </p>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">快捷导航</h4>
          <div class="footer-links">
            <NuxtLink to="/">首页</NuxtLink>
            <NuxtLink to="/article">文章</NuxtLink>
            <NuxtLink to="/album">照片</NuxtLink>
            <NuxtLink to="/#journal">日常</NuxtLink>
          </div>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">联系我</h4>
          <div class="footer-social">
            <a href="#" aria-label="GitHub">GH</a>
            <a href="#" aria-label="X">X</a>
            <a href="#" aria-label="Mail">Mail</a>
            <a href="#" aria-label="Feed">RSS</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          © {{ currentYear }} NeHex. All rights reserved.
        </p>
        <a class="footer-badge" :href="footerBadgeUrl" target="_blank" rel="noopener noreferrer">
          NeHex 1.0
        </a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.footer-shell {
  width: min(92%, 1560px);
  margin: 0 auto;
  padding: 0.2rem 1rem 3.3rem;
}

.site-footer {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(118, 170, 194, 0.16);
  background: rgba(7, 14, 25, 0.86);
  backdrop-filter: blur(14px) saturate(120%);
  box-shadow: 0 16px 46px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.site-footer::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(42, 212, 225, 0.08) 0%,
    rgba(42, 212, 225, 0.62) 50%,
    rgba(42, 212, 225, 0.08) 100%
  );
}

.footer-top {
  display: grid;
  grid-template-columns: 1.45fr 0.85fr 0.85fr;
  gap: 1.3rem;
  padding: 1.5rem 1.4rem 1.2rem;
}

.footer-col {
  min-width: 0;
}

.footer-brand-title {
  margin: 0;
  font-size: 1.38rem;
  color: rgba(236, 246, 255, 0.96);
}

.footer-brand-text {
  margin: 0.72rem 0 0;
  color: rgba(187, 207, 225, 0.68);
  font-size: 0.9rem;
  line-height: 1.7;
}

.footer-col-title {
  margin: 0;
  font-size: 0.98rem;
  color: rgba(201, 226, 244, 0.88);
}

.footer-links {
  margin-top: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.footer-links a {
  width: fit-content;
  color: rgba(178, 201, 220, 0.82);
  text-decoration: none;
  font-size: 0.9rem;
}

.footer-links a:hover {
  color: rgba(227, 242, 255, 0.96);
}

.footer-social {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.footer-social a {
  min-width: 2.4rem;
  height: 2rem;
  padding: 0 0.6rem;
  border-radius: 0.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: rgba(213, 232, 248, 0.92);
  font-size: 0.84rem;
  border: 1px solid rgba(118, 170, 194, 0.24);
  background: rgba(255, 255, 255, 0.04);
}

.footer-social a:hover {
  background: rgba(44, 198, 216, 0.16);
  border-color: rgba(44, 198, 216, 0.42);
}

.footer-bottom {
  border-top: 1px solid rgba(118, 170, 194, 0.15);
  padding: 0.92rem 1.4rem 1.05rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.copyright {
  margin: 0;
  color: rgba(163, 186, 206, 0.72);
  font-size: 0.84rem;
}

.footer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.34rem 0.65rem;
  border-radius: 999px;
  font-size: 0.76rem;
  text-decoration: none;
  color: rgba(215, 238, 253, 0.9);
  border: 1px solid rgba(118, 170, 194, 0.24);
  background: rgba(42, 212, 225, 0.08);
}

.footer-badge:hover {
  background: rgba(42, 212, 225, 0.18);
  border-color: rgba(78, 217, 231, 0.45);
}

@media (max-width: 980px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
  }

  .footer-brand {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .footer-shell {
    padding: 0.1rem 0.55rem 2.8rem;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1.1rem 1rem 0.95rem;
  }

  .footer-brand {
    grid-column: auto;
  }

  .footer-bottom {
    padding: 0.82rem 1rem 0.9rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
