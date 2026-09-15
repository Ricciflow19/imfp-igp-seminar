window.MathJax = {
  loader: { load: ['ui/safe'] },
  tex: {
    inlineMath: { '[+]': [['$', '$']] },
    processEscapes: true
  },
  options: {
    safeOptions: {
      safeProtocols: {
        http: true,
        https: true,
        file: false,
        javascript: false,
        data: false
      }
    }
  }
};
