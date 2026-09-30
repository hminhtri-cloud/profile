document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('article-container');
  if (!container) return;
  const slug = container.dataset.postSlug || new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    container.innerHTML = '<div class="blog-state">Article slug not found.</div>';
    return;
  }
  fetch(`http://localhost:1337/api/posts?filters[slug][$eq]=${encodeURIComponent(slug)}`)
    .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
    .then((result) => {
      const post = result.data?.[0];
      const data = post?.attributes || post;
      if (!data) throw new Error();
    const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US') : 'Recently published';
      const content = DOMPurify.sanitize(marked.parse(String(data.content || '')));
      container.innerHTML = `<header class="article-header">
        <span class="sub-heading">TECHNICAL FIELD NOTE</span>
        <h1>${data.title || 'Untitled post'}</h1>
        <p class="article-meta"><i class="fa-regular fa-calendar"></i> ${date} &nbsp; / &nbsp; ${data.meta_description || ''}</p>
      </header><div class="article-content">${content}</div>`;
      document.title = `${data.title || 'Blog'} | SECProfile`;
    })
    .catch(() => { container.innerHTML = '<div class="blog-state"><i class="fa-solid fa-triangle-exclamation"></i> Article not found or Strapi is not running.</div>'; });
});
