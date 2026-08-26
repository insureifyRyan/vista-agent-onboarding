(() => {
  // Handoff copy: loads the token stylesheets sitting beside these prototypes.
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = './styles.css';
  document.head.appendChild(l);
})();
