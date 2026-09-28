const fs = require('fs');

let popupJs = fs.readFileSync('popup.js', 'utf8');

popupJs = popupJs.replace(
  `    // When searching, hide everything by default, then show matches and expand parents
    let anyMatchFound = false;
    for (let wIndex = 0; wIndex < windows.length; wIndex++) {`,
  `    // When searching, hide everything by default, then show matches and expand parents
    let anyMatchFound = false;

    // ⚡ Bolt Performance Optimization:
    // Replaced Array.from(querySelectorAll).forEach with direct NodeList for-loops.
    // This prevents expensive intermediate array allocations and reduces GC pressure
    // during frequent search filtering operations.
    for (let wIndex = 0; wIndex < windows.length; wIndex++) {`
);

fs.writeFileSync('popup.js', popupJs);
console.log('done');
