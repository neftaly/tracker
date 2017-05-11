import R from 'ramda';

let v8GcBugFix; // Fix unreported GC bug in V8
const filePrompt = attributes => new Promise(resolve => {
  const input = Object.assign(document.createElement('input'), {
    ...attributes,
    value: '',
    type: 'file',
    onchange: R.compose(
      resolve,
      Array.from,
      R.path(['target', 'files'])
    )
  });
  input.click();
  v8GcBugFix = input;
});

const fileReader = file => new Promise(
  (resolve, reject) => Object.assign(new FileReader(), {
    onload: R.compose(
      resolve,
      R.path(['target', 'result'])
    ),
    onerror: reject
  }).readAsArrayBuffer(file)
);

export {
  filePrompt,
  fileReader
};
