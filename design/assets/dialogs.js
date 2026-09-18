(() => {
  'use strict';
  // Native dialogs make the page inert. Explicit Tab wrapping also keeps focus
  // in the dialog when Chrome would otherwise move it to the browser toolbar.
  document.querySelectorAll('.game-dialog, .star-dialog').forEach(dialog => {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.closest('[hidden]'));
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  });
})();
