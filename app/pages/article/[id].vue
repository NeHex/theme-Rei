<script setup lang="ts">
import { getArticleById } from "~/data/articles";

const route = useRoute();

const article = computed(() => getArticleById(String(route.params.id ?? "")));

if (!article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Article Not Found",
  });
}

useHead(() => ({
  title: `${article.value?.title ?? "文章"} - NeHex`,
}));

const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  const el = canvasRef.value;
  if (!el) return;

  const ctx = el.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#061423";
  ctx.fillRect(0, 0, el.width, el.height);

  ctx.strokeStyle = "#2ad4e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 80);
  ctx.quadraticCurveTo(110, 10, 200, 80);
  ctx.stroke();

  ctx.fillStyle = "#9ad6f0";
  ctx.font = "14px sans-serif";
  ctx.fillText("Canvas preview", 58, 112);
});

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
</script>

<template>
  <div class="article-page">
    <main v-if="article" class="article-main">
      <div class="article-nav">
        <NuxtLink to="/article" class="article-back" aria-label="返回文章列表">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
        </NuxtLink>
      </div>

      <header class="article-info">
        <p class="article-kicker">BLOG ARTICLE</p>
        <h1>{{ article.title }}</h1>

        <div class="article-meta-row">
          <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
          <span class="meta-dot" aria-hidden="true"></span>
          <span>阅读 {{ formatCount(article.views) }}</span>
          <span class="meta-dot" aria-hidden="true"></span>
          <span>分类 <mark>{{ article.category }}</mark></span>
          <span class="meta-dot" aria-hidden="true"></span>
          <small v-if="article.edited">已编辑</small>
        </div>

        <p class="article-tags">
          <span v-for="tag in article.tags" :key="tag">#{{ tag }}</span>
        </p>

        <address>
          作者：<a href="#" rel="author">NeHex</a> · 更新时间：{{ formatDate(article.updatedAt) }}
        </address>
      </header>

      <article class="article-card">
        <section aria-labelledby="s-intro">
          <h2 id="s-intro">1. 摘要</h2>
          <p>{{ article.summary }}</p>
          <p>{{ article.excerpt }}</p>
          <hr />
        </section>

        <section aria-labelledby="s-quote">
          <h2 id="s-quote">2. 引用与注释</h2>
          <blockquote cite="https://example.com/notes">
            长期主义并不等于缓慢，而是持续做正确的小动作。<br />
            它的核心是“可重复”，不是“一蹴而就”。
          </blockquote>
          <p>—— 引自 <cite>《项目笔记》</cite></p>
        </section>

        <section aria-labelledby="s-list">
          <h2 id="s-list">3. 列表标签</h2>
          <h3>无序列表</h3>
          <ul>
            <li>记录问题出现的环境</li>
            <li>记录你尝试过的手段</li>
            <li>记录最终有效的方案</li>
          </ul>

          <h3>有序列表</h3>
          <ol>
            <li>观察现象</li>
            <li>构造最小复现</li>
            <li>定位根因并修复</li>
          </ol>

          <h3>定义列表</h3>
          <dl>
            <dt>主题变量</dt>
            <dd>控制颜色、字号、间距的一组基础 token。</dd>
            <dt>组件样式</dt>
            <dd>在基础 token 之上组合而成的局部视觉表达。</dd>
          </dl>
        </section>

        <section aria-labelledby="s-media">
          <h2 id="s-media">4. 图片与多媒体标签</h2>
          <figure>
            <picture>
              <source srcset="/images/background.png" media="(min-width: 900px)" />
              <img src="/images/background.png" alt="测试封面图" usemap="#img-map" />
            </picture>
            <figcaption>使用 picture/source/img 组合输出响应式图片。</figcaption>
          </figure>

          <map name="img-map">
            <area shape="rect" coords="20,20,180,120" href="#" alt="点击区域 1" />
            <area shape="rect" coords="220,20,380,120" href="#" alt="点击区域 2" />
          </map>

          <div class="media-grid">
            <audio controls preload="none">
              <source src="/media/demo.mp3" type="audio/mpeg" />
              你的浏览器不支持 audio 标签。
            </audio>

            <video controls preload="none" width="360">
              <source src="/media/demo.mp4" type="video/mp4" />
              <track kind="captions" srclang="zh" label="简体中文" />
              你的浏览器不支持 video 标签。
            </video>
          </div>
        </section>

        <section aria-labelledby="s-code">
          <h2 id="s-code">5. 文本与代码标签</h2>
          <p>
            这段用于覆盖标签样式：
            <strong>strong</strong>、<em>em</em>、<b>b</b>、<i>i</i>、<u>u</u>、<s>s</s>、
            <del>del</del>、<ins>ins</ins>、<sub>sub</sub>、<sup>sup</sup>、
            <abbr title="HyperText Markup Language">HTML</abbr>、<dfn>定义词</dfn>、<q>行内引用</q>。
          </p>
          <p>
            还有 <code>inline code</code>、<kbd>Ctrl</kbd> + <kbd>S</kbd>、
            <samp>命令输出示例</samp>、<var>变量名</var>、软换行<wbr />位置。
          </p>
          <pre><code class="language-ts">function resolveTheme(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-")
}</code></pre>
          <p>
            日文注音示例：
            <ruby>綺麗<rp>(</rp><rt>きれい</rt><rp>)</rp></ruby>
          </p>
        </section>

        <section aria-labelledby="s-table">
          <h2 id="s-table">6. 表格标签</h2>
          <table>
            <caption>本周写作安排</caption>
            <colgroup>
              <col style="width: 22%" />
              <col style="width: 48%" />
              <col style="width: 30%" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">主题</th>
                <th scope="col">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Mon</th>
                <td>文章结构整理</td>
                <td><progress max="100" value="100">100%</progress></td>
              </tr>
              <tr>
                <th scope="row">Tue</th>
                <td>样式回归检查</td>
                <td><progress max="100" value="72">72%</progress></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">完成率</th>
                <td colspan="2"><meter min="0" max="1" value="0.86">86%</meter></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section aria-labelledby="s-form">
          <h2 id="s-form">7. 表单标签</h2>
          <form action="#" method="post">
            <fieldset>
              <legend>反馈表单</legend>
              <label for="f-title">标题</label>
              <input id="f-title" name="title" type="text" list="title-suggest" placeholder="输入标题" />
              <datalist id="title-suggest">
                <option value="布局建议" />
                <option value="样式问题" />
                <option value="交互反馈" />
              </datalist>

              <label for="f-type">类型</label>
              <select id="f-type" name="type">
                <optgroup label="内容">
                  <option>文章</option>
                  <option>日常</option>
                </optgroup>
                <optgroup label="视觉">
                  <option>配色</option>
                  <option>组件</option>
                </optgroup>
              </select>

              <label for="f-desc">描述</label>
              <textarea id="f-desc" name="desc" rows="4">这里输入你的建议...</textarea>

              <label>
                <input type="checkbox" name="subscribe" checked />
                订阅后续更新
              </label>

              <div class="form-actions">
                <button type="submit">提交</button>
                <button type="reset">重置</button>
                <output for="f-title f-type">输出示例区域</output>
              </div>
            </fieldset>
          </form>
        </section>

        <section aria-labelledby="s-embed">
          <h2 id="s-embed">8. 其他嵌入与交互标签</h2>
          <details open>
            <summary>展开查看内嵌组件</summary>
            <p>这里用于测试 details / summary 的默认样式。</p>
          </details>

          <div class="embed-grid">
            <iframe title="示例 iframe" src="https://example.com" loading="lazy" />
            <canvas ref="canvasRef" width="220" height="130" aria-label="canvas test" />
            <svg viewBox="0 0 120 70" role="img" aria-label="svg test">
              <title>SVG 测试图</title>
              <rect x="2" y="2" width="116" height="66" rx="8" fill="#0b1b2f" />
              <circle cx="35" cy="35" r="18" fill="#2ad4e1" opacity="0.7" />
              <path d="M60 48L82 18L103 48Z" fill="#9ad6f0" />
            </svg>
            <object data="/images/book-icon.svg" type="image/svg+xml">Object fallback</object>
          </div>

          <math display="block">
            <mrow>
              <mi>E</mi>
              <mo>=</mo>
              <mi>m</mi>
              <mo>×</mo>
              <msup><mi>c</mi><mn>2</mn></msup>
            </mrow>
          </math>

          <dialog open>
            <p>这是一个 dialog 标签测试框。</p>
          </dialog>
        </section>

        <aside>
          <h2>9. aside / bdi / bdo</h2>
          <p>
            用户名示例：<bdi>alex_2026</bdi>，方向控制：
            <bdo dir="rtl">This text is rtl</bdo>。
          </p>
        </aside>

        <footer class="article-footer">
          <p>
            标签检查完成。<ins>新增测试段落</ins>，<del>旧说明文本</del> 已归档。
          </p>
        </footer>
      </article>
    </main>
  </div>
