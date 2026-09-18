document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const alertBox = document.getElementById('auth-alert');
  const usernameField = document.getElementById('username-field');
  const username = document.getElementById('username');
  const submitLabel = document.getElementById('submit-label');
  let mode = 'login';

  document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    document.querySelectorAll('.auth-tab').forEach((item) => item.classList.toggle('active', item === tab));
    usernameField.classList.toggle('hidden', mode === 'login');
    username.required = mode === 'register';
    submitLabel.textContent = mode === 'login' ? 'Log In' : 'Create Account';
    alertBox.className = 'auth-alert hidden';
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(`http://localhost:8000/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Something went wrong');
      localStorage.setItem('access_token', result.access_token);
      alertBox.textContent = `${result.message}. The token has been stored for this session.`;
      alertBox.className = 'auth-alert success';
      if (mode === 'login') window.setTimeout(() => { window.location.href = 'https://blog.hminhtri.cloud/#blogs'; }, 900);
    } catch (error) {
      alertBox.textContent = error.message;
      alertBox.className = 'auth-alert error';
    }
  });
});
