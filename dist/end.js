if (typeof window === 'object') {
  window.Repeat = Repeat;
} else if (module && module.exports) {
  module.exports = Repeat;
}
})();