</template>

<style scoped>
.article-page {
  min-height: 100vh;
  padding: 6.4rem 1rem 2.2rem;
  color: var(--theme-text);
  background: transparent;
}

.article-main {
  width: var(--site-content-width);
  margin: 0 auto;
}

.article-nav {
  margin-bottom: 1rem;
}

.article-back {
  width: 2.4rem;
  height: 2.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: rgba(231, 243, 255, 0.92);
  border: 1px solid rgba(151, 201, 231, 0.26);
  background: rgba(8, 18, 32, 0.62);
  backdrop-filter: blur(10px);
  text-decoration: none;
  transition: all 0.2s ease;
}

.article-back:hover {
  color: #ffffff;
  border-color: rgba(182, 226, 251, 0.5);
  background: rgba(10, 24, 42, 0.84);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
}

.article-back svg {
  width: 1.15rem;
  height: 1.15rem;
}

.article-back path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-info {
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

.article-kicker {
  margin: 0;
  color: #2ad4e1;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.article-info h1 {
  margin: 0.3rem 0 0.65rem;
  font-size: var(--fs-h1);
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.55rem;
  align-items: center;
  color: rgba(186, 206, 222, 0.78);
}

.article-meta-row mark {
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  color: #d5f6ff;
  background: rgba(42, 212, 225, 0.2);
}

.meta-dot {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: rgba(153, 191, 217, 0.52);
}

.article-tags {
  margin: 0.72rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.article-tags span {
  border-radius: 999px;
  border: 1px solid rgba(118, 170, 194, 0.28);
  padding: 0.18rem 0.5rem;
  color: rgba(199, 223, 243, 0.88);
  font-size: 0.86rem;
}

address {
  margin-top: 0.65rem;
  font-style: normal;
  color: rgba(171, 196, 216, 0.78);
}

address a {
  color: #b7ddff;
  text-decoration: none;
}

.article-card {
  padding: 1.4rem;
  border-radius: 1rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  backdrop-filter: blur(8px);
}

section {
  margin-top: 1.5rem;
}

h2 {
  margin: 0 0 0.7rem;
  color: #bce8ff;
  font-size: var(--fs-h2);
}

p,
li,
dd,
td,
th,
label {
  line-height: 1.72;
}

img {
  max-width: 100%;
  border-radius: 0.7rem;
}

blockquote {
  margin: 0;
  padding: 0.9rem 1rem;
  border-left: 3px solid #2ad4e1;
  background: rgba(255, 255, 255, 0.04);
}

pre {
  overflow-x: auto;
  padding: 0.9rem;
  border-radius: 0.7rem;
  background: rgba(0, 0, 0, 0.35);
}

table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 0.7rem;
}

th,
td {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--theme-border);
}

fieldset {
  border: 1px solid var(--theme-border);
  border-radius: 0.7rem;
  padding: 0.9rem;
}

input,
select,
textarea,
button {
  width: 100%;
  margin-top: 0.3rem;
  margin-bottom: 0.6rem;
  padding: 0.55rem 0.6rem;
  border-radius: 0.45rem;
  border: 1px solid var(--theme-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--theme-text);
}

.form-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  align-items: end;
}

.media-grid,
.embed-grid {
  display: grid;
  gap: 0.75rem;
}

.embed-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

iframe {
  width: 100%;
  min-height: 130px;
  border-radius: 0.6rem;
  border: 1px solid rgba(118, 170, 194, 0.24);
  background: rgba(255, 255, 255, 0.05);
}

.article-footer {
  margin-top: 1.7rem;
  padding-top: 1rem;
  border-top: 1px solid var(--theme-border);
  color: var(--theme-text-mute);
}

@media (max-width: 760px) {
  .article-page {
    padding: 5.8rem 0.55rem 2rem;
  }

  .article-main {
    width: min(96%, 980px);
  }

  .article-info,
  .article-card {
    padding: 1rem;
  }

  .form-actions,
  .embed-grid {
    grid-template-columns: 1fr;
  }
}
</style>
